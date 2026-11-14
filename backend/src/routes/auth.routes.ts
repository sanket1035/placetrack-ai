import { Router } from "express";

// Helper to normalize string or string[] parameters from Express request objects
function getFirstString(param: unknown): string | undefined {
  if (typeof param === "string") return param;
  if (Array.isArray(param)) return param[0];
  return undefined;
}
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, signToken, authorize } from "../middleware/auth.js";
import { loginLimiter } from "../middleware/rateLimiter.js";
import { config } from "../lib/config.js";
import { verifyGoogleCredential } from "../lib/google.js";
import { attachScope, studentWhere } from "../lib/scope.js";
import { UserRole } from "@prisma/client";
import { audit } from "../lib/audit.js";
import { buildTpcInviteEmail, inviteMail } from "../services/inviteEmail.js";
import { readinessForStudent } from "../services/studentReadiness.js";
import { predictReadiness } from "../services/readiness.js";
import { buildStudentTemplate, normHeader, readXlsxRows } from "../services/studentImport.js";

export const authRouter = Router();

/**
 * Google sign-in is the only way to authenticate.
 *  - existing user (invited TPC, pre-registered student, admin): linked by verified email
 *  - ADMIN_EMAILS: becomes ADMIN on first sign-in
 *  - any other verified Google email self-registers as STUDENT (profile completed in onboarding);
 *    set ALLOWED_STUDENT_EMAIL_DOMAINS to optionally restrict this to specific domains
 *  - TPCs can only be invited by an admin.
 */
authRouter.post("/google", loginLimiter, async (request, response) => {
  const { credential } = z.object({ credential: z.string().min(20) }).parse(request.body);
  let profile;
  try {
    profile = await verifyGoogleCredential(credential);
  } catch (error: any) {
    return response.status(401).json({ error: error?.message ?? "Google verification failed" });
  }

  const domain = (profile.email.split("@")[1] ?? "").toLowerCase();
  let user = await prisma.user.findUnique({
    where: { email: profile.email },
    include: { student: true, coordinator: true }
  });

  if (user?.googleId && user.googleId !== profile.sub) {
    return response.status(403).json({ error: "This email is linked to a different Google account" });
  }

  // With ALLOWED_STUDENT_EMAIL_DOMAINS set, student accounts must use an allowed domain (admins and invited TPCs are exempt).
  if (user?.role === "STUDENT" && config.studentDomains.length > 0 && !config.studentDomains.includes(domain)) {
    return response.status(403).json({ error: "Only college email addresses can sign in. Use your @" + config.studentDomains[0] + " account." });
  }

  if (!user) {
    if (config.adminEmails.includes(profile.email)) {
      user = await prisma.user.create({
        data: { email: profile.email, name: profile.name, avatarUrl: profile.picture, googleId: profile.sub, role: "ADMIN" },
        include: { student: true, coordinator: true }
      });
    } else if (config.studentDomains.length === 0 || config.studentDomains.includes(domain)) {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.picture,
          googleId: profile.sub,
          role: "STUDENT",
          student: {
            create: { name: profile.name, branch: "Undeclared", cgpa: 0, graduationYear: new Date().getFullYear() + 1, skills: [], onboarded: false }
          }
        },
        include: { student: true, coordinator: true }
      });
    } else {
      return response.status(403).json({
        error: "This email domain is not allowed to sign up. Use an allowed email, or ask your Training & Placement Coordinator."
      });
    }
    audit(user.id, "SIGNUP", "auth").catch(() => {});
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: profile.sub, name: user.name ?? profile.name, avatarUrl: profile.picture ?? user.avatarUrl, lastLoginAt: new Date() },
      include: { student: true, coordinator: true }
    });
    // Audit logging must not delay the sign-in response.
    audit(user.id, "LOGIN", "auth").catch(() => {});
  }

  response.json({ token: signToken(user.id, user.role), user });
});

authRouter.get("/me", authenticate, async (request, response) => {
  const user = await prisma.user.findUnique({
    where: { id: request.auth!.userId },
    select: {
      id: true, email: true, name: true, avatarUrl: true, role: true, createdAt: true,
      student: true, coordinator: true,
      notifications: { where: { isRead: false }, orderBy: { createdAt: "desc" }, take: 10 }
    }
  });
  if (!user) return response.status(404).json({ error: "User not found" });
  response.json(user);
});

