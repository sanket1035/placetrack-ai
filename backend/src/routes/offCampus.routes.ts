import { Router } from "express";
import { OffCampusStatus, OffCampusType, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

/**
 * Private tracker for applications a student made outside the college drives.
 * Every query is filtered by the signed-in student's own id, so no one else (including TPC/admin) can read or change a row.
 */
export const offCampusRouter = Router();
offCampusRouter.use(authenticate, authorize(UserRole.STUDENT));

const httpUrl = z.string().trim().url().refine((value) => /^https?:\/\//i.test(value), "Link must start with http:// or https://");
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || undefined);
const optionalDate = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable();

const createSchema = z.object({
  company: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(160),
  type: z.nativeEnum(OffCampusType).default(OffCampusType.JOB),
  link: httpUrl.optional().or(z.literal("").transform(() => undefined)),
  location: optionalText(120),
  compensation: optionalText(80),
  appliedOn: optionalDate,
  followUpOn: optionalDate,
  notes: optionalText(2000)
});

const patchSchema = z.object({
  company: z.string().trim().min(1).max(120).optional(),
  role: z.string().trim().min(1).max(160).optional(),
  type: z.nativeEnum(OffCampusType).optional(),
  link: httpUrl.nullable().or(z.literal("").transform(() => null)).optional(),
  location: z.string().trim().max(120).nullable().optional(),
  compensation: z.string().trim().max(80).nullable().optional(),
  followUpOn: optionalDate,
  notes: z.string().trim().max(2000).nullable().optional(),
  status: z.nativeEnum(OffCampusStatus).optional(),
  update: z.string().trim().max(500).optional()
});

type TimelineEntry = { at: string; status: OffCampusStatus; note: string };

const toDate = (value?: string | null) => (value ? new Date(value) : undefined);

async function currentStudentId(userId: string) {
  const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
  return student?.id ?? null;
}

async function findOwn(id: string, studentId: string) {
  return prisma.offCampusApplication.findFirst({ where: { id, studentId } });
}

offCampusRouter.get("/", async (request, response) => {
  const studentId = await currentStudentId(request.auth!.userId);
  if (!studentId) return response.status(404).json({ error: "Student profile not found" });
  const items = await prisma.offCampusApplication.findMany({ where: { studentId }, orderBy: { updatedAt: "desc" } });
  response.json(items);
});

offCampusRouter.post("/", async (request, response) => {
  const studentId = await currentStudentId(request.auth!.userId);
  if (!studentId) return response.status(404).json({ error: "Student profile not found" });
  const data = createSchema.parse(request.body);
  const appliedOn = toDate(data.appliedOn) ?? new Date();
  const timeline: TimelineEntry[] = [{ at: appliedOn.toISOString(), status: OffCampusStatus.APPLIED, note: "Applied" }];
  const created = await prisma.offCampusApplication.create({
    data: {
      studentId,
      company: data.company,
      role: data.role,
      type: data.type,
      link: data.link,
      location: data.location,
      compensation: data.compensation,
      appliedOn,
      followUpOn: toDate(data.followUpOn),
      notes: data.notes,
      timeline
    }
  });
  response.status(201).json(created);
});

offCampusRouter.patch("/:id", async (request, response) => {
  const studentId = await currentStudentId(request.auth!.userId);
  if (!studentId) return response.status(404).json({ error: "Student profile not found" });
  const existing = await findOwn(String(request.params.id), studentId);
  if (!existing) return response.status(404).json({ error: "Application not found" });

  const { status, update, followUpOn, ...rest } = patchSchema.parse(request.body);
  const timeline = Array.isArray(existing.timeline) ? [...(existing.timeline as unknown as TimelineEntry[])] : [];
  const nextStatus = status ?? existing.status;
  if ((status && status !== existing.status) || update) {
    timeline.push({ at: new Date().toISOString(), status: nextStatus, note: update || `Status changed to ${nextStatus.toLowerCase()}` });
  }
  const saved = await prisma.offCampusApplication.update({
    where: { id: existing.id },
    data: {
      ...rest,
      status: nextStatus,
      timeline,
      ...(followUpOn !== undefined ? { followUpOn: followUpOn ? new Date(followUpOn) : null } : {})
    }
  });
  response.json(saved);
});

offCampusRouter.delete("/:id", async (request, response) => {
  const studentId = await currentStudentId(request.auth!.userId);
  if (!studentId) return response.status(404).json({ error: "Student profile not found" });
  const existing = await findOwn(String(request.params.id), studentId);
  if (!existing) return response.status(404).json({ error: "Application not found" });
  await prisma.offCampusApplication.delete({ where: { id: existing.id } });
  response.status(204).end();
});
