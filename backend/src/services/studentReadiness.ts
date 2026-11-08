import { prisma } from "../lib/prisma.js";
import { predictReadiness } from "./readiness.js";

export interface ReadinessProfile {
  id: string;
  cgpa: number;
  backlogs: number;
  skills: string[];
  projectsCount: number;
  internshipsCount: number;
  mockTestCount: number;
}

/** Readiness for one student from their stored profile plus their last 10 aptitude test results. */
export async function readinessForStudent(profile: ReadinessProfile) {
  const results = await prisma.testResult.findMany({
    where: { studentId: profile.id },
    orderBy: { completedAt: "desc" },
    take: 10,
    select: { accuracy: true }
  });
  const aptitudeAccuracy = results.length ? results.reduce((sum, item) => sum + item.accuracy, 0) / results.length : 0;
  return predictReadiness({
    cgpa: profile.cgpa,
    aptitudeAccuracy,
    testsTaken: Math.max(profile.mockTestCount, results.length),
    skills: profile.skills.length,
    projects: profile.projectsCount,
    internships: profile.internshipsCount,
    backlogs: profile.backlogs
  });
}