/** Names of projects / internships the student lists. The count is the number of names. */
const nameList = z.array(z.string().trim().min(2, "Each name needs at least 2 characters").max(80)).max(10);
const linkedinUrlSchema = z.string().trim().url("Enter a valid LinkedIn link").refine(
  (value) => /^https:\/\/([a-z0-9-]+\.)?linkedin\.com\/\S+/i.test(value),
  "Enter your LinkedIn profile link, like https://www.linkedin.com/in/your-name"
);

function listFields(input: { projects?: string[]; internships?: string[]; linkedinUrl?: string | null }) {
  return {
    ...(input.projects !== undefined ? { projectNames: input.projects, projectsCount: input.projects.length } : {}),
    ...(input.internships !== undefined ? { internshipNames: input.internships, internshipsCount: input.internships.length } : {}),
    ...(input.linkedinUrl !== undefined ? { linkedinUrl: input.linkedinUrl === "" ? null : input.linkedinUrl } : {})
  };
}

authRouter.patch("/me/student", authenticate, async (request, response) => {
  const input = z.object({
    name: z.string().min(2).optional(),
    branch: z.string().min(2).optional(),
    cgpa: z.number().min(0).max(10).optional(),
    graduationYear: z.number().int().min(2024).max(2035).optional(),
    skills: z.array(z.string().min(1)).optional(),
    backlogs: z.number().int().min(0).max(10).optional(),
    linkedinUrl: linkedinUrlSchema.nullable().or(z.literal("")).optional(),
    projects: nameList.optional(),
    internships: nameList.optional(),
    emailEnabled: z.boolean().optional()
  }).parse(request.body);

  const student = await prisma.student.findUnique({ where: { userId: request.auth!.userId } });
  if (!student) return response.status(404).json({ error: "Student profile not found" });

  const academicFields = ["name", "branch", "cgpa", "graduationYear", "backlogs"] as const;
  if (student.onboarded) {
    // After onboarding, academic details drive eligibility, so only a TPC or admin may change them.
    const changed = academicFields.filter((field) => input[field] !== undefined && input[field] !== student[field]);
    if (changed.length) {
      return response.status(403).json({ error: `${changed.join(", ")} can only be changed by your Training & Placement Coordinator.` });
    }
  } else {
    // First-time setup must state the core academic details.
    if (!input.branch || input.branch === "Undeclared") return response.status(400).json({ error: "Select your department to finish your profile." });
    if (input.cgpa === undefined || input.cgpa <= 0) return response.status(400).json({ error: "Enter your current CGPA (between 0 and 10)." });
    if (input.graduationYear === undefined) return response.status(400).json({ error: "Enter your graduation year." });
  }

  const { projects, internships, linkedinUrl, ...plain } = input;
  const lists = listFields({ projects, internships, linkedinUrl });
  const readinessScore = (await readinessForStudent({
    id: student.id,
    cgpa: input.cgpa ?? student.cgpa,
    backlogs: input.backlogs ?? student.backlogs,
    skills: input.skills ?? student.skills,
    projectsCount: lists.projectsCount ?? student.projectsCount,
    internshipsCount: lists.internshipsCount ?? student.internshipsCount,
    mockTestCount: student.mockTestCount
  })).score;

  const updated = await prisma.student.update({
    where: { id: student.id },
    data: { ...plain, ...lists, readinessScore, onboarded: true },
    include: { user: { select: { id: true, email: true, role: true } } }
  });
  await audit(request.auth!.userId, "UPDATE", "student-profile", { studentId: student.id });
  response.json(updated);
});

/** Training & Placement Coordinators (and admins) list the students they are responsible for. */
authRouter.get("/students", authenticate, authorize(UserRole.TPC, UserRole.ADMIN), attachScope, async (request, response) => {
  const students = await prisma.student.findMany({
    where: studentWhere(request.scope!.department),
    include: { user: { select: { id: true, email: true, lastLoginAt: true } } },
    orderBy: { name: "asc" }
  });
  response.json(students);
});

