import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { jwtSecret } from "../lib/config.js";

type TokenPayload = { sub: string; role: UserRole };

export function signToken(userId: string, role: UserRole) {
  return jwt.sign({ sub: userId, role }, jwtSecret(), {
    expiresIn: "12h"
  });
}

export function authenticate(request: Request, response: Response, next: NextFunction) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return response.status(401).json({ error: "Authentication required" });
  try {
    const payload = jwt.verify(header.slice(7), jwtSecret()) as TokenPayload;
    request.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    return response.status(401).json({ error: "Invalid or expired token" });
  }
}

export function authorize(...roles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.auth || !roles.includes(request.auth.role)) return response.status(403).json({ error: "Insufficient permissions" });
    next();
  };
}
