import request from "supertest";
import { app } from "../src/server.js";
import { prisma } from "../src/lib/prisma.js";
import { signToken } from "../src/middleware/auth.js";
import { buildDriveEmail, driveMail, notifyEligibleStudents } from "../src/services/driveNotifications.js";

const FORM = "https://docs.google.com/forms/d/abc123/viewform";
let adminToken: string;
let studentToken: string;
const sent: Array<{ to: string; subject: string; html: string }> = [];
const realSend = driveMail.send;

const driveBody = (overrides: Record<string, unknown> = {}) => ({
  company: { name: "Armstrong Robotics" },
  role: "Graduate Engineer Trainee",
  package: 4.5,
  location: "Pune",
  description: "GET 2027 program. Fill the form before the deadline.",
  minCgpa: 6,
  allowedBranches: ["Mechanical Engineering", "Information Technology"],
  maxBacklogs: 1,
  graduationYear: 2027,
  deadline: "2026-11-09T02:30:00.000Z",
  ...overrides
});

beforeAll(async () => {
  await prisma.notification.deleteMany({ where: { user: { email: { endsWith: "@drive.test" } } } });
  await prisma.application.deleteMany({ where: { student: { user: { email: { endsWith: "@drive.test" } } } } });
  await prisma.student.deleteMany({ where: { user: { email: { endsWith: "@drive.test" } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@drive.test" } } });
  const admin = await prisma.user.create({ data: { email: "admin@drive.test", role: "ADMIN" } });
  adminToken = signToken(admin.id, "ADMIN");
  const mk = (email: string, branch: string, cgpa: number, emailEnabled = true) =>
    prisma.user.create({
      data: { email, role: "STUDENT", student: { create: { name: email, branch, cgpa, graduationYear: 2027, skills: [], onboarded: true, emailEnabled } } },
      include: { student: true }
    });
  const eligible = await mk("it.ok@drive.test", "Information Technology", 8);
  studentToken = signToken(eligible.id, "STUDENT");
  await mk("it.low@drive.test", "Information Technology", 4);
  await mk("it.optout@drive.test", "Information Technology", 8, false);
  await mk("civil@drive.test", "Civil Engineering", 9);
  driveMail.send = async (message) => { sent.push(message); };
});

afterAll(async () => {
  driveMail.send = realSend;
  await prisma.$disconnect();
});

describe("external application link and drive emails", () => {
  it("stores the apply link and only accepts http(s) URLs", async () => {
    const ok = await request(app).post("/api/drives").set("Authorization", `Bearer ${adminToken}`).send(driveBody({ applyUrl: FORM }));
    expect(ok.status).toBe(201);
    expect(ok.body.applyUrl).toBe(FORM);

    const bad = await request(app).post("/api/drives").set("Authorization", `Bearer ${adminToken}`).send(driveBody({ applyUrl: "javascript:alert(1)" }));
    expect(bad.status).toBe(400);
  });

  it("emails only eligible students who have email alerts on, with the form link and the deadline", async () => {
    sent.length = 0;
    const company = await prisma.company.upsert({ where: { name: "Armstrong Robotics" }, update: {}, create: { name: "Armstrong Robotics" } });
    const drive = await prisma.placementDrive.create({
      data: { companyId: company.id, role: "GET", package: 4.5, location: "Pune", jobType: "Full-time", description: "Program <b>details</b>", minCgpa: 6, allowedBranches: ["Information Technology"], maxBacklogs: 1, graduationYear: 2027, deadline: new Date("2026-11-09T02:30:00.000Z"), applyUrl: FORM },
      include: { company: true }
    });
    const result = await notifyEligibleStudents(drive, null);
    expect(result.eligible).toBeGreaterThanOrEqual(2);
    const mine = sent.filter((mail) => mail.to.endsWith("@drive.test"));
    expect([...new Set(mine.map((mail) => mail.to))]).toEqual(["it.ok@drive.test"]);
    expect(mine[0].html).toContain(FORM);
    expect(mine[0].html).toMatch(/9 Nov 2026, 8:00\s?(am|AM) IST/);
    expect(mine[0].html).not.toContain("<b>details</b>");
    expect(mine[0].subject).toContain("Armstrong Robotics");
    const notified = await prisma.notification.count({ where: { user: { email: { in: ["it.ok@drive.test", "it.optout@drive.test"] } }, title: "New Eligible Drive" } });
    expect(notified).toBeGreaterThanOrEqual(2);
  });

  it("tells the student to confirm in PlaceTrack even when there is no link", () => {
    const mail = buildDriveEmail({ id: "x", companyId: "c", company: { id: "c", name: "Acme", website: null, description: null, logo: null }, role: "SDE", package: 6, location: "Pune", jobType: "Full-time", description: "", minCgpa: 6, allowedBranches: ["Mechanical Engineering"], maxBacklogs: 0, graduationYear: 2027, deadline: new Date("2026-11-09T02:30:00.000Z"), applyUrl: null, testDate: null, interviewDate: null, status: "OPEN", createdAt: new Date() } as any);
    expect(mail.html).toContain("I have applied");
    expect(mail.html).not.toContain("Open the application form");
  });

  it("lets a student confirm they applied and records it as tracked", async () => {
    const drive = await prisma.placementDrive.findFirstOrThrow({ where: { applyUrl: FORM } });
    const response = await request(app).post("/api/applications").set("Authorization", `Bearer ${studentToken}`).send({ driveId: drive.id });
    expect(response.status).toBe(201);
    expect(JSON.stringify(response.body.timeline)).toContain("confirmed applying");
    const again = await request(app).post("/api/applications").set("Authorization", `Bearer ${studentToken}`).send({ driveId: drive.id });
    expect(again.status).toBe(409);
  });
});
