import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { generateSingleQuestionSmart, evaluateAttemptSmart } from "../services/ai.js";

export const questionsRouter = Router();
questionsRouter.use(authenticate);

// GET /api/questions — List and filter questions
questionsRouter.get("/", async (request, response) => {
  const filterSchema = z.object({
    role: z.string().optional(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
    category: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(5)
  });

  const { role, difficulty, category, page, limit } = filterSchema.parse(request.query);
  const skip = (page - 1) * limit;

  const where: any = {};
  if (role) {
    where.role = { contains: role, mode: "insensitive" };
  }
  if (difficulty) {
    where.difficulty = { equals: difficulty };
  }
  if (category) {
    where.category = { contains: category, mode: "insensitive" };
  }

  const [total, items] = await Promise.all([
    prisma.interviewQuestion.count({ where }),
    prisma.interviewQuestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        attempts: {
          where: { userId: request.auth!.userId },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    })
  ]);

  response.json({
    total,
    pages: Math.ceil(total / limit),
    page,
    limit,
    items
  });
});

// POST /api/questions/generate — Generate a new question using Gemini AI
questionsRouter.post("/generate", async (request, response) => {
  const bodySchema = z.object({
    role: z.string().min(2),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"])
  });

  const { role, difficulty } = bodySchema.parse(request.body);

  const aiQuestion = await generateSingleQuestionSmart(role, difficulty);

  const question = await prisma.interviewQuestion.create({
    data: {
      role,
      difficulty,
      category: aiQuestion.category || "Technical",
      question: aiQuestion.question,
      modelAnswer: aiQuestion.modelAnswer
    }
  });

  response.status(201).json(question);
});

// POST /api/questions/:id/attempt — Submit an attempt to a question
questionsRouter.post("/:id/attempt", async (request, response) => {
  const bodySchema = z.object({
    answer: z.string().min(5, "Answer must be at least 5 characters long")
  });

  const { answer } = bodySchema.parse(request.body);

  const question = await prisma.interviewQuestion.findUnique({
    where: { id: String(request.params.id) }
  });

  if (!question) {
    return response.status(404).json({ error: "Question not found" });
  }

  // Evaluate candidate answer with Gemini AI
  const evaluation = await evaluateAttemptSmart(question.question, answer, question.role, {
    category: question.category,
    modelAnswer: question.modelAnswer
  });

  const attempt = await prisma.questionAttempt.create({
    data: {
      questionId: question.id,
      userId: request.auth!.userId,
      answer,
      score: Math.round(evaluation.score),
      feedback: evaluation.feedback
    }
  });

  response.status(201).json({ ...attempt, evaluation: evaluation.evaluation });
});
