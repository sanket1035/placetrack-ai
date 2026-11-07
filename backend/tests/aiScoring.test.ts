import request from "supertest";
import { app } from "../src/server.js";
import { prisma } from "../src/lib/prisma.js";
import { signToken } from "../src/middleware/auth.js";
import { pdfItemsToText } from "../src/routes/ai.routes.js";
import { analyzeResume, ResumeTextError } from "../src/services/resumeScoring.js";
import { evaluateAnswerHeuristic } from "../src/services/answerEvaluation.js";

const GOOD_RESUME = `Sanket Chaudhari
sanket@example.com | +91 98765 43210 | github.com/sanket | linkedin.com/in/sanket
Education
B.Tech in Computer Engineering, KKWagh Institute of Engineering, 2022 - 2026, CGPA 8.4/10
Skills
JavaScript, TypeScript, React, Node.js, Express, PostgreSQL, MongoDB, Docker, Git, AWS, Python, SQL, Data Structures, Algorithms
Experience
Software Developer Intern, Acme Corp, Jun 2025 - Aug 2025
- Built REST APIs in Node.js serving 5000+ users and reduced response time by 35%
- Deployed services on AWS using Docker and CI/CD pipelines
- Collaborated with a team of 6 engineers to ship 4 features
Projects
PlaceTrack AI - placement management platform (React, Node.js, PostgreSQL) github.com/sanket/placetrack
- Designed role based access for 3 user roles and implemented Google sign in
- Optimised queries to cut dashboard load time by 40%
Certifications
AWS Cloud Practitioner, NPTEL DSA course, Winner of college hackathon 2025`;

describe("resume scoring", () => {
  it("scores a real resume from its content, never 100", () => {
    const result = analyzeResume(GOOD_RESUME);
    expect(result.score).toBeGreaterThan(60);
    expect(result.score).toBeLessThan(100);
    expect(result.categories.reduce((sum, item) => sum + item.score, 0)).toBe(result.score);
    expect(result.skills).toContain("react");
    expect(result.skills).not.toContain("java"); // "javascript" must not count as "java"
    expect(result.contactComplete).toBe(true);
  });

  it("does not reward keyword stuffing", () => {
    const stuffed = Array(40).fill("javascript typescript react node.js python java sql aws docker git").join(" ");
    expect(analyzeResume(stuffed).score).toBeLessThan(30);
  });

  it("scores a thin resume low and gives suggestions", () => {
    const thin = analyzeResume("Name: Ravi. Education: BE computer. Skills: C, Java. I am hardworking and want a job in a good company with growth opportunities and a learning environment for my career. Email ravi@x.com. Phone 9876543210. Hobbies: cricket, music, travelling, reading books and watching movies on weekends with friends and family at home.");
    expect(thin.score).toBeLessThan(40);
    expect(thin.suggestions.length).toBeGreaterThan(2);
    expect(thin.weakSections.length).toBeGreaterThan(0);
  });

  it("rejects empty or near-empty text", () => {
    expect(() => analyzeResume("")).toThrow(ResumeTextError);
    expect(() => analyzeResume("hello")).toThrow(ResumeTextError);
  });
});

describe("PDF text extraction keeps line structure", () => {
  it("starts a new line at line ends and when the vertical position changes, so headings stay on their own line", () => {
    const at = (str: string, y: number, hasEOL = false) => ({ str, hasEOL, transform: [1, 0, 0, 1, 0, y] });
    const text = pdfItemsToText([
      at("PROJECTS", 524), at("", 505, true),
      at("Carbonomics AI", 505), at(" ", 505), at("(Final Year Project)", 505), at("", 494, true),
      at("Tech Stack: Python, FastAPI", 494),
      at("EXPERIENCE", 480)
    ]);
    expect(text.split("\n")).toEqual(["PROJECTS", "Carbonomics AI (Final Year Project)", "Tech Stack: Python, FastAPI", "EXPERIENCE"]);
  });

  it("scores a resume whose sections were rebuilt from PDF items", () => {
    const at = (str: string, y: number) => ({ str, hasEOL: true, transform: [1, 0, 0, 1, 0, y] });
    const lines = GOOD_RESUME.split("\n");
    const text = pdfItemsToText(lines.map((line, index) => at(line, 800 - index * 12)));
    expect(analyzeResume(text).score).toBe(analyzeResume(GOOD_RESUME).score);
  });
});

