import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { escapeHtml } from "../services/driveNotifications.js";
import { getEmailTemplate, sendEmail } from "../services/mailer.js";

/** Unauthenticated endpoints for the public landing page. Keep everything here aggregated or write-only. */
export const publicRouter = Router();

// Numbers are real aggregates only (no names, no emails). The college turns them on with SHOW_PUBLIC_STATS=true.
publicRouter.get("/stats", async (_request, response) => {
  if (process.env.SHOW_PUBLIC_STATS !== "true") return response.json({ enabled: false });
  const [students, placedRows, drives, selected] = await Promise.all([
    prisma.student.count(),
    prisma.application.findMany({ where: { status: "SELECTED" }, distinct: ["studentId"], select: { studentId: true } }),
    prisma.placementDrive.findMany({ select: { company: { select: { name: true } } } }),
    prisma.application.findMany({ where: { status: "SELECTED" }, select: { drive: { select: { package: true, company: { select: { name: true } } } } } })
  ]);
  const packages = selected.map((row) => row.drive.package);
  const companies = new Set(drives.map((drive) => drive.company.name));
  response.json({
    enabled: true,
    students,
    placed: placedRows.length,
    placementRate: students ? Math.round((placedRows.length / students) * 100) : 0,
    companies: companies.size,
    drives: drives.length,
    highestPackage: packages.length ? Math.max(...packages) : 0,
    averagePackage: packages.length ? Number((packages.reduce((a, b) => a + b, 0) / packages.length).toFixed(2)) : 0
  });
});

// Names only. Maintained by the admin (see recruiters.routes.ts).
publicRouter.get("/recruiters", async (_request, response) => {
  const rows = await prisma.recruiter.findMany({ orderBy: { name: "asc" }, select: { name: true } });
  response.json(rows.map((row) => row.name));
});

const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_request, response) => response.status(429).json({ error: "Too many messages. Please try again in an hour." })
});

const inquirySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().max(20).optional().default(""),
  message: z.string().trim().min(10).max(1500),
  website: z.string().optional() // honeypot: real people leave this empty
});

publicRouter.post("/inquiry", inquiryLimiter, async (request, response) => {
  const input = inquirySchema.parse(request.body);
  if (input.website) return response.json({ ok: true }); // silently drop bots
  const to = process.env.INQUIRY_EMAIL;
  if (!to) return response.status(503).json({ error: "The inquiry form is not set up yet. Please contact the placement cell directly." });
  const body = `
    <p><strong>${escapeHtml(input.name)}</strong> sent a placement inquiry.</p>
    <table style="font-size:14px;">
      <tr><td style="padding:4px 12px 4px 0;color:#707978;">Email</td><td><strong>${escapeHtml(input.email)}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#707978;">Phone</td><td><strong>${escapeHtml(input.phone || "Not given")}</strong></td></tr>
    </table>
    <p style="white-space:pre-line;">${escapeHtml(input.message)}</p>`;
  await sendEmail({ to, subject: `Placement inquiry from ${input.name}`, html: getEmailTemplate("New placement inquiry", body) });
  response.status(201).json({ ok: true });
});
