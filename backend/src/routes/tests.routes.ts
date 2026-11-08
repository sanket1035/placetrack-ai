import { Router } from "express";
import { UserRole, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { audit } from "../lib/audit.js";
import { authenticate, authorize } from "../middleware/auth.js";
import multer from "multer";
import { STARTER_TESTS } from "../data/aptitudeBank.js";
import { buildTemplate, parseQuestionRows, readRows } from "../services/testImport.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.(xlsx|csv)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error("Upload an .xlsx or .csv file") as never, false);
  }
});

export const testsRouter = Router();
testsRouter.use(authenticate);

testsRouter.get("/", async (_request, response) => {
  const tests = await prisma.aptitudeTest.findMany({
    include: { _count: { select: { questions: true, results: true } } },
    orderBy: { createdAt: "desc" }
  });
  response.json(tests);
});

// Admin-only, idempotent: creates the starter mock tests that do not exist yet (matched by title).
testsRouter.post("/starter-bank", authorize(UserRole.ADMIN), async (request, response) => {
  const existing = new Set((await prisma.aptitudeTest.findMany({ select: { title: true } })).map((test) => test.title));
  const created: string[] = [];
  for (const test of STARTER_TESTS) {
    if (existing.has(test.title)) continue;
    await prisma.aptitudeTest.create({
      data: { title: test.title, duration: test.duration, sectionConfig: test.sectionConfig, questions: { create: test.questions } }
    });
    created.push(test.title);
  }
  await audit(request.auth!.userId, "CREATE", "aptitude-starter-bank", { created });
  response.status(created.length ? 201 : 200).json({ created, skipped: STARTER_TESTS.length - created.length });
});

// Excel template for TPC/Admin to fill in.
testsRouter.get("/template", authorize(UserRole.TPC, UserRole.ADMIN), async (_request, response) => {
  const buffer = await buildTemplate();
  response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  response.setHeader("Content-Disposition", 'attachment; filename="mock-test-template.xlsx"');
  response.send(buffer);
});

// Create a mock test from an Excel/CSV file. With ?preview=1 nothing is saved, the file is only checked.
testsRouter.post("/import", authorize(UserRole.TPC, UserRole.ADMIN), upload.single("file"), async (request, response) => {
  if (!request.file) return response.status(400).json({ error: "Choose an .xlsx or .csv file." });
  const preview = request.query.preview === "1";
  const title = String(request.body.title ?? "").trim();
  const duration = Number(request.body.duration);
  if (!preview) {
    if (title.length < 3) return response.status(400).json({ error: "Enter a test title (at least 3 characters)." });
    if (!Number.isInteger(duration) || duration < 1 || duration > 300) return response.status(400).json({ error: "Duration must be between 1 and 300 minutes." });
  }
  let rows: string[][];
  try {
    rows = await readRows(request.file.buffer, request.file.originalname);
  } catch {
    return response.status(400).json({ error: "Could not read the file. Use the template (.xlsx) or a UTF-8 .csv." });
  }
  const { questions, errors, sectionConfig } = parseQuestionRows(rows);
  if (preview || errors.length || questions.length === 0) {
    return response.status(errors.length || !questions.length ? 422 : 200).json({ ok: errors.length === 0 && questions.length > 0, count: questions.length, sectionConfig, errors });
  }
  const test = await prisma.aptitudeTest.create({
    data: { title, duration, sectionConfig, questions: { create: questions } }
  });
  await audit(request.auth!.userId, "CREATE", "aptitude-test-import", { testId: test.id, count: questions.length });
  response.status(201).json({ ok: true, id: test.id, count: questions.length, sectionConfig, errors: [] });
});

testsRouter.get("/:id", async (request, response) => {
  const test = await prisma.aptitudeTest.findUnique({
    where: { id: String(request.params.id) },
    include: { questions: { select: { id: true, section: true, questionText: true, options: true } } }
  });
  if (!test) return response.status(404).json({ error: "Test not found" });
  response.json(test);
});

