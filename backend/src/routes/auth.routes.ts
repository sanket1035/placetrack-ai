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
import { attachScope } from "../lib/scope.js";
import { UserRole } from "@prisma/client";
import { audit } from "../lib/audit.js";
import { predictReadiness } from "../services/readiness.js";

export const authRouter = Router();

/**
 * Google sign-in is the only way to authenticate.
 *  - existing user (invited TPC, pre-registered student, admin): linked by verified email
 *  - ADMIN_EMAILS: becomes ADMIN on first sign-in
 *  - ALLOWED_STUDENT_EMAIL_DOMAINS: self-registers as STUDENT (profile completed in onboarding)
 *  - anyone else: rejected. TPCs can only be invited by an admin.
 */
authRouter.post("/google", loginLimiter, async (request, response) => {
  const { credential } = z.object({ credential: z.string().min(20) }).parse(request.body);
  let profile;
  try {
    profile = await verifyGoogleCredential(credential);
  } catch (error: any) {
    return response.status(401).json({ error: error?.message ?? "Google verification failed" });
  }

  const domain = profile.email.split("@")[1] ?? "";
  let user = await prisma.user.findUnique({
    where: { email: profile.email },
    include: { student: true, coordinator: true }
  });

  if (user?.googleId && user.googleId !== profile.sub) {
    return response.status(403).json({ error: "This email is linked to a different Google account" });
  }

  if (!user) {
    if (config.adminEmails.includes(profile.email)) {
      user = await prisma.user.create({
        data: { email: profile.email, name: profile.name, avatarUrl: profile.picture, googleId: profile.sub, role: "ADMIN" },
        include: { student: true, coordinator: true }
      });
    } else if (config.studentDomains.includes(domain)) {
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
        error: "This email is not registered for PlaceTrack. Use your college email, or ask your Training & Placement Coordinator."
      });
    }
    await audit(user.id, "SIGNUP", "auth");
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: profile.sub, name: user.name ?? profile.name, avatarUrl: profile.picture ?? user.avatarUrl, lastLoginAt: new Date() },
      include: { student: true, coordinator: true }
    });
    await audit(user.id, "LOGIN", "auth").catch(() => {});
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

