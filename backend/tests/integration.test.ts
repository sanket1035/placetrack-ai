import request from "supertest";
import { app } from "../src/server.js";
import { prisma } from "../src/lib/prisma.js";
import { signToken } from "../src/middleware/auth.js";
import { setGoogleVerifier } from "../src/lib/google.js";
import { config } from "../src/lib/config.js";

describe("PlaceTrack AI - Backend Integration Tests", () => {
  let studentToken: string;
  let adminToken: string;
  let studentUserId: string;
  let studentId: string;
  let adminUserId: string;
  let driveId: string;
  let ineligibleDriveId: string;
  let applicationId: string;

  beforeAll(async () => {
    // 1. Clean up existing data in correct sequence to prevent foreign key errors
    await prisma.questionAttempt.deleteMany();
    await prisma.interviewQuestion.deleteMany();
    await prisma.interview.deleteMany();
    await prisma.application.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.testResult.deleteMany();
    await prisma.resumeAnalysis.deleteMany();
    await prisma.student.deleteMany();
    await prisma.coordinator.deleteMany();
    await prisma.placementDrive.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany();

    // 3. Create student user and profile
    const studentUser = await prisma.user.create({
      data: {
        email: "student@example.com",
        role: "STUDENT",
        student: {
          create: {
            name: "Jane Doe",
            branch: "Computer Science",
            cgpa: 8.5,
            graduationYear: 2027,
            skills: ["JavaScript", "TypeScript", "React"],
            backlogs: 0,
            readinessScore: 85
          }
        }
      },
      include: { student: true }
    });
    studentUserId = studentUser.id;
    studentId = studentUser.student!.id;
    studentToken = signToken(studentUserId, "STUDENT");

    // 4. Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: "admin@example.com",
        role: "ADMIN"
      }
    });
    adminUserId = adminUser.id;
    adminToken = signToken(adminUserId, "ADMIN");

    // 5. Create company and drive
    const company = await prisma.company.create({
      data: {
        name: "Google",
        website: "https://google.com"
      }
    });

    const drive = await prisma.placementDrive.create({
      data: {
        companyId: company.id,
        role: "Software Engineer",
        package: 30.0,
        location: "Mountain View, CA",
        jobType: "FULL_TIME",
        description: "Software engineering role",
        minCgpa: 7.0,
        allowedBranches: ["Computer Science"],
        maxBacklogs: 0,
        graduationYear: 2027,
        deadline: new Date(Date.now() + 86400000 * 5)
      }
    });
    driveId = drive.id;

    // Create an ineligible drive (requires 9.5 CGPA, student has 8.5)
    const ineligibleDrive = await prisma.placementDrive.create({
      data: {
        companyId: company.id,
        role: "Principal Engineer",
        package: 80.0,
        location: "Mountain View, CA",
        jobType: "FULL_TIME",
        description: "Principal engineering role",
        minCgpa: 9.5,
        allowedBranches: ["Computer Science"],
        maxBacklogs: 0,
        graduationYear: 2027,
        deadline: new Date(Date.now() + 86400000 * 5)
      }
    });
    ineligibleDriveId = ineligibleDrive.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /api/auth/google", () => {
    const fakeCredential = "x".repeat(40);
    afterEach(() => setGoogleVerifier(null));

    it("signs in an existing user by verified email and links the Google account", async () => {
      setGoogleVerifier(async () => ({ sub: "g-student", email: "student@example.com", name: "Jane Doe" }));
      const response = await request(app).post("/api/auth/google").send({ credential: fakeCredential });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body.user.email).toBe("student@example.com");
      const user = await prisma.user.findUnique({ where: { email: "student@example.com" } });
      expect(user?.googleId).toBe("g-student");
    });

    it("refuses a different Google account for an already-linked email", async () => {
      setGoogleVerifier(async () => ({ sub: "g-other", email: "student@example.com", name: "Impostor" }));
      const response = await request(app).post("/api/auth/google").send({ credential: fakeCredential });
      expect(response.status).toBe(403);
    });

    it("self-registers a student from any verified Gmail when no domain list is set", async () => {
      setGoogleVerifier(async () => ({ sub: "g-new", email: "new.student@gmail.com", name: "New Student" }));
      const response = await request(app).post("/api/auth/google").send({ credential: fakeCredential });
      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe("STUDENT");
      expect(response.body.user.student.onboarded).toBe(false);
    });

    it("rejects other domains when a domain allow-list is configured", async () => {
      config.studentDomains.push("college.edu");
      setGoogleVerifier(async () => ({ sub: "g-x", email: "x@gmail.com", name: "X" }));
      const response = await request(app).post("/api/auth/google").send({ credential: fakeCredential });
      config.studentDomains.pop();
      expect(response.status).toBe(403);
    });

    it("also blocks existing students outside the allowed domain, and matches the domain case-insensitively", async () => {
      config.studentDomains.push("college.edu");
      try {
        setGoogleVerifier(async () => ({ sub: "g-student", email: "student@example.com", name: "Jane Doe" }));
        const blocked = await request(app).post("/api/auth/google").send({ credential: fakeCredential });
        expect(blocked.status).toBe(403);
        setGoogleVerifier(async () => ({ sub: "g-up", email: "Upper.Case@COLLEGE.EDU", name: "Upper" }));
        const allowed = await request(app).post("/api/auth/google").send({ credential: fakeCredential });
        expect(allowed.status).toBe(200);
      } finally {
        config.studentDomains.pop();
      }
    });

    it("rejects invalid Google tokens", async () => {
      setGoogleVerifier(async () => { throw new Error("Invalid token"); });
      const response = await request(app).post("/api/auth/google").send({ credential: fakeCredential });
      expect(response.status).toBe(401);
    });
  });

  describe("Training & Placement Coordinator (department scope)", () => {
    let tpcToken: string;
    let csApplicationId: string;
    let otherApplicationId: string;
    let otherDriveId: string;

    beforeAll(async () => {
      const tpc = await prisma.user.create({
        data: { email: "tpc.cs@example.com", name: "CS TPC", role: "TPC", coordinator: { create: { department: "Computer Science" } } }
      });
      tpcToken = signToken(tpc.id, "TPC");

      const mech = await prisma.user.create({
        data: {
          email: "mech@example.com", role: "STUDENT",
          student: { create: { name: "Mech Student", branch: "Mechanical", cgpa: 8, graduationYear: 2027, skills: [], onboarded: true } }
        },
        include: { student: true }
      });
      const mechDrive = await prisma.placementDrive.create({
        data: {
          company: { connect: { name: "Google" } }, role: "Design Engineer", package: 10, location: "Pune", jobType: "FULL_TIME",
          description: "Mechanical design role", minCgpa: 6, allowedBranches: ["Mechanical"], maxBacklogs: 0, graduationYear: 2027,
          deadline: new Date(Date.now() + 86400000 * 5)
        }
      });
      otherDriveId = mechDrive.id;
      const csDrive = await prisma.placementDrive.create({
        data: {
          company: { connect: { name: "Google" } }, role: "Data Engineer", package: 12, location: "Pune", jobType: "FULL_TIME",
          description: "Data engineering role", minCgpa: 6, allowedBranches: ["Computer Science"], maxBacklogs: 0, graduationYear: 2027,
          deadline: new Date(Date.now() + 86400000 * 5)
        }
      });
      const csApp = await prisma.application.create({ data: { studentId, driveId: csDrive.id, timeline: [] } });
      csApplicationId = csApp.id;
      const otherApp = await prisma.application.create({ data: { studentId: mech.student!.id, driveId: mechDrive.id, timeline: [] } });
      otherApplicationId = otherApp.id;
    });

    it("lists and edits only students of their own department", async () => {
      const list = await request(app).get("/api/auth/students").set("Authorization", `Bearer ${tpcToken}`);
      expect(list.status).toBe(200);
      expect(list.body.length).toBeGreaterThan(0);
      expect(list.body.every((row: any) => row.branch === "Computer Science")).toBe(true);

      const created = await prisma.user.create({
        data: { email: "edit.me@example.com", role: "STUDENT", student: { create: { name: "Edit Me", branch: "Computer Science", cgpa: 0, graduationYear: 2027, skills: [], onboarded: false } } },
        include: { student: true }
      });
      const own = { id: created.student!.id };
      const edited = await request(app).patch(`/api/auth/students/${own.id}`).set("Authorization", `Bearer ${tpcToken}`).send({ cgpa: 8.4, backlogs: 1 });
      expect(edited.status).toBe(200);
      expect(edited.body.cgpa).toBe(8.4);
      expect(edited.body.onboarded).toBe(true);

      const moved = await request(app).patch(`/api/auth/students/${own.id}`).set("Authorization", `Bearer ${tpcToken}`).send({ branch: "Mechanical" });
      expect(moved.status).toBe(403);

      const mech = await prisma.student.findFirstOrThrow({ where: { branch: "Mechanical" } });
      const outside = await request(app).patch(`/api/auth/students/${mech.id}`).set("Authorization", `Bearer ${tpcToken}`).send({ cgpa: 9 });
      expect(outside.status).toBe(404);

      const asStudent = await request(app).get("/api/auth/students").set("Authorization", `Bearer ${studentToken}`);
      expect(asStudent.status).toBe(403);
    });

    it("only lists applications of their own department", async () => {
      const response = await request(app).get("/api/applications").set("Authorization", `Bearer ${tpcToken}`);
      expect(response.status).toBe(200);
      const ids = response.body.items.map((item: any) => item.id);
      expect(ids).toContain(csApplicationId);
      expect(ids).not.toContain(otherApplicationId);
    });

    it("cannot change the status of another department's application", async () => {
      const response = await request(app)
        .patch(`/api/applications/${otherApplicationId}/status`)
        .set("Authorization", `Bearer ${tpcToken}`)
        .send({ status: "SHORTLISTED" });
      expect(response.status).toBe(403);
    });

    it("cannot edit or delete another department's drive", async () => {
      const patch = await request(app).patch(`/api/drives/${otherDriveId}`).set("Authorization", `Bearer ${tpcToken}`).send({ role: "Hacked" });
      expect(patch.status).toBe(403);
      const del = await request(app).delete(`/api/drives/${otherDriveId}`).set("Authorization", `Bearer ${tpcToken}`);
      expect(del.status).toBe(403);
    });

    it("only sees their department's drives and is forced to publish drives for it", async () => {
      const list = await request(app).get("/api/drives").set("Authorization", `Bearer ${tpcToken}`);
      expect(list.body.map((d: any) => d.id)).not.toContain(otherDriveId);
      const created = await request(app).post("/api/drives").set("Authorization", `Bearer ${tpcToken}`).send({
        company: { name: "Acme" }, role: "Developer", package: 6, location: "Pune", jobType: "FULL_TIME",
        description: "Developer role at Acme", minCgpa: 6, allowedBranches: ["Mechanical", "Civil"], maxBacklogs: 0,
        graduationYear: 2027, deadline: new Date(Date.now() + 86400000 * 9).toISOString()
      });
      expect(created.status).toBe(201);
      expect(created.body.allowedBranches).toEqual(["Computer Science"]);
    });

    it("admin can invite a TPC for a department", async () => {
      const response = await request(app).post("/api/auth/users/tpc").set("Authorization", `Bearer ${adminToken}`)
        .send({ email: "tpc.civil@example.com", name: "Civil TPC", department: "Civil" });
      expect(response.status).toBe(201);
      expect(response.body.role).toBe("TPC");
      expect(response.body.coordinator.department).toBe("Civil");
    });

    it("a TPC cannot invite other TPCs", async () => {
      const response = await request(app).post("/api/auth/users/tpc").set("Authorization", `Bearer ${tpcToken}`)
        .send({ email: "x@example.com", name: "X Person", department: "Civil" });
      expect(response.status).toBe(403);
    });
  });

  describe("POST /api/auth/bulk-import", () => {
    it("imports CSV of students successfully", async () => {
      const csvData = "name,email,branch,cgpa,graduationYear,backlogs,skills\n" +
        "Rahul Sharma,rahul@placetrack.ai,Computer Engineering,8.5,2027,0,\"Java, SQL, React\"\n" +
        "Priya Patel,priya@placetrack.ai,Information Technology,7.9,2027,1,\"Python, HTML, CSS\"";

      const response = await request(app)
        .post("/api/auth/bulk-import")
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("file", Buffer.from(csvData), "students.csv");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        created: 2,
        failed: 0,
        errors: []
      });

      const rahul = await prisma.student.findFirst({ where: { name: "Rahul Sharma" } });
      expect(rahul).toBeDefined();
      expect(rahul!.cgpa).toBe(8.5);
      expect(rahul!.skills).toContain("Java");
    });

    it("returns errors for rows with validation failures", async () => {
      const csvData = "name,email,branch,cgpa,graduationYear,backlogs,skills\n" +
        "Invalid Student,invalid-email,Computer Engineering,8.5,2027,0,Java\n" +
        "Bad CGPA,bad-cgpa@example.com,Computer Engineering,12.5,2027,0,Java";

      const response = await request(app)
        .post("/api/auth/bulk-import")
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("file", Buffer.from(csvData), "students.csv");

      expect(response.body.created).toBe(0);
      expect(response.body.failed).toBe(2);
      expect(response.body.errors.length).toBe(2);
    });

    it("returns 403 for student role attempts", async () => {
      const csvData = "name,email,branch,cgpa,graduationYear,backlogs,skills\n" +
        "Rahul Sharma,rahul2@placetrack.ai,Computer Engineering,8.5,2027,0,\"Java, SQL, React\"";

      const response = await request(app)
        .post("/api/auth/bulk-import")
        .set("Authorization", `Bearer ${studentToken}`)
        .attach("file", Buffer.from(csvData), "students.csv");

      expect(response.status).toBe(403);
    });
  });

  describe("GET /api/drives", () => {
    it("returns list of drives for student", async () => {
      const response = await request(app)
        .get("/api/drives")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      const engDrive = response.body.find((d: any) => d.id === driveId);
      expect(engDrive).toBeDefined();
      expect(engDrive.company.name).toBe("Google");
    });

    it("returns 401 if unauthenticated", async () => {
      const response = await request(app).get("/api/drives");
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/drives/companies/:id/logo", () => {
    it("uploads company logo successfully", async () => {
      const company = await prisma.company.findFirst();
      expect(company).toBeDefined();

      const response = await request(app)
        .post(`/api/drives/companies/${company!.id}/logo`)
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("logo", Buffer.from("fake-image-data-png"), "logo.png");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("logo");
      expect(response.body.logo).toContain("/uploads/");
    });

    it("returns 400 for invalid file type", async () => {
      const company = await prisma.company.findFirst();
      const response = await request(app)
        .post(`/api/drives/companies/${company!.id}/logo`)
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("logo", Buffer.from("fake-text-data"), "logo.txt");

      expect(response.status).toBe(400);
    });

    it("returns 403 for unauthorized upload attempts", async () => {
      const company = await prisma.company.findFirst();
      const response = await request(app)
        .post(`/api/drives/companies/${company!.id}/logo`)
        .set("Authorization", `Bearer ${studentToken}`)
        .attach("logo", Buffer.from("fake-image-data-png"), "logo.png");

      expect(response.status).toBe(403);
    });
  });

  describe("POST /api/applications", () => {
    it("submits application successfully if eligible", async () => {
      const response = await request(app)
        .post("/api/applications")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ driveId });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.studentId).toBe(studentId);
      expect(response.body.driveId).toBe(driveId);
      applicationId = response.body.id;
    });

    it("returns 422 for ineligible drive applications", async () => {
      const response = await request(app)
        .post("/api/applications")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ driveId: ineligibleDriveId });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe("Not eligible");
    });
  });

  describe("PATCH /api/applications/:id/status", () => {
    it("updates application status successfully by admin/coordinator", async () => {
      const response = await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          status: "SHORTLISTED",
          note: "Passed initial screening"
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("SHORTLISTED");
    });

    it("returns 403 for unauthorized status changes", async () => {
      const response = await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ status: "SHORTLISTED" });

      expect(response.status).toBe(403);
    });
  });

  describe("GET /api/applications", () => {
    it("returns paginated applications with envelope for admin", async () => {
      const response = await request(app)
        .get("/api/applications?page=1&limit=5")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("total");
      expect(response.body).toHaveProperty("pages");
      expect(response.body).toHaveProperty("page", 1);
      expect(response.body).toHaveProperty("limit", 5);
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    it("filters applications by status", async () => {
      const response = await request(app)
        .get("/api/applications?status=SHORTLISTED")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items.every((item: any) => item.status === "SHORTLISTED")).toBe(true);
    });

    it("restricts student to only their own applications", async () => {
      const response = await request(app)
        .get("/api/applications")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      // All returned items must belong to the logged-in student's studentId
      expect(response.body.items.every((item: any) => item.student.userId === studentUserId)).toBe(true);
    });
  });

  describe("GET /api/reports/analytics", () => {
    it("returns analytics grouping to coordinator/admin", async () => {
      const response = await request(app)
        .get("/api/reports/analytics")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("historicalTrends");
      expect(response.body).toHaveProperty("packageDistribution");
    });

    it("returns 403 to student role", async () => {
      const response = await request(app)
        .get("/api/reports/analytics")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe("PATCH /api/auth/profile", () => {
    it("allows student to self-update their profile details and recalculates readiness score", async () => {
      const response = await request(app)
        .patch("/api/auth/profile")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          skills: ["React", "Node.js", "TypeScript", "Docker"],
          linkedinUrl: "https://www.linkedin.com/in/teststudent",
          projects: ["Campus placement tracker", "Smart attendance app", "Portfolio site"],
          internships: ["Summer intern at Acme"]
        });

      expect(response.status).toBe(200);
      expect(response.body.linkedinUrl).toBe("https://www.linkedin.com/in/teststudent");
      expect(response.body.projectsCount).toBe(3);
      expect(response.body.projectNames).toEqual(["Campus placement tracker", "Smart attendance app", "Portfolio site"]);
      expect(response.body.internshipsCount).toBe(1);
      expect(response.body.internshipNames).toEqual(["Summer intern at Acme"]);
      expect(response.body.skills).toEqual(["React", "Node.js", "TypeScript", "Docker"]);
      expect(response.body.readinessScore).toBeGreaterThan(0);
    });

    it("only accepts a real LinkedIn link", async () => {
      for (const bad of ["https://example.com/in/someone", "http://linkedin.com/in/x", "linkedin.com/in/x"]) {
        const res = await request(app).patch("/api/auth/profile").set("Authorization", `Bearer ${studentToken}`).send({ linkedinUrl: bad });
        expect(res.status).toBe(400);
      }
    });

    it("validates fields (e.g. invalid url fails with 400)", async () => {
      const response = await request(app)
        .patch("/api/auth/profile")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          linkedinUrl: "not-a-valid-url"
        });

      expect(response.status).toBe(400);
    });

    it("blocks coordinators from accessing student self-update profile endpoint", async () => {
      const response = await request(app)
        .patch("/api/auth/profile")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          skills: ["Python"]
        });

      expect(response.status).toBe(403);
    });
  });

  describe("Deadline Reminders Cron Job", () => {
    it("runs and creates in-app notifications for upcoming deadlines and dates within 24h", async () => {
      const { runDeadlineReminders } = await import("../src/jobs/deadlineReminder.js");
      const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000);
      
      const testDrive = await prisma.placementDrive.create({
        data: {
          company: {
            create: {
              name: "CronCorp",
              description: "Test company for cron job"
            }
          },
          role: "Developer",
          package: 10,
          location: "Remote",
          jobType: "Full-time",
          description: "Cron test drive description...",
          minCgpa: 6.0,
          allowedBranches: ["Computer Engineering"],
          maxBacklogs: 2,
          graduationYear: 2027,
          deadline: tomorrow,
          testDate: tomorrow,
          interviewDate: tomorrow,
          status: "OPEN"
        },
        include: { company: true }
      });

      const appRecord = await prisma.application.create({
        data: {
          studentId,
          driveId: testDrive.id,
          status: "APPLIED",
          timeline: []
        }
      });

      await prisma.notification.deleteMany({ where: { userId: studentUserId } });

      await runDeadlineReminders();

      const notifications = await prisma.notification.findMany({
        where: { userId: studentUserId }
      });

      expect(notifications.length).toBe(3);

      const deadlineNotify = notifications.find(n => n.title === "Deadline Reminder");
      expect(deadlineNotify).toBeDefined();
      expect(deadlineNotify!.message).toContain("CronCorp");

      const testNotify = notifications.find(n => n.title === "Test Reminder");
      expect(testNotify).toBeDefined();
      expect(testNotify!.message).toContain("Test for CronCorp");

      const interviewNotify = notifications.find(n => n.title === "Interview Reminder");
      expect(interviewNotify).toBeDefined();
      expect(interviewNotify!.message).toContain("Interview for CronCorp");
    });
  });

  describe("Centralized Error Handler Middleware", () => {
    it("returns VALIDATION_ERROR for Zod validation errors", async () => {
      const response = await request(app)
        .post("/api/auth/google")
        .send({ credential: "short" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.code).toBe("VALIDATION_ERROR");
    });

    it("returns UNIQUE_CONSTRAINT_VIOLATION for Prisma unique violation", async () => {
      const response = await request(app)
        .get("/api/tests/debug-error/unique")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error");
      expect(response.body.code).toBe("UNIQUE_CONSTRAINT_VIOLATION");
    });

    it("returns NOT_FOUND for Prisma record not found", async () => {
      const response = await request(app)
        .get("/api/tests/debug-error/notfound")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(response.body.code).toBe("NOT_FOUND");
    });
  });

  describe("mock test upload", () => {
    const csv = "Section,Question,Option A,Option B,Option C,Option D,Correct,Explanation\nLogical,What comes after 2 4 6?,7,8,9,10,B,Add 2\n";
    it("blocks students", async () => {
      const response = await request(app).post("/api/tests/import").set("Authorization", `Bearer ${studentToken}`)
        .field("title", "Upload mock").field("duration", "30").attach("file", Buffer.from(csv), "q.csv");
      expect(response.status).toBe(403);
    });
    it("previews, rejects bad rows and saves a valid file", async () => {
      const auth = { Authorization: `Bearer ${adminToken}` };
      const preview = await request(app).post("/api/tests/import?preview=1").set(auth).attach("file", Buffer.from(csv), "q.csv");
      expect(preview.status).toBe(200);
      expect(preview.body.count).toBe(1);
      const bad = await request(app).post("/api/tests/import").set(auth).field("title", "Bad upload").field("duration", "30")
        .attach("file", Buffer.from(csv.replace(",B,", ",Q,")), "q.csv");
      expect(bad.status).toBe(422);
      expect(bad.body.errors[0]).toMatch(/Row 2/);
      const saved = await request(app).post("/api/tests/import").set(auth).field("title", "Upload mock").field("duration", "30").attach("file", Buffer.from(csv), "q.csv");
      expect(saved.status).toBe(201);
      expect(saved.body.count).toBe(1);
      const template = await request(app).get("/api/tests/template").set(auth);
      expect(template.status).toBe(200);
    });
  });

  describe("coordinator reports", () => {
    it("blocks students from reports and lets admin read the department overview", async () => {
      const blocked = await request(app).get("/api/reports/department-overview").set("Authorization", `Bearer ${studentToken}`);
      expect(blocked.status).toBe(403);
      const overview = await request(app).get("/api/reports/department-overview").set("Authorization", `Bearer ${adminToken}`);
      expect(overview.status).toBe(200);
      expect(overview.body).toHaveProperty("placementRate");
      expect(Array.isArray(overview.body.atRisk)).toBe(true);
    });
  });
});
