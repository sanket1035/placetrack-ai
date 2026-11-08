import { Router } from "express";
import { prisma } from "../lib/prisma.js";

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

