import { Router } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { attachScope, applicationWhere, driveWhere, studentWhere } from "../lib/scope.js";
import { toCsv, toJson, exportFilename } from "../utils/exportUtils.js";

export const reportsRouter = Router();
reportsRouter.use(authenticate, authorize(UserRole.TPC, UserRole.ADMIN), attachScope);

// Coordinators may only export the company/drives report; student and application data stays with the admin.
const adminOnly = authorize(UserRole.ADMIN);

const dept = (request: { scope?: { department: string | null } }) => request.scope!.department;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const APPLICATION_HEADERS = [
  "Student", "Email", "Branch", "CGPA", "Company", "Role",
  "Package LPA", "Status", "Applied At", "Interview At",
];

function mapApplicationRow(item: any): unknown[] {
  return [
    item.student.name,
    item.student.user.email,
    item.student.branch,
    item.student.cgpa,
    item.drive.company.name,
    item.drive.role,
    item.drive.package,
    item.status,
    item.appliedAt.toISOString(),
    item.interview?.dateTime?.toISOString() ?? "",
  ];
}

function mapApplicationJson(item: any) {
  return {
    id: item.id,
    student: {
      name: item.student.name,
      email: item.student.user.email,
      branch: item.student.branch,
      cgpa: item.student.cgpa,
    },
    drive: {
      company: item.drive.company.name,
      role: item.drive.role,
      packageLpa: item.drive.package,
    },
    status: item.status,
    appliedAt: item.appliedAt.toISOString(),
    interviewAt: item.interview?.dateTime?.toISOString() ?? null,
  };
}

const STUDENT_HEADERS = [
  "Name", "Email", "Branch", "CGPA", "Backlogs", "Batch Year",
  "Readiness Score", "Applications", "Tests Taken", "Skills",
];

function mapStudentRow(item: any): unknown[] {
  return [
    item.name,
    item.user.email,
    item.branch,
    item.cgpa,
    item.backlogs,
    item.graduationYear,
    item.readinessScore,
    item._count.applications,
    item._count.testResults,
    item.skills.join("; "),
  ];
}

function mapStudentJson(item: any) {
  return {
    id: item.id,
    name: item.name,
    email: item.user.email,
    branch: item.branch,
    cgpa: item.cgpa,
    backlogs: item.backlogs,
    graduationYear: item.graduationYear,
    readinessScore: item.readinessScore,
    skills: item.skills,
    applicationCount: item._count.applications,
    testCount: item._count.testResults,
  };
}

const DRIVE_HEADERS = [
  "Company", "Role", "Package LPA", "Location", "Job Type",
  "Deadline", "Status", "Min CGPA", "Max Backlogs", "Allowed Branches", "Applications",
];

function mapDriveRow(item: any): unknown[] {
  return [
    item.company.name,
    item.role,
    item.package,
    item.location,
    item.jobType,
    item.deadline.toISOString(),
    item.status,
    item.minCgpa,
    item.maxBacklogs ?? 0,
    item.allowedBranches.join("; "),
    item._count.applications,
  ];
}

function mapDriveJson(item: any) {
  return {
    id: item.id,
    company: item.company.name,
    role: item.role,
    packageLpa: item.package,
    location: item.location,
    jobType: item.jobType,
    deadline: item.deadline.toISOString(),
    status: item.status,
    minCgpa: item.minCgpa,
    maxBacklogs: item.maxBacklogs ?? 0,
    allowedBranches: item.allowedBranches,
    applicationCount: item._count.applications,
  };
}

// ─── Applications ─────────────────────────────────────────────────────────────

reportsRouter.get("/applications.csv", adminOnly, async (request, response) => {
  const applications = await prisma.application.findMany({
    where: applicationWhere(dept(request)),
    include: {
      student: { include: { user: true } },
      drive: { include: { company: true } },
      interview: true,
    },
    orderBy: { appliedAt: "desc" },
  });
  await audit(request.auth!.userId, "EXPORT", "applications-report-csv", {
    rows: applications.length,
  });
  const csv = toCsv(
    APPLICATION_HEADERS,
    applications.map(mapApplicationRow)
  );
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader(
    "Content-Disposition",
    `attachment; filename="${exportFilename("applications", "csv")}"`
  );
  response.send(csv);
});

reportsRouter.get("/applications.json", adminOnly, async (request, response) => {
  const applications = await prisma.application.findMany({
    where: applicationWhere(dept(request)),
    include: {
      student: { include: { user: true } },
      drive: { include: { company: true } },
      interview: true,
    },
    orderBy: { appliedAt: "desc" },
  });
  await audit(request.auth!.userId, "EXPORT", "applications-report-json", {
    rows: applications.length,
  });
  const payload = toJson(applications.map(mapApplicationJson), {
    report: "applications",
  });
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader(
    "Content-Disposition",
    `attachment; filename="${exportFilename("applications", "json")}"`
  );
  response.json(payload);
});

// ─── Students ─────────────────────────────────────────────────────────────────