/** A TPC corrects a student's academic details. A TPC can only touch students of their own department and cannot move them elsewhere. */
authRouter.patch("/students/:id", authenticate, authorize(UserRole.TPC, UserRole.ADMIN), attachScope, async (request, response) => {
  const id = getFirstString(request.params.id);
  if (!id) return response.status(400).json({ error: "Invalid student id" });
  const input = z.object({
    name: z.string().min(2).optional(),
    branch: z.string().min(2).optional(),
    cgpa: z.number().min(0).max(10).optional(),
    graduationYear: z.number().int().min(2024).max(2035).optional(),
    backlogs: z.number().int().min(0).max(10).optional()
  }).parse(request.body);

  const student = await prisma.student.findFirst({ where: { id, ...studentWhere(request.scope!.department) } });
  if (!student) return response.status(404).json({ error: "Student not found in your department" });
  const department = request.scope!.department;
  if (department && input.branch && input.branch !== department) {
    return response.status(403).json({ error: `You can only manage students of ${department}. Ask an admin to move a student to another department.` });
  }

  const next = { ...student, ...Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) } as typeof student;
  const readinessScore = (await readinessForStudent({ ...student, cgpa: next.cgpa, backlogs: next.backlogs })).score;
  const onboarded = student.onboarded || (next.branch !== "Undeclared" && next.cgpa > 0);
  const updated = await prisma.student.update({
    where: { id },
    data: { ...input, readinessScore, onboarded },
    include: { user: { select: { id: true, email: true, lastLoginAt: true } } }
  });
  await audit(request.auth!.userId, "UPDATE_STUDENT", "auth", { studentId: id });
  response.json(updated);
});

/** Excel template a coordinator fills in for the bulk import. */
authRouter.get("/students/template", authenticate, authorize(UserRole.TPC, UserRole.ADMIN), attachScope, async (request, response) => {
  const buffer = await buildStudentTemplate(request.scope!.department);
  response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  response.setHeader("Content-Disposition", 'attachment; filename="students-import-template.xlsx"');
  response.send(buffer);
});

/** A TPC adds one student to their own department (an admin can add to any). The student activates the account by signing in with Google using this email. */
authRouter.post("/students", authenticate, authorize(UserRole.TPC, UserRole.ADMIN), attachScope, async (request, response) => {
  const input = z.object({
    name: z.string().trim().min(2),
    email: z.string().trim().email(),
    branch: z.string().trim().min(2).optional(),
    cgpa: z.number().min(0).max(10),
    graduationYear: z.number().int().min(2024).max(2035),
    backlogs: z.number().int().min(0).max(10).default(0),
    skills: z.array(z.string().trim().min(1)).default([])
  }).parse(request.body);

  const department = request.scope!.department;
  const branch = department ?? input.branch;
  if (!branch) return response.status(400).json({ error: "Choose a department for the student." });
  if (department && input.branch && input.branch !== department) {
    return response.status(403).json({ error: `You can only add students to ${department}.` });
  }
  const email = input.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) {
    return response.status(409).json({ error: "This email is already registered." });
  }

  const readinessScore = predictReadiness({ cgpa: input.cgpa, aptitudeAccuracy: 0, testsTaken: 0, skills: input.skills.length, projects: 0, internships: 0, backlogs: input.backlogs }).score;
  const user = await prisma.user.create({
    data: {
      email,
      name: input.name,
      role: "STUDENT",
      student: { create: { onboarded: true, name: input.name, branch, cgpa: input.cgpa, graduationYear: input.graduationYear, skills: input.skills, backlogs: input.backlogs, readinessScore, mockTestCount: 0 } }
    },
    include: { student: { include: { user: { select: { id: true, email: true, lastLoginAt: true } } } } }
  });
  await audit(request.auth!.userId, "ADD_STUDENT", "auth", { studentId: user.student!.id });
  response.status(201).json(user.student);
});

