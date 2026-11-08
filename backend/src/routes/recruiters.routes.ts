import { Router } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { audit } from "../lib/audit.js";
import { authenticate, authorize } from "../middleware/auth.js";

/** Admin-managed list of every company that has recruited from the college (not tied to drives in the app). */
export const recruitersRouter = Router();
recruitersRouter.use(authenticate, authorize(UserRole.ADMIN));

recruitersRouter.get("/", async (_request, response) => {
  response.json(await prisma.recruiter.findMany({ orderBy: { name: "asc" } }));
});

// Paste many names at once. Duplicates (ignoring case) and blank lines are skipped.
recruitersRouter.post("/bulk", async (request, response) => {
  const { names } = z.object({ names: z.array(z.string()).max(1000) }).parse(request.body);
  const cleaned = names.map((name) => name.replace(/\s+/g, " ").trim()).filter((name) => name.length >= 2 && name.length <= 80);
  const existing = new Set((await prisma.recruiter.findMany({ select: { name: true } })).map((row) => row.name.toLowerCase()));
  const fresh: string[] = [];
  for (const name of cleaned) {
    if (existing.has(name.toLowerCase())) continue;
    existing.add(name.toLowerCase());
    fresh.push(name);
  }
  if (fresh.length) await prisma.recruiter.createMany({ data: fresh.map((name) => ({ name })), skipDuplicates: true });
  await audit(request.auth!.userId, "CREATE", "recruiters", { added: fresh.length });
  response.status(201).json({ added: fresh.length, skipped: cleaned.length - fresh.length });
});

recruitersRouter.delete("/:id", async (request, response) => {
  await prisma.recruiter.delete({ where: { id: String(request.params.id) } });
  await audit(request.auth!.userId, "DELETE", "recruiter", { id: String(request.params.id) });
  response.json({ ok: true });
});
