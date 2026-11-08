import { Router } from "express";
import { ApplicationStatus, DriveStatus, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { attachScope, applicationWhere, driveWhere, studentWhere } from "../lib/scope.js";
import { readinessForStudent } from "../services/studentReadiness.js";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate, attachScope);

dashboardRouter.get("/", async (request, response) => {
  if (request.auth!.role === UserRole.STUDENT) {
    const student = await prisma.student.findUnique({
      where: { userId: request.auth!.userId },
      include: {
        applications: {
          include: { drive: { include: { company: true } }, interview: true },
          orderBy: { updatedAt: "desc" }
        },
        testResults: { orderBy: { completedAt: "desc" }, take: 10 }
      }
    });
    if (!student) return response.status(404).json({ error: "Student profile not found" });
    const readiness = await readinessForStudent(student);
    if (Math.abs(student.readinessScore - readiness.score) >= 1) {
      await prisma.student.update({ where: { id: student.id }, data: { readinessScore: readiness.score } });
    }
    return response.json({
      profile: { 
        id: student.id, 
        name: student.name, 
        branch: student.branch, 
        cgpa: student.cgpa, 
        graduationYear: student.graduationYear, 
        skills: student.skills,
        projectNames: student.projectNames,
        internshipNames: student.internshipNames,
        linkedinUrl: student.linkedinUrl,
        projectsCount: student.projectsCount,
        internshipsCount: student.internshipsCount,
        resumeUrl: student.resumeUrl,
        mockTestCount: student.mockTestCount
      },
      readiness,
      stats: {
        applications: student.applications.length,
        interviews: student.applications.filter((item) => item.interview?.status === "SCHEDULED").length,
        offers: student.applications.filter((item) => item.status === ApplicationStatus.SELECTED).length,
        testAccuracy: student.testResults.length ? Math.round(student.testResults.reduce((sum, item) => sum + item.accuracy, 0) / student.testResults.length) : 0
      },
      applications: student.applications.slice(0, 5),
      upcoming: student.applications.flatMap((item) => item.interview ? [{ ...item.interview, company: item.drive.company.name, role: item.drive.role }] : []).slice(0, 5)
    });
  }

  const department = request.scope!.department;
  const [students, companies, drives, applications, selectedRows, averages, branchRows] = await Promise.all([
    prisma.student.count({ where: studentWhere(department) }),
    prisma.company.count({ where: department ? { drives: { some: driveWhere(department) } } : {} }),
    prisma.placementDrive.count({ where: { status: DriveStatus.OPEN, ...driveWhere(department) } }),
    prisma.application.count({ where: applicationWhere(department) }),
    prisma.application.findMany({ where: { status: ApplicationStatus.SELECTED, ...applicationWhere(department) }, distinct: ["studentId"], select: { studentId: true } }),
    prisma.placementDrive.aggregate({ where: driveWhere(department), _avg: { package: true }, _max: { package: true } }),
    prisma.student.groupBy({ by: ["branch"], where: studentWhere(department), _count: { id: true }, _avg: { readinessScore: true } })
  ]);
  const selected = selectedRows.length;
  response.json({
    students, companies, activeDrives: drives, applications,
    selected, placementRate: students ? Math.round(selected / students * 100) : 0,
    averagePackage: averages._avg.package ?? 0, highestPackage: averages._max.package ?? 0,
    branchPerformance: branchRows.map((row) => ({ branch: row.branch, students: row._count.id, readiness: Math.round(row._avg.readinessScore ?? 0) }))
  });
});
