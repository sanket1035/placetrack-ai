import { analyzeResume, type ResumeAnalysis } from "./resumeScoring.js";
import {
  evaluateAnswerHeuristic, evaluationPrompt, fromAiDimensions,
  type AnswerEvaluation, type EvaluationInput
} from "./answerEvaluation.js";

export const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";

/** Resume scoring is deterministic and based only on the extracted text. */
export function analyzeResumeText(text: string, targetSkills?: string[]): ResumeAnalysis {
  return analyzeResume(text, { targetSkills });
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, "");
    cleaned = cleaned.replace(/\n```$/, "");
  }
  return cleaned.trim();
}

async function callGemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
    })
  });
  if (!response.ok) throw new Error(`Gemini failed with ${response.status}`);
  const body = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  const cleanedText = cleanJsonResponse(text);
  return JSON.parse(cleanedText);
}

const questionBank: Record<string, string[]> = {
  frontend: [
    "How does React reconciliation work, and when can keys cause subtle bugs?",
    "Design an accessible autocomplete component that handles slow networks.",
    "When would you choose server components over client components?"
  ],
  backend: [
    "How would you make an API endpoint idempotent?",
    "Explain a production issue caused by database transaction isolation.",
    "Design rate limiting for a distributed Node.js service."
  ],
  data: [
    "How would you detect and handle data leakage in a prediction pipeline?",
    "Explain precision versus recall using a placement-screening example.",
    "How would you validate a model when classes are imbalanced?"
  ],
  behavioral: [
    "Tell me about a technical disagreement and how you resolved it.",
    "Describe a project setback and what changed in your approach.",
    "How do you prioritize when several deadlines collide?"
  ]
};

export function generateInterviewQuestions(role = "software engineer", count = 6) {
  const key = /front|react|ui/i.test(role) ? "frontend" : /data|ml|analyst/i.test(role) ? "data" : "backend";
  const pool = [...questionBank[key], ...questionBank.behavioral];
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    question: pool[index % pool.length],
    difficulty: index < 2 ? "Warm-up" : index < 4 ? "Core" : "Stretch",
    focus: index % 2 === 0 ? "Technical depth" : "Communication"
  }));
}

export async function generateInterviewQuestionsSmart(role = "software engineer", count = 6) {
  const fallback = generateInterviewQuestions(role, count);
  try {
    const result = await callGemini(`Generate ${count} campus placement interview questions for role "${role}". Return JSON array only. Each item needs question, difficulty, focus.`);
    let questionsArray: any[] = [];
    if (Array.isArray(result)) {
      questionsArray = result;
    } else if (result && typeof result === "object") {
      const possibleArray = Object.values(result).find(val => Array.isArray(val));
      if (possibleArray) {
        questionsArray = possibleArray as any[];
      }
    }
    if (!questionsArray || questionsArray.length === 0) return fallback;
    return questionsArray.slice(0, count).map((item, index) => ({
      id: index + 1,
      question: String(item.question ?? fallback[index % fallback.length].question),
      difficulty: String(item.difficulty ?? fallback[index % fallback.length].difficulty),
      focus: String(item.focus ?? fallback[index % fallback.length].focus)
    }));
  } catch {
    return fallback;
  }
}

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Evaluates an answer on its content. Uses the AI judge when configured and falls back to the
 * content-based evaluator (never to a length-based score) if the AI call fails or returns junk.
 */
export async function evaluateAnswer(input: EvaluationInput): Promise<AnswerEvaluation> {
  const heuristic = evaluateAnswerHeuristic(input);
  if (!geminiConfigured()) return heuristic;
  try {
    const result = await callGemini(evaluationPrompt(input));
    const parsed = fromAiDimensions(result, input);
    if (parsed) return parsed;
    return { ...heuristic, note: `${heuristic.note ?? ""} AI response was invalid, so the content-based evaluator was used.`.trim() };
  } catch (error: any) {
    console.warn("[ai] Gemini evaluation failed:", error?.message ?? error);
    return { ...heuristic, note: `${heuristic.note ?? ""} The AI service was unavailable, so the content-based evaluator was used.`.trim() };
  }
}

export async function generateSingleQuestionSmart(role: string, difficulty: string) {
  const prompt = `You are an expert technical interviewer.
Generate one placement interview question for the role "${role}" with difficulty level "${difficulty}" (choose from: EASY, MEDIUM, HARD).
Return a strict JSON response ONLY. Do not wrap in extra explanation or markdown blocks outside valid JSON.
JSON keys required:
- question: string containing the question text
- category: string (choose one of: Technical, Behavioral, HR)
- modelAnswer: string containing a high-quality model response for this question

Response:`;

  const fallback = {
    question: `What are some of the key practices or technologies you would focus on as a ${role} with ${difficulty} level?`,
    category: "Technical",
    modelAnswer: "A high-quality response should detail relevant technologies, patterns, and methodologies suitable for this role."
  };

  try {
    const result = await callGemini(prompt);
    if (!result) return fallback;
    return {
      question: typeof result.question === "string" ? result.question : fallback.question,
      category: typeof result.category === "string" ? result.category : fallback.category,
      modelAnswer: typeof result.modelAnswer === "string" ? result.modelAnswer : fallback.modelAnswer
    };
  } catch {
    return fallback;
  }
}

export async function evaluateAttemptSmart(question: string, answer: string, role: string, extra: { category?: string; modelAnswer?: string | null } = {}) {
  const result = await evaluateAnswer({ question, answer, role, ...extra });
  const parts = [
    `${result.verdict} (${result.score}/10).`,
    result.strengths.length ? `Strengths: ${result.strengths.join(" ")}` : "",
    result.weaknesses.length ? `To improve: ${result.weaknesses.join(" ")}` : "",
    result.note ?? ""
  ].filter(Boolean);
  return { score: result.score, feedback: parts.join("\n"), evaluation: result };
}