testsRouter.post("/", authorize(UserRole.TPC, UserRole.ADMIN), async (request, response) => {
  const input = z.object({
    title: z.string().min(3), duration: z.number().int().positive(),
    sectionConfig: z.record(z.string(), z.number()),
    questions: z.array(z.object({
      section: z.string(), questionText: z.string(), options: z.array(z.string()).length(4),
      correctAnswer: z.number().int().min(0).max(3), explanation: z.string()
    })).min(1)
  }).parse(request.body);
  const test = await prisma.aptitudeTest.create({
    data: { title: input.title, duration: input.duration, sectionConfig: input.sectionConfig, questions: { create: input.questions } },
    include: { questions: true }
  });
  await audit(request.auth!.userId, "CREATE", "aptitude-test", { testId: test.id });
  response.status(201).json(test);
});

testsRouter.post("/:id/submit", authorize(UserRole.STUDENT), async (request, response) => {
  const { answers } = z.object({ answers: z.record(z.string(), z.number().int().min(0).max(3)) }).parse(request.body);
  const [student, test] = await Promise.all([
    prisma.student.findUnique({ where: { userId: request.auth!.userId } }),
    prisma.aptitudeTest.findUnique({ where: { id: String(request.params.id) }, include: { questions: true } })
  ]);
  if (!student || !test) return response.status(404).json({ error: "Student or test not found" });
  if (!test.questions.length) return response.status(409).json({ error: "This test has no questions yet." });
  const section = new Map<string, { correct: number; total: number }>();
  let correct = 0;
  let attempted = 0;
  const review = test.questions.map((question) => {
    const chosen = answers[question.id];
    const isCorrect = chosen === question.correctAnswer;
    const stat = section.get(question.section) ?? { correct: 0, total: 0 };
    stat.total++;
    if (chosen !== undefined) attempted++;
    if (isCorrect) { stat.correct++; correct++; }
    section.set(question.section, stat);
    return {
      questionId: question.id, section: question.section, questionText: question.questionText, options: question.options,
      chosen: chosen ?? null, correctAnswer: question.correctAnswer, isCorrect, explanation: question.explanation
    };
  });
  const sectionScores = Object.fromEntries([...section].map(([name, stat]) => [name, Math.round(stat.correct / stat.total * 100)]));
  const accuracy = Math.round(correct / test.questions.length * 100);
  const strongAreas = Object.entries(sectionScores).filter(([, score]) => score >= 70).map(([name]) => name);
  const weakAreas = Object.entries(sectionScores).filter(([, score]) => score < 60).map(([name]) => name);
  const result = await prisma.testResult.upsert({
    where: { studentId_testId: { studentId: student.id, testId: test.id } },
    create: { studentId: student.id, testId: test.id, score: correct, accuracy, sectionScores, strongAreas, weakAreas },
    update: { score: correct, accuracy, sectionScores, strongAreas, weakAreas, completedAt: new Date() }
  });
  await prisma.student.update({ where: { id: student.id }, data: { mockTestCount: { increment: 1 } } });
  await audit(request.auth!.userId, "SUBMIT", "aptitude-test", { testId: test.id, accuracy });
  response.json({ ...result, totalQuestions: test.questions.length, attempted, unanswered: test.questions.length - attempted, review });
});

testsRouter.get("/debug-error/:type", async (request, response) => {
  const { type } = request.params;
  if (type === "unique") {
    throw new Prisma.PrismaClientKnownRequestError("Duplicate key", {
      code: "P2002",
      clientVersion: "6.19.3"
    });
  }
  if (type === "notfound") {
    throw new Prisma.PrismaClientKnownRequestError("Record not found", {
      code: "P2025",
      clientVersion: "6.19.3"
    });
  }
  if (type === "general") {
    throw new Error("Generic error message");
  }
  response.json({ ok: true });
});