/** A TPC removes a student from their own department (an admin from any). Applications and test results go with the student. */
authRouter.delete("/students/:id", authenticate, authorize(UserRole.TPC, UserRole.ADMIN), attachScope, async (request, response) => {
  const id = getFirstString(request.params.id);
  if (!id) return response.status(400).json({ error: "Invalid student id" });
  const student = await prisma.student.findFirst({ where: { id, ...studentWhere(request.scope!.department) } });
  if (!student) return response.status(404).json({ error: "Student not found in your department" });
  await prisma.user.delete({ where: { id: student.userId } });
  await audit(request.auth!.userId, "DELETE_STUDENT", "auth", { studentId: id });
  response.json({ success: true });
});

// Admin User Management routes

authRouter.get("/users", authenticate, authorize(UserRole.ADMIN), async (request, response) => {
  const users = await prisma.user.findMany({
    include: { student: true, coordinator: true },
    orderBy: { email: "asc" }
  });
  response.json(users);
});

authRouter.delete("/users/:id", authenticate, authorize(UserRole.ADMIN), async (request, response) => {
  const id = getFirstString(request.params.id);
  if (!id) return response.status(400).json({ error: "Invalid user id" });
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return response.status(404).json({ error: "User not found" });
  
  // Clean up relations
  await prisma.student.deleteMany({ where: { userId: id } });
  await prisma.coordinator.deleteMany({ where: { userId: id } });
  
  await prisma.user.delete({ where: { id } });
  await audit(request.auth!.userId, "DELETE_USER", "auth", { deletedUserId: id });
  
  response.json({ success: true });
});

authRouter.patch("/users/:id", authenticate, authorize(UserRole.ADMIN), async (request, response) => {
  const id = getFirstString(request.params.id);
  if (!id) return response.status(400).json({ error: "Invalid user id" });
  const input = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    role: z.enum(["STUDENT", "TPC", "ADMIN"]).optional(),
    branch: z.string().min(2).optional(),
    graduationYear: z.number().int().min(2024).max(2035).optional(),
    cgpa: z.number().min(0).max(10).optional(),
    skills: z.array(z.string()).optional(),
    backlogs: z.number().int().min(0).max(10).optional()
  }).parse(request.body);

  const user = await prisma.user.findUnique({ where: { id }, include: { student: true, coordinator: true } });
  if (!user) return response.status(404).json({ error: "User not found" });

  // Update base user details
  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      email: input.email ? input.email.toLowerCase() : undefined,
      role: input.role ?? undefined
    }
  });

  // If role has changed, handle profile creation/deletion
  if (input.role && input.role !== user.role) {
    if (input.role === "STUDENT" && !user.student) {
      await prisma.coordinator.deleteMany({ where: { userId: id } });
      await prisma.student.create({
          data: {
            userId: id,
            name: input.name ?? "New Student",
            branch: input.branch ?? "Computer Engineering",
            graduationYear: input.graduationYear ?? 2027,
            cgpa: input.cgpa ?? 7.0,
            skills: input.skills ?? [],
            backlogs: input.backlogs ?? 0,
            readinessScore: 70
          }
      });
    } else if (input.role === "TPC" && !user.coordinator) {
      await prisma.student.deleteMany({ where: { userId: id } });
      await prisma.coordinator.create({
        data: {
          userId: id,
          department: input.branch ?? "Computer Engineering"
        }
      });
    } else if (input.role === "ADMIN") {
      await prisma.student.deleteMany({ where: { userId: id } });
      await prisma.coordinator.deleteMany({ where: { userId: id } });
    }
  }

  // Update student profile details if user is/remains a student
  if (updatedUser.role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId: id } });
    if (student) {
      const readinessScore = (await readinessForStudent({
        ...student,
        cgpa: input.cgpa ?? student.cgpa,
        skills: input.skills ?? student.skills,
        backlogs: input.backlogs ?? student.backlogs
      })).score;
      
      await prisma.student.update({
        where: { id: student.id },
        data: {
          name: input.name ?? undefined,
          branch: input.branch ?? undefined,
          cgpa: input.cgpa ?? undefined,
          graduationYear: input.graduationYear ?? undefined,
          skills: input.skills ?? undefined,
          backlogs: input.backlogs ?? undefined,
          readinessScore
        }
      });
    }
  }

  // Update coordinator profile details if user is/remains a coordinator
  if (updatedUser.role === "TPC") {
    const coordinator = await prisma.coordinator.findUnique({ where: { userId: id } });
    if (coordinator) {
      await prisma.coordinator.update({
        where: { id: coordinator.id },
        data: {
          department: input.branch ?? undefined
        }
      });
    }
  }

  await audit(request.auth!.userId, "UPDATE_USER", "auth", { targetUserId: id });
  
  const finalUser = await prisma.user.findUnique({
    where: { id },
    include: { student: true, coordinator: true }
  });
  if (finalUser) {
    return response.json(finalUser);
  }
  response.json({ success: true });
});

