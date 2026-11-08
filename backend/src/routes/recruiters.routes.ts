import { Router } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { audit } from "../lib/audit.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { PUBLISHED_RECRUITERS } from "../data/kkwaghRecruiters.js";

/** Admin-managed list of every company that has recruited from the college (not tied to drives in the app). */
export const recruitersRouter = Router();
recruitersRouter.use(authenticate, authorize(UserRole.ADMIN));

recruitersRouter.get("/", async (_request, response) => {
  response.json(await prisma.recruiter.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }));
});

// Adds the recruiters listed on the college website. Safe to run again: names already present are skipped.
recruitersRouter.post("/starter", async (request, response) => {
  const existing = new Set((await prisma.recruiter.findMany({ select: { name: true } })).map((row) => row.name.toLowerCase()));
  const data: { name: string; category: string }[] = [];
  for (const [category, names] of Object.entries(PUBLISHED_RECRUITERS)) {
    for (const name of names) {
      if (existing.has(name.toLowerCase())) continue;
      existing.add(name.toLowerCase());
      data.push({ name, category });
    }
  }
  if (data.length) await prisma.recruiter.createMany({ data, skipDuplicates: true });
  await audit(request.auth!.userId, "CREATE", "recruiters-starter", { added: data.length });
  response.status(data.length ? 201 : 200).json({ added: data.length });
});

// Paste many names at once. Duplicates (ignoring case) and blank lines are skipped.
recruitersRouter.post("/bulk", async (request, response) => {
  const { names, category } = z.object({ names: z.array(z.string()).max(1000), category: z.string().trim().min(2).max(40).optional() }).parse(request.body);
  const cleaned = names.map((name) => name.replace(/\s+/g, " ").trim()).filter((name) => name.length >= 2 && name.length <= 80);
  const existing = new Set((await prisma.recruiter.findMany({ select: { name: true } })).map((row) => row.name.toLowerCase()));
  const fresh: string[] = [];
  for (const name of cleaned) {
    if (existing.has(name.toLowerCase())) continue;
    existing.add(name.toLowerCase());
    fresh.push(name);
  }
  if (fresh.length) await prisma.recruiter.createMany({ data: fresh.map((name) => ({ name, category: category ?? "Other" })), skipDuplicates: true });
  await audit(request.auth!.userId, "CREATE", "recruiters", { added: fresh.length });
  response.status(201).json({ added: fresh.length, skipped: cleaned.length - fresh.length });
});

recruitersRouter.delete("/:id", async (request, response) => {
  await prisma.recruiter.delete({ where: { id: String(request.params.id) } });
  await audit(request.auth!.userId, "DELETE", "recruiter", { id: String(request.params.id) });
  response.json({ ok: true });
});
