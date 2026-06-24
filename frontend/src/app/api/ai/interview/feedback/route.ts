import { NextRequest, NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";

function heuristicFallback(answer: string) {
  const len = answer.trim().length;
  return {
    score: len > 50 ? 7 : len > 20 ? 5 : 3,
    strengths: ["Provided a relevant response", "Communicated key ideas"],
    weaknesses: ["Could be more specific with technical terminology or examples"],
    modelAnswer:
      "A strong answer clearly addresses the core question using precise technical terms, a structured explanation (STAR method for behavioral questions), and mentions real-world application or best practices.",
  };
}

async function callGemini(prompt: string) {
  if (!GEMINI_KEY) return null;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const body = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  const cleaned = text.trim().replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "").trim();
  return JSON.parse(cleaned);
}

export async function POST(req: NextRequest) {
  try {
    const { question, answer, role } = await req.json();

    if (!question || !answer) {
      return NextResponse.json({ error: "question and answer are required" }, { status: 400 });
    }

    const fallback = heuristicFallback(answer);

    try {
      const prompt = `You are an expert technical interviewer evaluating a student candidate for a ${role ?? "software engineer"} position.
Evaluate their answer to the interview question below.

Question: ${question}
Candidate's Answer: ${answer}

Return strict JSON ONLY with these keys:
- score: number 1 to 10
- strengths: string[] (what the candidate did well)
- weaknesses: string[] (areas to improve)
- modelAnswer: string (a high-quality model response)`;

      const result = await callGemini(prompt);
      if (!result) return NextResponse.json(fallback);

      return NextResponse.json({
        score: typeof result.score === "number" ? Math.max(1, Math.min(10, Math.round(result.score))) : fallback.score,
        strengths: Array.isArray(result.strengths) ? result.strengths.map(String) : fallback.strengths,
        weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses.map(String) : fallback.weaknesses,
        modelAnswer: typeof result.modelAnswer === "string" ? result.modelAnswer : fallback.modelAnswer,
      });
    } catch {
      return NextResponse.json(fallback);
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