reportsRouter.get("/students.csv", adminOnly, async (request, response) => {
  const students = await prisma.student.findMany({
    where: studentWhere(dept(request)),
    include: {
      user: true,
      _count: { select: { applications: true, testResults: true } },
    },
    orderBy: { name: "asc" },
  });
  await audit(request.auth!.userId, "EXPORT", "students-report-csv", {
    rows: students.length,
  });
  const csv = toCsv(STUDENT_HEADERS, students.map(mapStudentRow));
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader(
    "Content-Disposition",
    `attachment; filename="${exportFilename("students", "csv")}"`
  );
  response.send(csv);
});

reportsRouter.get("/students.json", adminOnly, async (request, response) => {
  const students = await prisma.student.findMany({
    where: studentWhere(dept(request)),
    include: {
      user: true,
      _count: { select: { applications: true, testResults: true } },
    },
    orderBy: { name: "asc" },
  });
  await audit(request.auth!.userId, "EXPORT", "students-report-json", {
    rows: students.length,
  });
  const payload = toJson(students.map(mapStudentJson), { report: "students" });
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader(
    "Content-Disposition",
    `attachment; filename="${exportFilename("students", "json")}"`
  );
  response.json(payload);
});

// ─── Drives ───────────────────────────────────────────────────────────────────

