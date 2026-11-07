import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "./prisma.js";

/**
 * Department scoping for Training & Placement Coordinators (TPC).
 * ADMIN sees everything (department = null). A TPC only sees students,
 * applications and drives that belong to their own department.
 */
declare global {
  namespace Express {
    interface Request {
      scope?: { department: string | null };
    }
  }
}

export async function attachScope(request: Request, response: Response, next: NextFunction) {
  if (request.auth?.role === UserRole.TPC) {
    const profile = await prisma.coordinator.findUnique({ where: { userId: request.auth.userId } });
    if (!profile) return response.status(403).json({ error: "TPC profile has no department assigned" });
    request.scope = { department: profile.department };
  } else {
    request.scope = { department: null };
  }
  next();
}

export const studentWhere = (department: string | null) => (department ? { branch: department } : {});
export const driveWhere = (department: string | null) => (department ? { allowedBranches: { has: department } } : {});
export const applicationWhere = (department: string | null) => (department ? { student: { branch: department } } : {});