authRouter.patch("/me/student", authenticate, async (request, response) => {
  const input = z.object({
    name: z.string().min(2).optional(),
    branch: z.string().min(2).optional(),
    cgpa: z.number().min(0).max(10).optional(),
    graduationYear: z.number().int().min(2024).max(2035).optional(),
    skills: z.array(z.string().min(1)).optional(),
    backlogs: z.number().int().min(0).max(10).optional(),
    phone: z.string().nullable().optional(),
    linkedinUrl: z.string().nullable().optional(),
    projectsCount: z.number().int().min(0).optional(),
    internshipsCount: z.number().int().min(0).optional(),
    emailEnabled: z.boolean().optional()
  }).parse(request.body);

  const student = await prisma.student.findUnique({ where: { userId: request.auth!.userId } });
  if (!student) return response.status(404).json({ error: "Student profile not found" });

  const nextCgpa = input.cgpa ?? student.cgpa;
  const nextSkills = input.skills ?? student.skills;
  const nextBacklogs = input.backlogs ?? student.backlogs;
  const readinessScore = Math.min(100, Math.max(25, Math.round(nextCgpa * 8 + nextSkills.length * 3 - nextBacklogs * 8)));

  const updated = await prisma.student.update({
    where: { id: student.id },
    data: { ...input, readinessScore, onboarded: true },
    include: { user: { select: { id: true, email: true, role: true } } }
  });
  await audit(request.auth!.userId, "UPDATE", "student-profile", { studentId: student.id });
  response.json(updated);
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
      const nextCgpa = input.cgpa ?? student.cgpa;
      const nextSkills = input.skills ?? student.skills;
      const nextBacklogs = input.backlogs ?? student.backlogs;
      const readinessScore = Math.min(100, Math.max(25, Math.round(nextCgpa * 8 + nextSkills.length * 3 - nextBacklogs * 8)));
      
      await prisma.student.update({
        where: { id: student.id },
        data: {
          name: input.name ?? undefined,
          branch: input.branch ?? undefined,
          cgpa: input.cgpa ?? undefined,
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
    return response.status(400).json({ error: "No CSV file uploaded" });
  }

  const csvText = file.buffer.toString("utf-8");
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    return response.status(400).json({ error: "CSV is empty or missing data rows" });
  }

  const headers = rows[0].map(h => h.toLowerCase().trim());
  const nameIdx = headers.indexOf("name");
  const emailIdx = headers.indexOf("email");
  const branchIdx = headers.indexOf("branch");
  const cgpaIdx = headers.indexOf("cgpa");
  const gradYearIdx = headers.indexOf("graduationyear");
  const backlogsIdx = headers.indexOf("backlogs");
  const skillsIdx = headers.indexOf("skills");

  if (nameIdx === -1 || emailIdx === -1 || branchIdx === -1 || cgpaIdx === -1 || gradYearIdx === -1 || backlogsIdx === -1 || skillsIdx === -1) {
    return response.status(400).json({ error: "CSV is missing required headers. Required: name, email, branch, cgpa, graduationYear, backlogs, skills." });
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

    const maxIdx = Math.max(nameIdx, emailIdx, branchIdx, cgpaIdx, gradYearIdx, backlogsIdx, skillsIdx);
    if (row.length <= maxIdx) {
      failedCount++;
      errors.push({ row: rowNum, reason: "Row has insufficient columns" });
      continue;
    }

    const name = row[nameIdx].trim();
    const email = row[emailIdx].trim().toLowerCase();
    const branch = row[branchIdx].trim();
    const cgpaStr = row[cgpaIdx].trim();
    const gradYearStr = row[gradYearIdx].trim();
    const backlogsStr = row[backlogsIdx].trim();
    const skillsRaw = row[skillsIdx].trim();

    if (!name || !email || !branch || !cgpaStr || !gradYearStr || !backlogsStr) {
      failedCount++;
      errors.push({ row: rowNum, reason: "Missing required fields in columns" });
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
    const department = request.scope!.department;
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

      const readinessScore = Math.min(95, Math.max(35, Math.round(cgpa * 8 + skills.length * 3 - backlogs * 8)));

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
  phone: z.string().nullable().optional(),
  linkedinUrl: z.string().url().nullable().or(z.literal("")).optional(),
  projectsCount: z.number().int().min(0).optional(),
  internshipsCount: z.number().int().min(0).optional()
});

authRouter.patch("/profile", authenticate, authorize(UserRole.STUDENT), async (request, response) => {
  const input = profilePatchSchema.parse(request.body);
  
  const student = await prisma.student.findUnique({
    where: { userId: request.auth!.userId },
    include: { testResults: true }
  });
  if (!student) {
    return response.status(404).json({ error: "Student profile not found" });
  }

  const updateData: any = {};
  if (input.skills !== undefined) updateData.skills = input.skills;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.linkedinUrl !== undefined) {
    updateData.linkedinUrl = input.linkedinUrl === "" ? null : input.linkedinUrl;
  }
  if (input.projectsCount !== undefined) updateData.projectsCount = input.projectsCount;
  if (input.internshipsCount !== undefined) updateData.internshipsCount = input.internshipsCount;

  const updatedSkills = input.skills ?? student.skills;
  const updatedProjectsCount = input.projectsCount ?? student.projectsCount;
  const updatedInternshipsCount = input.internshipsCount ?? student.internshipsCount;

  const averageAccuracy = student.testResults.length
    ? student.testResults.reduce((sum, item) => sum + item.accuracy, 0) / student.testResults.length
    : 0;

  const readiness = predictReadiness({
    cgpa: student.cgpa,
    aptitudeAccuracy: averageAccuracy,
    codingScore: 72 + Math.min(updatedSkills.length * 2, 18),
    communicationScore: 70,
    projects: updatedProjectsCount,
    internships: updatedInternshipsCount,
    mockTests: student.mockTestCount,
    backlogs: student.backlogs
  });

  updateData.readinessScore = readiness.score;

  const updatedStudent = await prisma.student.update({
    where: { id: student.id },
    data: updateData
  });

  await audit(request.auth!.userId, "UPDATE", "student-profile", { studentId: student.id });

  response.json(updatedStudent);
});