/** Admin invites a Training & Placement Coordinator for one department. They activate the account by signing in with Google using this email. */
authRouter.post("/users/tpc", authenticate, authorize(UserRole.ADMIN), async (request, response) => {
  const input = z.object({
    email: z.string().email(),
    name: z.string().min(2),
    department: z.string().min(2)
  }).parse(request.body);

  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return response.status(409).json({ error: "Email already registered" });

  const user = await prisma.user.create({
    data: { email, name: input.name, role: "TPC", coordinator: { create: { department: input.department } } },
    include: { coordinator: true }
  });

  await audit(request.auth!.userId, "INVITE_TPC", "auth", { newTpcId: user.id, department: input.department });
  response.status(201).json(user);

  // After the response: a slow or failing mail server must not block or fail the invite.
  const mail = buildTpcInviteEmail({ name: input.name, email, department: input.department });
  inviteMail.send({ to: email, subject: mail.subject, html: mail.html }).catch((error) => console.error("Could not send coordinator invite email:", error));
});

function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let col = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          col += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        col += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(col.trim());
        col = "";
      } else if (char === '\n' || char === '\r') {
        row.push(col.trim());
        col = "";
        if (row.some(c => c !== "")) {
          result.push(row);
        }
        row = [];
        if (char === '\r' && next === '\n') {
          i++; // skip \n
        }
      } else {
        col += char;
      }
    }
  }
  if (col !== "" || row.length > 0) {
    row.push(col.trim());
    if (row.some(c => c !== "")) {
      result.push(row);
    }
  }
  return result;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // Max 5 MB
});

