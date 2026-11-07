import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { jwtSecret } from "../lib/config.js";
import { prisma } from "../lib/prisma.js";

type TokenPayload = { sub: string; role: UserRole };

export function signToken(userId: string, role: UserRole) {
  return jwt.sign({ sub: userId, role }, jwtSecret(), {
    expiresIn: "12h"
  });
}

/**
 * Verifies the JWT, then re-reads the user's role from the database on every request.
 * The token only proves who the user is; their current role comes from the database, so a role change
 * or a deleted account takes effect immediately instead of when the token expires.
 */
export async function authenticate(request: Request, response: Response, next: NextFunction) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return response.status(401).json({ error: "Authentication required" });
  let payload: TokenPayload;
  try {
    payload = jwt.verify(header.slice(7), jwtSecret()) as TokenPayload;
  } catch {
    return response.status(401).json({ error: "Invalid or expired token" });
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true } });
  if (!user) return response.status(401).json({ error: "This account no longer exists. Please sign in again." });
  request.auth = { userId: user.id, role: user.role };
  next();
}

export function authorize(...roles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.auth || !roles.includes(request.auth.role)) return response.status(403).json({ error: "Insufficient permissions" });
    next();
  };
}
