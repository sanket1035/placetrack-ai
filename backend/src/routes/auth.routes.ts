import { Router } from "express";

// Helper to normalize string or string[] parameters from Express request objects
function getFirstString(param: unknown): string | undefined {
  if (typeof param === "string") return param;
  if (Array.isArray(param)) return param[0];
  return undefined;
}
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, signToken, authorize } from "../middleware/auth.js";
import { UserRole } from "@prisma/client";
import { audit } from "../lib/audit.js";

export const authRouter = Router();

authRouter.post("/login", async (request, response) => {
  const input = z.object({ email: z.string().email(), password: z.string().min(6) }).parse(request.body);
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    include: { student: true, coordinator: true }
  });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    return response.status(401).json({ error: "Invalid email or password" });
  }
  audit(user.id, "LOGIN", "auth").catch(() => {});
  const { passwordHash: _, ...safeUser } = user;
  response.json({ token: signToken(user.id, user.role), user: safeUser });
});

authRouter.post("/signup", async (request, response) => {
  const input = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["STUDENT", "COORDINATOR"]).default("STUDENT"),
    branch: z.string().min(2).default("Computer Engineering"),
    cgpa: z.number().min(0).max(10).default(7),
    graduationYear: z.number().int().min(2024).max(2035).default(2027),
    skills: z.array(z.string()).default(["Java", "SQL", "Communication"]),
    backlogs: z.number().int().min(0).max(10).default(0)
  }).parse(request.body);

  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) return response.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(input.password, 10);

  let userData: Parameters<typeof prisma.user.create>[0]["data"];

  if (input.role === "COORDINATOR") {
    userData = {
      email: input.email.toLowerCase(),
      passwordHash,
      role: "COORDINATOR",
      coordinator: { create: { department: input.branch } }
    };
  } else {
    const readinessScore = Math.min(95, Math.max(35, Math.round(input.cgpa * 8 + input.skills.length * 3 - input.backlogs * 8)));
    userData = {
      email: input.email.toLowerCase(),
      passwordHash,
      role: "STUDENT",
      student: {
        create: {
          name: input.name,
          branch: input.branch,
          cgpa: input.cgpa,
          graduationYear: input.graduationYear,
          skills: input.skills,
          backlogs: input.backlogs,
          readinessScore,
          mockTestCount: 0
        }
      }
    };
  }

  const user = await prisma.user.create({ data: userData, include: { student: true, coordinator: true } });
  await audit(user.id, "SIGNUP", "auth");
  const { passwordHash: _, ...safeUser } = user;
  response.status(201).json({ token: signToken(user.id, user.role), user: safeUser });
});

authRouter.get("/me", authenticate, async (request, response) => {
  const user = await prisma.user.findUnique({
    where: { id: request.auth!.userId },
    select: {
      id: true, email: true, role: true, createdAt: true,
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
    backlogs: z.number().int().min(0).max(10).optional()
  }).parse(request.body);

  const student = await prisma.student.findUnique({ where: { userId: request.auth!.userId } });
  if (!student) return response.status(404).json({ error: "Student profile not found" });

  const nextCgpa = input.cgpa ?? student.cgpa;
  const nextSkills = input.skills ?? student.skills;
  const nextBacklogs = input.backlogs ?? student.backlogs;
  const readinessScore = Math.min(100, Math.max(25, Math.round(nextCgpa * 8 + nextSkills.length * 3 - nextBacklogs * 8)));

  const updated = await prisma.student.update({
    where: { id: student.id },
    data: { ...input, readinessScore },
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
  const safeUsers = users.map(user => {
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  });
  response.json(safeUsers);
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
    role: z.enum(["STUDENT", "COORDINATOR", "ADMIN"]).optional(),
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
    } else if (input.role === "COORDINATOR" && !user.coordinator) {
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
  if (updatedUser.role === "COORDINATOR") {
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
    const { passwordHash: _, ...safeUser } = finalUser;
    return response.json(safeUser);
  }
  response.json({ success: true });
});

authRouter.post("/users/coordinator", authenticate, authorize(UserRole.ADMIN), async (request, response) => {
  const input = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    department: z.string().min(2)
  }).parse(request.body);

  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) return response.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      role: "COORDINATOR",
      coordinator: { create: { department: input.department } }
    },
    include: { coordinator: true }
  });
  
  await audit(request.auth!.userId, "CREATE_COORDINATOR", "auth", { newCoordinatorId: user.id });
  const { passwordHash: _, ...safeUser } = user;
  response.status(201).json(safeUser);
});