authRouter.post("/bulk-import", authenticate, authorize(UserRole.TPC, UserRole.ADMIN), attachScope, upload.single("file"), async (request, response) => {
  const file = request.file;
  if (!file) {
    return response.status(400).json({ error: "No file uploaded. Choose an .xlsx or .csv file." });
  }

  let rows: string[][];
  try {
    rows = /\.xlsx$/i.test(file.originalname) ? await readXlsxRows(file.buffer) : parseCSV(file.buffer.toString("utf-8"));
  } catch {
    return response.status(400).json({ error: "Could not read the file. Use the template (.xlsx) or a UTF-8 .csv." });
  }
  if (rows.length < 2) {
    return response.status(400).json({ error: "The file is empty or has no student rows." });
  }

  const department = request.scope!.department;
  const headers = rows[0].map(normHeader);
  const nameIdx = headers.indexOf("name");
  const emailIdx = headers.indexOf("email");
  const branchIdx = headers.indexOf("branch");
  const cgpaIdx = headers.indexOf("cgpa");
  const gradYearIdx = headers.indexOf("graduationyear");
  const backlogsIdx = headers.indexOf("backlogs");
  const skillsIdx = headers.indexOf("skills");

  // A coordinator can leave out the branch column (their department is used). Backlogs and skills are optional.
  const missing = [
    nameIdx === -1 && "name", emailIdx === -1 && "email", cgpaIdx === -1 && "cgpa", gradYearIdx === -1 && "graduationYear",
    !department && branchIdx === -1 && "branch"
  ].filter(Boolean);
  if (missing.length) {
    return response.status(400).json({ error: `The file is missing column(s): ${missing.join(", ")}. Download the template and keep its header row.` });
  }

  let createdCount = 0;
  let failedCount = 0;
  const errors: { row: number; reason: string }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1; // Human readable 1-based row number

    if (row.length === 0 || (row.length === 1 && row[0] === "")) {
      continue;
    }

    const cell = (idx: number) => (idx >= 0 ? (row[idx] ?? "").trim() : "");
    const name = cell(nameIdx);
    const email = cell(emailIdx).toLowerCase();
    const branch = cell(branchIdx) || department || "";
    const cgpaStr = cell(cgpaIdx);
    const gradYearStr = cell(gradYearIdx);
    const backlogsStr = cell(backlogsIdx) || "0";
    const skillsRaw = cell(skillsIdx);

    if (!name || !email || !branch || !cgpaStr || !gradYearStr) {
      failedCount++;
      errors.push({ row: rowNum, reason: "Missing required fields (name, email, cgpa, graduationYear" + (department ? ")" : ", branch)") });
      continue;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      failedCount++;
      errors.push({ row: rowNum, reason: `Invalid email address: ${email}` });
      continue;
    }

    const cgpa = parseFloat(cgpaStr);
    if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
      failedCount++;
      errors.push({ row: rowNum, reason: `Invalid CGPA value: ${cgpaStr}` });
      continue;
    }

    const graduationYear = parseInt(gradYearStr, 10);
    if (isNaN(graduationYear) || graduationYear < 2024 || graduationYear > 2035) {
      failedCount++;
      errors.push({ row: rowNum, reason: `Invalid graduation year value: ${gradYearStr}` });
      continue;
    }

    const backlogs = parseInt(backlogsStr, 10);
    if (isNaN(backlogs) || backlogs < 0) {
      failedCount++;
      errors.push({ row: rowNum, reason: `Invalid backlogs value: ${backlogsStr}` });
      continue;
    }

    const skills = skillsRaw ? skillsRaw.split(",").map(s => s.trim()).filter(s => s !== "") : [];

    // A TPC may only import students of their own department.
    if (department && branch.toLowerCase() !== department.toLowerCase()) {
      failedCount++;
      errors.push({ row: rowNum, reason: `Branch "${branch}" is outside your department (${department})` });
      continue;
    }

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        failedCount++;
        errors.push({ row: rowNum, reason: `Email ${email} is already registered` });
        continue;
      }

      const readinessScore = predictReadiness({ cgpa, aptitudeAccuracy: 0, testsTaken: 0, skills: skills.length, projects: 0, internships: 0, backlogs }).score;

      await prisma.user.create({
        data: {
          email,
          name,
          role: "STUDENT",
          student: {
            create: {
              onboarded: true,
              name,
              branch,
              cgpa,
              graduationYear,
              skills,
              backlogs,
              readinessScore,
              mockTestCount: 0
            }
          }
        }
      });

      createdCount++;
    } catch (err: any) {
      failedCount++;
      errors.push({ row: rowNum, reason: err?.message || "Failed to create user record in database" });
    }
  }

  await audit(request.auth!.userId, "IMPORT", "students", { count: createdCount }).catch(() => {});

  response.json({
    created: createdCount,
    failed: failedCount,
    errors
  });
});

const profilePatchSchema = z.object({
  skills: z.array(z.string()).optional(),
  linkedinUrl: linkedinUrlSchema.nullable().or(z.literal("")).optional(),
  projects: nameList.optional(),
  internships: nameList.optional()
});

authRouter.patch("/profile", authenticate, authorize(UserRole.STUDENT), async (request, response) => {
  const input = profilePatchSchema.parse(request.body);

  const student = await prisma.student.findUnique({ where: { userId: request.auth!.userId } });
  if (!student) {
    return response.status(404).json({ error: "Student profile not found" });
  }

  const lists = listFields(input);
  const updateData: any = { ...lists };
  if (input.skills !== undefined) updateData.skills = input.skills;

  updateData.readinessScore = (await readinessForStudent({
    ...student,
    skills: input.skills ?? student.skills,
    projectsCount: lists.projectsCount ?? student.projectsCount,
    internshipsCount: lists.internshipsCount ?? student.internshipsCount
  })).score;

  const updatedStudent = await prisma.student.update({
    where: { id: student.id },
    data: updateData
  });

  await audit(request.auth!.userId, "UPDATE", "student-profile", { studentId: student.id });

  response.json(updatedStudent);
});