describe("interview answer evaluation", () => {
  const question = "What is the difference between a process and a thread?";
  const modelAnswer = "A process is an independent program in execution with its own memory space and resources. A thread is a lightweight unit of execution inside a process that shares the process memory and resources with other threads. Context switching between threads is cheaper than between processes, but shared memory needs synchronization to avoid race conditions.";
  const score = (answer: string, reference?: string) => evaluateAnswerHeuristic({ question, answer, modelAnswer: reference }).score;

  it("separates correct, partial, irrelevant and empty answers across the 0-10 range", () => {
    const correct = score("A process is an independent program in execution with its own separate memory space. A thread is a lightweight unit of execution within a process, and threads in the same process share memory and resources. Because of that, switching between threads is cheaper than process context switching, but shared memory requires synchronization such as locks to avoid race conditions. For example, a browser can run each tab as a process while threads handle network calls inside a tab.", modelAnswer);
    const partial = score("A process is a running program and a thread is part of a process that shares memory.", modelAnswer);
    const irrelevant = score("I like playing cricket on weekends and my favourite colour is blue, also pizza is nice.", modelAnswer);
    const gibberish = score("asdf qwrt zxcv hjkl asdf qwrt zxcv hjkl asdf qwrt zxcv", modelAnswer);
    expect(correct).toBeGreaterThanOrEqual(8);
    expect(partial).toBeGreaterThan(irrelevant);
    expect(correct).toBeGreaterThan(partial);
    expect(irrelevant).toBeLessThanOrEqual(2);
    expect(gibberish).toBeLessThanOrEqual(1);
    expect(score("", modelAnswer)).toBe(0);
  });

  it("does not use a fixed score by answer length", () => {
    const longOffTopic = score("My favourite food is pizza and I enjoy cricket and music on the weekend with my friends. " .repeat(6));
    const shortOnTopic = score("A process has its own memory but threads inside a process share memory, so thread switching is cheaper.");
    expect(shortOnTopic).toBeGreaterThan(longOffTopic);
  });

  it("is consistent for the same answer and never claims verified accuracy without a reference", () => {
    const answer = "A thread shares memory with other threads in the same process, while processes are isolated.";
    expect(score(answer)).toBe(score(answer));
    const result = evaluateAnswerHeuristic({ question, answer });
    expect(result.verified).toBe(false);
    expect(result.score).toBeLessThanOrEqual(7.5);
  });
});

describe("AI routes", () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: "ai-test@example.com", name: "AI Tester", role: "STUDENT" } });
    userId = user.id;
    token = signToken(user.id, "STUDENT");
  });

  afterAll(async () => {
    await prisma.resumeAnalysis.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("analyzes an uploaded TXT resume with category scores", async () => {
    const response = await request(app).post("/api/ai/resume/upload").set("Authorization", `Bearer ${token}`)
      .attach("resume", Buffer.from(GOOD_RESUME), "resume.txt");
    expect(response.status).toBe(200);
    expect(response.body.score).toBeGreaterThan(60);
    expect(response.body.score).toBeLessThan(100);
    expect(response.body.categories).toHaveLength(7);
  });

  it("rejects empty, unsupported and corrupted files", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const empty = await request(app).post("/api/ai/resume/upload").set(auth).attach("resume", Buffer.from(""), "empty.txt");
    const exe = await request(app).post("/api/ai/resume/upload").set(auth).attach("resume", Buffer.from("MZ"), "virus.exe");
    const badPdf = await request(app).post("/api/ai/resume/upload").set(auth).attach("resume", Buffer.from("this is not a pdf at all"), "fake.pdf");
    const badDocx = await request(app).post("/api/ai/resume/upload").set(auth).attach("resume", Buffer.from("not a zip"), "fake.docx");
    for (const result of [empty, exe, badPdf, badDocx]) {
      expect(result.status).toBe(422);
      expect(result.body.error).toBeTruthy();
    }
  });

  it("returns a content-based evaluation with dimensions", async () => {
    const response = await request(app).post("/api/ai/interview/feedback").set("Authorization", `Bearer ${token}`)
      .send({ question: "Explain database indexing and when it can hurt performance.", answer: "An index is a data structure such as a B-tree that speeds up lookups on a column. It can hurt write performance because every insert and update must also maintain the index, and it uses extra storage." });
    expect(response.status).toBe(200);
    expect(response.body.dimensions).toHaveLength(6);
    expect(response.body.score).toBeGreaterThan(0);
    expect(response.body.score).toBeLessThanOrEqual(10);
    expect(["ai", "heuristic"]).toContain(response.body.source);
  });
});