reportsRouter.get("/drives.csv", async (request, response) => {
  const drives = await prisma.placementDrive.findMany({
    where: driveWhere(dept(request)),
    include: {
      company: true,
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  await audit(request.auth!.userId, "EXPORT", "drives-report-csv", {
    rows: drives.length,
  });
  const csv = toCsv(DRIVE_HEADERS, drives.map(mapDriveRow));
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader(
    "Content-Disposition",
    `attachment; filename="${exportFilename("drives", "csv")}"`
  );
  response.send(csv);
});

reportsRouter.get("/drives.json", async (request, response) => {
  const drives = await prisma.placementDrive.findMany({
    where: driveWhere(dept(request)),
    include: {
      company: true,
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  await audit(request.auth!.userId, "EXPORT", "drives-report-json", {
    rows: drives.length,
  });
  const payload = toJson(drives.map(mapDriveJson), { report: "drives" });
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader(
    "Content-Disposition",
    `attachment; filename="${exportFilename("drives", "json")}"`
  );
  response.json(payload);
});

// ─── Placement Summary (JSON only) ────────────────────────────────────────────

reportsRouter.get("/summary.json", adminOnly, async (request, response) => {
  const [
    totalStudents,
    totalDrives,
    totalApplications,
    selectedApplications,
    avgCgpa,
    drives,
  ] = await Promise.all([
    prisma.student.count({ where: studentWhere(dept(request)) }),
    prisma.placementDrive.count({ where: driveWhere(dept(request)) }),
    prisma.application.count({ where: applicationWhere(dept(request)) }),
    prisma.application.count({ where: { status: "SELECTED", ...applicationWhere(dept(request)) } }),
    prisma.student.aggregate({ where: studentWhere(dept(request)), _avg: { cgpa: true } }),
    prisma.placementDrive.findMany({
      include: { company: true, _count: { select: { applications: true } } },
      where: { status: { in: ["OPEN", "COMPLETED"] }, ...driveWhere(dept(request)) },
    }),
  ]);

  const placementRate =
    totalStudents > 0
      ? Math.round((selectedApplications / totalStudents) * 100)
      : 0;

  await audit(request.auth!.userId, "EXPORT", "summary-report-json", {});

  const payload = {
    generatedAt: new Date().toISOString(),
    report: "placement-summary",
    summary: {
      totalStudents,
      totalDrives,
      totalApplications,
      placedStudents: selectedApplications,
      placementRate,
      averageCgpa: Number((avgCgpa._avg.cgpa ?? 0).toFixed(2)),
    },
    drives: drives.map((d: any) => ({
      company: d.company.name,
      role: d.role,
      packageLpa: d.package,
      status: d.status,
      applicationCount: d._count.applications,
    })),
  };

  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader(
    "Content-Disposition",
    `attachment; filename="${exportFilename("summary", "json")}"`
  );
  response.json(payload);
});

// ─── Interactive Analytics Groupings ──────────────────────────────────────────

reportsRouter.get("/analytics", async (request, response) => {
  const [applications, drives, students] = await Promise.all([
    prisma.application.findMany({
      where: applicationWhere(dept(request)),
      select: { appliedAt: true, status: true },
    }),
    prisma.placementDrive.findMany({
      where: driveWhere(dept(request)),
      select: { package: true, status: true },
    }),
    prisma.student.findMany({
      where: studentWhere(dept(request)),
      select: { branch: true, applications: { select: { status: true } } },
    }),
  ]);

  // Group applications by Month (YYYY-MM)
  const trendsMap: Record<string, { month: string; applications: number; placements: number }> = {};
  applications.forEach((app) => {
    const date = new Date(app.appliedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!trendsMap[monthKey]) {
      trendsMap[monthKey] = { month: monthKey, applications: 0, placements: 0 };
    }
    trendsMap[monthKey].applications++;
    if (app.status === "SELECTED") {
      trendsMap[monthKey].placements++;
    }
  });

  const historicalTrends = Object.values(trendsMap).sort((a, b) => a.month.localeCompare(b.month));

  // Package distribution ranges
  const packageDistribution = {
    under5: 0,
    from5to10: 0,
    from10to15: 0,
    above15: 0,
  };
  drives.forEach((d) => {
    const p = d.package;
    if (p < 5) packageDistribution.under5++;
    else if (p < 10) packageDistribution.from5to10++;
    else if (p < 15) packageDistribution.from10to15++;
    else packageDistribution.above15++;
  });

  // Selection rates per branch
  const branchSummaryMap: Record<string, { branch: string; total: number; placed: number }> = {};
  students.forEach((s) => {
    const isPlaced = s.applications.some((app) => app.status === "SELECTED");
    if (!branchSummaryMap[s.branch]) {
      branchSummaryMap[s.branch] = { branch: s.branch, total: 0, placed: 0 };
    }
    branchSummaryMap[s.branch].total++;
    if (isPlaced) {
      branchSummaryMap[s.branch].placed++;
    }
  });

  const departmentPlacements = Object.values(branchSummaryMap).map((b) => ({
    branch: b.branch,
    totalStudents: b.total,
    placedStudents: b.placed,
    placementRate: b.total > 0 ? Math.round((b.placed / b.total) * 100) : 0,
  }));

  await audit(request.auth!.userId, "EXPORT", "analytics-data", {});

  response.json({
    historicalTrends,
    packageDistribution,
    departmentPlacements,
  });
});


// ─── Department overview (coordinator dashboard) ──────────────────────────────

reportsRouter.get("/department-overview", async (request, response) => {
  const department = dept(request);
  const students = await prisma.student.findMany({
    where: studentWhere(department),
    select: {
      id: true, name: true, branch: true, cgpa: true, backlogs: true, readinessScore: true,
      skills: true, projectNames: true, internshipNames: true,
      applications: { select: { status: true, drive: { select: { package: true } } } }
    }
  });
  const drives = await prisma.placementDrive.findMany({
    where: driveWhere(department),
    select: { status: true, deadline: true, company: { select: { name: true } }, role: true, package: true, _count: { select: { applications: true } } }
  });

  const placed = students.filter((student) => student.applications.some((application) => application.status === "SELECTED"));
  const placedPackages = placed.flatMap((student) => student.applications.filter((a) => a.status === "SELECTED").map((a) => a.drive.package));
  const funnel: Record<string, number> = { APPLIED: 0, SHORTLISTED: 0, APTITUDE_CLEARED: 0, TECHNICAL_ROUND: 0, HR_ROUND: 0, SELECTED: 0, REJECTED: 0 };
  for (const student of students) for (const application of student.applications) funnel[application.status] = (funnel[application.status] ?? 0) + 1;

  const total = students.length;
  const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
  const now = Date.now();
  const atRisk = students
    .filter((student) => student.readinessScore < 40 || student.backlogs > 0)
    .sort((a, b) => b.backlogs - a.backlogs || a.readinessScore - b.readinessScore)
    .slice(0, 25)
    .map((student) => ({
      id: student.id, name: student.name, branch: student.branch, cgpa: student.cgpa, backlogs: student.backlogs,
      readiness: Math.round(student.readinessScore),
      reasons: [student.backlogs > 0 ? `${student.backlogs} backlog${student.backlogs > 1 ? "s" : ""}` : "", student.readinessScore < 40 ? "Low readiness" : ""].filter(Boolean)
    }));
  const incompleteProfiles = students.filter((student) => student.skills.length < 3 || student.projectNames.length === 0).length;

  response.json({
    department: department ?? "All departments",
    totalStudents: total,
    placedStudents: placed.length,
    placementRate: total ? Math.round((placed.length / total) * 100) : 0,
    averageCgpa: Number(avg(students.map((s) => s.cgpa)).toFixed(2)),
    averageReadiness: Math.round(avg(students.map((s) => s.readinessScore))),
    averagePackage: Number(avg(placedPackages).toFixed(2)),
    highestPackage: placedPackages.length ? Math.max(...placedPackages) : 0,
    lowReadiness: students.filter((s) => s.readinessScore < 40).length,
    withBacklogs: students.filter((s) => s.backlogs > 0).length,
    incompleteProfiles,
    activeDrives: drives.filter((drive) => drive.status === "OPEN" && drive.deadline.getTime() > now).length,
    funnel,
    topDrives: [...drives].sort((a, b) => b._count.applications - a._count.applications).slice(0, 5)
      .map((drive) => ({ company: drive.company.name, role: drive.role, package: drive.package, applications: drive._count.applications })),
    atRisk
  });
});
