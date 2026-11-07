import { Router } from "express";
import multer from "multer";
import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { audit } from "../lib/audit.js";
import { authenticate } from "../middleware/auth.js";
import mammoth from "mammoth";
import { analyzeResumeText, generateInterviewQuestionsSmart, evaluateAnswer } from "../services/ai.js";
import { ResumeTextError } from "../services/resumeScoring.js";
import { predictReadiness } from "../services/readiness.js";

export const aiRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

aiRouter.use(authenticate);

async function saveAnalysis(userId: string, result: ReturnType<typeof analyzeResumeText>, fileName?: string) {
  await prisma.resumeAnalysis.create({
    data: { userId, fileName, score: result.score, skills: result.skills, sections: result.sectionHits, suggestions: result.suggestions }
  });
  await audit(userId, "ANALYZE", "resume", { score: result.score });
}

// 1. Text Paste Analyzer Route
aiRouter.post("/resume/text", async (request, response) => {
  const { text } = z.object({ text: z.string().min(1).max(100_000) }).parse(request.body);
  try {
    const result = analyzeResumeText(text);
    await saveAnalysis(request.auth!.userId, result);
    response.json(result);
  } catch (error) {
    if (error instanceof ResumeTextError) return response.status(422).json({ error: error.message });
    throw error;
  }
});

/**
 * Rebuilds readable lines from pdf.js text items. Joining everything with spaces would flatten the page to one
 * line and hide section headings (EXPERIENCE, PROJECTS...), so a new line starts at every end-of-line marker
 * and whenever the vertical position changes.
 */
export function pdfItemsToText(items: Array<{ str?: string; hasEOL?: boolean; transform?: number[] }>): string {
  const lines: string[] = [];
  let current = "";
  let lastY: number | null = null;
  const flush = () => { if (current.trim()) lines.push(current.replace(/\s+/g, " ").trim()); current = ""; };
  for (const item of items) {
    const y = item.transform?.[5] ?? null;
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) flush();
    current += item.str ?? "";
    if (y !== null) lastY = y;
    if (item.hasEOL) flush();
  }
  flush();
  return lines.join("\n");
}

// 2. PDF, DOCX and TXT upload analyzer
async function extractResumeText(file: Express.Multer.File): Promise<string> {
  const name = file.originalname.toLowerCase();
  const isPdf = file.mimetype === "application/pdf" || name.endsWith(".pdf");
  const isDocx = file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx");
  const isTxt = file.mimetype === "text/plain" || name.endsWith(".txt");
  if (!isPdf && !isDocx && !isTxt) throw new ResumeTextError("Unsupported file type. Upload a PDF, DOCX or TXT resume.");
  if (file.size === 0) throw new ResumeTextError("The uploaded file is empty.");

  try {
    if (isPdf) {
      // PDFs start with "%PDF"; anything else is a corrupted or renamed file.
      if (file.buffer.subarray(0, 5).toString("latin1").indexOf("%PDF") === -1) throw new Error("not a PDF");
      const pdf = await getDocumentProxy(new Uint8Array(file.buffer));
      const pages: string[] = [];
      for (let index = 1; index <= pdf.numPages; index++) {
        const content = await (await pdf.getPage(index)).getTextContent();
        pages.push(pdfItemsToText(content.items as any[]));
      }
      return pages.join("\n");
    }
    if (isDocx) {
      const { value } = await mammoth.extractRawText({ buffer: file.buffer });
      return value;
    }
    return file.buffer.toString("utf8");
  } catch (error) {
    if (error instanceof ResumeTextError) throw error;
    throw new ResumeTextError("The file could not be read. It may be corrupted or password-protected; export it again as a text-based PDF or DOCX.");
  }
}

aiRouter.post("/resume/upload", upload.single("resume"), async (request, response) => {
  if (!request.file) return response.status(400).json({ error: "No file uploaded" });
  try {
    const text = await extractResumeText(request.file);
    const result = analyzeResumeText(text);
    await saveAnalysis(request.auth!.userId, result, request.file.originalname);
    response.json({ ...result, fileName: request.file.originalname, extractedCharacters: text.length });
  } catch (error) {
    if (error instanceof ResumeTextError) return response.status(422).json({ error: error.message });
    throw error;
  }
});

// 3. History Retrieval Route
aiRouter.get("/resume/history", async (request, response) => {
  response.json(await prisma.resumeAnalysis.findMany({
    where: { userId: request.auth!.userId }, orderBy: { createdAt: "desc" }, take: 20
  }));
});

// 4. Interview Prep Generation Route
aiRouter.post("/interview", async (request, response) => {
  const { role, count } = z.object({ role: z.string().default("software engineer"), count: z.number().int().min(1).max(12).default(6) }).parse(request.body);
  response.json(await generateInterviewQuestionsSmart(role, count));
});

// 5. Interview Answer Feedback Route: evaluates the content of the answer
aiRouter.post("/interview/feedback", async (request, response) => {
  const { question, answer, role, category } = z.object({
    question: z.string().min(5).max(2000),
    answer: z.string().max(10_000),
    role: z.string().default("software engineer"),
    category: z.string().optional()
  }).parse(request.body);
  const result = await evaluateAnswer({ question, answer, role, category });
  response.json(result);
});

// 6. Readiness Evaluation Route
aiRouter.post("/readiness", (request, response) => response.json(predictReadiness(request.body)));