describe("aptitude starter bank", () => {
  let adminToken: string;
  let studentToken: string;
  const ids: string[] = [];

  beforeAll(async () => {
    const admin = await prisma.user.create({ data: { email: "apt-admin@example.com", name: "Admin", role: "ADMIN" } });
    const student = await prisma.user.create({
      data: {
        email: "apt-student@example.com", name: "Student", role: "STUDENT",
        student: { create: { name: "Student", branch: "CSE", cgpa: 8, graduationYear: 2026, skills: [] } }
      }
    });
    ids.push(admin.id, student.id);
    adminToken = signToken(admin.id, "ADMIN");
    studentToken = signToken(student.id, "STUDENT");
    await prisma.aptitudeTest.deleteMany({ where: { title: { startsWith: "Placement Aptitude Mock" } } });
  });

  afterAll(async () => {
    await prisma.aptitudeTest.deleteMany({ where: { title: { startsWith: "Placement Aptitude Mock" } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  it("only an admin can load the starter bank, and loading twice does not duplicate", async () => {
    const forbidden = await request(app).post("/api/tests/starter-bank").set("Authorization", `Bearer ${studentToken}`);
    expect(forbidden.status).toBe(403);
    const first = await request(app).post("/api/tests/starter-bank").set("Authorization", `Bearer ${adminToken}`);
    expect(first.status).toBe(201);
    expect(first.body.created).toHaveLength(2);
    const second = await request(app).post("/api/tests/starter-bank").set("Authorization", `Bearer ${adminToken}`);
    expect(second.body.created).toHaveLength(0);
  });

  it("shows every question, hides answers, and grades with a breakdown and review", async () => {
    const list = await request(app).get("/api/tests").set("Authorization", `Bearer ${studentToken}`);
    const mock = list.body.find((test: any) => test.title === "Placement Aptitude Mock 1");
    expect(mock._count.questions).toBe(30);

    const detail = await request(app).get(`/api/tests/${mock.id}`).set("Authorization", `Bearer ${studentToken}`);
    expect(detail.body.questions).toHaveLength(30);
    expect(detail.body.questions[0]).not.toHaveProperty("correctAnswer");
    for (const question of detail.body.questions) expect(question.options).toHaveLength(4);

    // Answer the first 10 correctly (looked up server-side) and leave the rest blank.
    const stored = await prisma.question.findMany({ where: { testId: mock.id } });
    const answers: Record<string, number> = {};
    for (const question of stored.slice(0, 10)) answers[question.id] = question.correctAnswer;
    const result = await request(app).post(`/api/tests/${mock.id}/submit`).set("Authorization", `Bearer ${studentToken}`).send({ answers });
    expect(result.status).toBe(200);
    expect(result.body.score).toBe(10);
    expect(result.body.attempted).toBe(10);
    expect(result.body.unanswered).toBe(20);
    expect(result.body.accuracy).toBe(33);
    expect(result.body.review).toHaveLength(30);
    expect(Object.keys(result.body.sectionScores).sort()).toEqual(["Logical", "Quantitative", "Verbal"]);
  });
});

describe("student onboarding and profile lock", () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: "onboard@example.com", name: "New Student", role: "STUDENT",
        student: { create: { name: "New Student", branch: "Undeclared", cgpa: 0, graduationYear: 2027, skills: [], onboarded: false } }
      }
    });
    userId = user.id;
    token = signToken(user.id, "STUDENT");
  });

  afterAll(async () => { await prisma.user.delete({ where: { id: userId } }); });

  it("requires department, CGPA and year on first save, then locks them", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const incomplete = await request(app).patch("/api/auth/me/student").set(auth).send({ skills: ["react"] });
    expect(incomplete.status).toBe(400);

    const saved = await request(app).patch("/api/auth/me/student").set(auth)
      .send({ name: "New Student", branch: "Computer Engineering", cgpa: 8.1, graduationYear: 2027, skills: ["react"] });
    expect(saved.status).toBe(200);
    expect(saved.body.onboarded).toBe(true);

    const inflate = await request(app).patch("/api/auth/me/student").set(auth).send({ cgpa: 9.9 });
    expect(inflate.status).toBe(403);

    const allowed = await request(app).patch("/api/auth/profile").set(auth).send({ phone: "9876543210", skills: ["react", "sql"] });
    expect(allowed.status).toBe(200);
    expect(allowed.body.phone).toBe("9876543210");
    expect(allowed.body.cgpa).toBe(8.1);
  });
});

describe("role is read from the database on every request", () => {
  it("applies a role change immediately and rejects deleted accounts", async () => {
    const user = await prisma.user.create({ data: { email: "rbac@example.com", name: "Rbac", role: "ADMIN" } });
    const token = signToken(user.id, "ADMIN");
    const auth = { Authorization: `Bearer ${token}` };

    expect((await request(app).get("/api/auth/users").set(auth)).status).toBe(200);

    // Demoted in the database: the still-valid ADMIN token must stop working as admin.
    await prisma.user.update({ where: { id: user.id }, data: { role: "STUDENT" } });
    expect((await request(app).get("/api/auth/users").set(auth)).status).toBe(403);

    await prisma.user.delete({ where: { id: user.id } });
    expect((await request(app).get("/api/auth/me").set(auth)).status).toBe(401);
  });

  it("rejects a missing or invalid token", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set("Authorization", "Bearer nonsense")).status).toBe(401);
  });
});
