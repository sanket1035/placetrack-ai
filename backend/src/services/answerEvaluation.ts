/**
 * Content-based interview answer evaluation.
 *
 * Six dimensions are scored 0-10 from the answer text, then combined with fixed weights.
 * When a reference (model) answer exists, accuracy and completeness are measured as coverage of its
 * key concepts. Without one, correctness cannot be verified offline, so the result says so and is
 * capped; the AI evaluator (Gemini) is used for those cases when it is configured.
 */

export type Dimension = { key: string; label: string; score: number; weight: number };

export type AnswerEvaluation = {
  score: number;
  verdict: "Excellent" | "Good" | "Partially correct" | "Weak" | "Irrelevant";
  dimensions: Dimension[];
  strengths: string[];
  weaknesses: string[];
  missingConcepts: string[];
  modelAnswer: string;
  source: "ai" | "heuristic";
  /** true when accuracy was checked against a reference or an AI judge, false when it is only estimated */
  verified: boolean;
  note?: string;
};

export type EvaluationInput = {
  question: string;
  answer: string;
  role?: string;
  category?: string;
  modelAnswer?: string | null;
};

const WEIGHTS = {
  accuracy: 0.3,
  concepts: 0.2,
  completeness: 0.2,
  relevance: 0.15,
  problemSolving: 0.075,
  communication: 0.075
} as const;

const LABELS: Record<keyof typeof WEIGHTS, string> = {
  accuracy: "Technical accuracy",
  concepts: "Conceptual understanding",
  completeness: "Completeness",
  relevance: "Relevance",
  problemSolving: "Problem-solving approach",
  communication: "Communication clarity"
};

const STOP = new Set((
  "a an the and or but if then else of to in on at by for with from as is are was were be been being it its this that these those " +
  "i you he she we they me my your our their them do does did done can could should would will shall may might must have has had having " +
  "not no yes so than too very just also into out up down over under about above below between among via per each any all some such " +
  "what which who whom whose when where why how there here more most less least other another one two three using use used"
).split(" "));

const GENERIC_QUESTION_WORDS = new Set([
  "explain", "describe", "difference", "differences", "between", "what", "how", "why", "when", "tell", "give", "example", "examples",
  "work", "works", "working", "mean", "means", "name", "list", "define", "discuss", "write", "design", "would", "your", "you"
]);

const BEHAVIORAL = /\b(tell me about|describe a time|time (when|you)|why are you|where do you see|strength|weakness|conflict|team member|handle pressure|motivat|introduce yourself|why should we)\b/i;

export function stem(word: string): string {
  let value = word.toLowerCase();
  for (const suffix of ["ations", "ation", "ingly", "ings", "ing", "ness", "ments", "ment", "ies", "ied", "ed", "es", "ly", "s"]) {
    if (value.length > suffix.length + 3 && value.endsWith(suffix)) { value = value.slice(0, -suffix.length); break; }
  }
  return value;
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z0-9+#.]*[a-z0-9+#]|[a-z]/g) ?? [])
    .filter((token) => !STOP.has(token) && token.length > 1)
    .map(stem);
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function clamp(value: number, min = 0, max = 10) {
  return Math.max(min, Math.min(max, value));
}

function sentences(text: string) {
  return text.split(/[.!?]+\s|\n+/).map((part) => part.trim()).filter((part) => part.split(/\s+/).length >= 3);
}

function gibberishRatio(answer: string) {
  const raw = answer.toLowerCase().match(/[a-z]+/g) ?? [];
  if (!raw.length) return 1;
  const bad = raw.filter((word) =>
    (word.length > 3 && !/[aeiouy]/.test(word)) || /(.)\1{3,}/.test(word) || word.length > 24
  ).length;
  const uniqueRatio = unique(raw).length / raw.length;
  return Math.min(1, bad / raw.length + (raw.length >= 8 && uniqueRatio < 0.3 ? 0.5 : 0));
}

/** Key concepts of a reference answer: its most informative distinct stems. */
export function conceptsOf(reference: string): string[] {
  const tokens = tokenize(reference);
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([token]) => token.length > 2)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 14)
    .map(([token]) => token);
}

function verdictFor(score: number, irrelevant: boolean): AnswerEvaluation["verdict"] {
  if (irrelevant) return "Irrelevant";
  if (score >= 8.5) return "Excellent";
  if (score >= 6.5) return "Good";
  if (score >= 4) return "Partially correct";
  return "Weak";
}

export function combine(scores: Record<keyof typeof WEIGHTS, number>) {
  const dimensions: Dimension[] = (Object.keys(WEIGHTS) as Array<keyof typeof WEIGHTS>).map((key) => ({
    key, label: LABELS[key], score: Math.round(clamp(scores[key]) * 10) / 10, weight: WEIGHTS[key]
  }));
  const total = dimensions.reduce((sum, item) => sum + item.score * item.weight, 0);
  return { dimensions, total };
}

export function evaluateAnswerHeuristic(input: EvaluationInput): AnswerEvaluation {
  const answer = input.answer.trim();
  const questionTerms = unique(tokenize(input.question)).filter((term) => !GENERIC_QUESTION_WORDS.has(term));
  const answerTokens = tokenize(answer);
  const answerSet = new Set(answerTokens);
  const wordTotal = (answer.match(/[a-z0-9']+/gi) ?? []).length;
  const behavioral = (input.category ?? "") !== "" ? /behav|hr/i.test(input.category!) : BEHAVIORAL.test(input.question);
  const hasReference = Boolean(input.modelAnswer && input.modelAnswer.trim().length > 30);
  const referenceConcepts = hasReference ? conceptsOf(input.modelAnswer!) : [];

  if (wordTotal === 0) {
    const empty = combine({ accuracy: 0, concepts: 0, completeness: 0, relevance: 0, problemSolving: 0, communication: 0 });
    return {
      score: 0, verdict: "Weak", dimensions: empty.dimensions, strengths: [],
      weaknesses: ["No answer was provided."], missingConcepts: referenceConcepts.slice(0, 6),
      modelAnswer: input.modelAnswer ?? "", source: "heuristic", verified: false
    };
  }

  // Relevance: how much of the question (and reference) the answer actually engages with.
  const questionHit = questionTerms.length ? questionTerms.filter((term) => answerSet.has(term)).length / questionTerms.length : 0.5;
  const referenceHit = referenceConcepts.length ? referenceConcepts.filter((term) => answerSet.has(term)).length / referenceConcepts.length : questionHit;
  const relevanceBase = hasReference ? Math.max(referenceHit, questionHit * 0.6) : questionHit;
  const relevance = clamp(relevanceBase * 12);

  // Concept coverage / terminology density
  const distinctTerms = unique(answerTokens).length;
  const termDensity = clamp(distinctTerms / 3.5, 0, 10);
  const coverage = hasReference ? clamp(referenceHit * 11) : clamp(termDensity * 0.9 + questionHit * 2);

  // Completeness: enough distinct content, not repetition.
  const lengthScore = wordTotal >= 130 ? 9 : wordTotal >= 80 ? 8 : wordTotal >= 50 ? 6.5 : wordTotal >= 30 ? 5 : wordTotal >= 15 ? 3 : 1.5;
  const diversity = answerTokens.length ? distinctTerms / answerTokens.length : 0;
  const completenessBase = hasReference ? (coverage * 0.6 + lengthScore * 0.4) : lengthScore * 0.7 + termDensity * 0.3;
  const completeness = clamp(completenessBase * (diversity < 0.4 ? 0.6 : 1));

  // Reasoning, examples
  const reasoningMarks = (answer.match(/\b(because|therefore|hence|so that|which means|as a result|thus|due to|since|whereas|unlike|in contrast|trade-?offs?|depends on|compared to)\b/gi) ?? []).length;
  const exampleMarks = (answer.match(/\b(for example|for instance|e\.g\.|such as|like when|in my project|consider)\b/gi) ?? []).length;
  const concepts = clamp(2 + reasoningMarks * 1.6 + exampleMarks * 1.8 + coverage * 0.35);

  // Approach / structure
  const structureMarks = (answer.match(/\b(first|second|third|then|next|finally|step|approach|algorithm|edge cases?|complexity|o\(|scal|optimi[sz]|test|validate|handle|steps?)\b/gi) ?? []).length;
  const starMarks = (answer.match(/\b(situation|task|my role|i (led|built|decided|implemented|worked|fixed|learned|organi[sz]ed|resolved)|result|outcome|learned|improved|reduced|%|\d+)\b/gi) ?? []).length;
  const problemSolving = clamp(1.5 + (behavioral ? starMarks * 1.1 : structureMarks * 1.2));

  // Accuracy: against the reference when present; otherwise only an estimate from terminology.
  const accuracy = hasReference ? clamp(referenceHit * 11 - (gibberishRatio(answer) * 4)) : clamp(termDensity * 0.8 + relevance * 0.3);

  // Communication
  const parts = sentences(answer);
  const avgLength = parts.length ? parts.reduce((sum, part) => sum + part.split(/\s+/).length, 0) / parts.length : wordTotal;
  const readability = avgLength >= 6 && avgLength <= 32 ? 3 : 1;
  const communication = clamp(2 + Math.min(parts.length, 5) * 1.0 + readability + (diversity > 0.55 ? 1.5 : 0) - gibberishRatio(answer) * 8);

  let { dimensions, total } = combine({ accuracy, concepts, completeness, relevance, problemSolving, communication });

  const gibberish = gibberishRatio(answer);
  const irrelevant = wordTotal >= 5 && (relevance < 1.5 || gibberish > 0.5);
  if (gibberish > 0.5) total = Math.min(total, 1);
  else if (relevance < 1.5) total = Math.min(total, 2);
  else if (relevance < 3.5) total = Math.min(total, 4);
  // Without a reference or an AI judge, correctness is unverified, so a perfect score would be dishonest.
  if (!hasReference) total = Math.min(total, 7.5);
  total = Math.round(clamp(total) * 10) / 10;

  const missing = hasReference ? referenceConcepts.filter((term) => !answerSet.has(term)).slice(0, 6) : [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (relevance >= 6) strengths.push("The answer stays on the question.");
  if (hasReference && referenceHit >= 0.55) strengths.push("Covers most of the key ideas expected.");
  if (reasoningMarks >= 2) strengths.push("Explains the reasoning, not just the result.");
  if (exampleMarks >= 1) strengths.push("Backs the point up with an example.");
  if (!behavioral && structureMarks >= 3) strengths.push("Describes the approach in a clear order.");
  if (relevance < 3.5) weaknesses.push("The answer barely addresses the question that was asked.");
  if (wordTotal < 30) weaknesses.push("Too short; add the definition, how it works and an example.");
  if (hasReference && missing.length) weaknesses.push(`Missing key ideas: ${missing.join(", ")}.`);
  if (reasoningMarks === 0 && wordTotal >= 15) weaknesses.push("Explain why, not only what (use reasons and trade-offs).");
  if (exampleMarks === 0 && wordTotal >= 15) weaknesses.push("Add a concrete example.");
  if (behavioral && starMarks < 3) weaknesses.push("Use the STAR structure: situation, task, action, result with a measurable outcome.");
  if (gibberish > 0.3) weaknesses.push("Parts of the answer are not readable text.");

  return {
    score: total,
    verdict: verdictFor(total, irrelevant),
    dimensions,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 5),
    missingConcepts: missing,
    modelAnswer: input.modelAnswer?.trim() || "",
    source: "heuristic",
    verified: hasReference,
    note: hasReference
      ? undefined
      : "Scored without an AI judge or reference answer: relevance, depth and structure are measured, but factual correctness is not verified."
  };
}

/** Builds the final result from Gemini's per-dimension scores using the same fixed weights. */
export function fromAiDimensions(
  raw: unknown,
  input: EvaluationInput
): AnswerEvaluation | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, any>;
  const dims = (data.dimensions ?? {}) as Record<string, unknown>;
  const read = (name: string) => (typeof dims[name] === "number" && Number.isFinite(dims[name] as number) ? clamp(dims[name] as number) : null);
  const values = {
    accuracy: read("technicalAccuracy"), concepts: read("conceptualUnderstanding"), completeness: read("completeness"),
    relevance: read("relevance"), problemSolving: read("problemSolving"), communication: read("communication")
  };
  if (Object.values(values).some((value) => value === null)) return null;
  const { dimensions, total } = combine(values as Record<keyof typeof WEIGHTS, number>);
  // An answer cannot be rated well overall if the judge itself rated it as off-topic or inaccurate.
  const cap = Math.min(values.relevance! + 2, values.accuracy! + 3, 10);
  const score = Math.round(clamp(Math.min(total, cap)) * 10) / 10;
  const list = (value: unknown) => (Array.isArray(value) ? value.map(String).filter(Boolean).slice(0, 6) : []);
  return {
    score,
    verdict: verdictFor(score, values.relevance! < 1.5),
    dimensions,
    strengths: list(data.strengths),
    weaknesses: list(data.weaknesses),
    missingConcepts: list(data.missingConcepts),
    modelAnswer: typeof data.modelAnswer === "string" ? data.modelAnswer : input.modelAnswer ?? "",
    source: "ai",
    verified: true
  };
}

export function evaluationPrompt(input: EvaluationInput) {
  return `You are a strict but fair technical interviewer grading a student candidate for a ${input.role ?? "software engineer"} role.
Grade ONLY what the answer actually says. A wrong, vague or off-topic answer must score low; a complete, correct, well-explained answer must score high. Use the whole 0-10 range.

Question: ${input.question}
${input.modelAnswer ? `Reference answer: ${input.modelAnswer}\n` : ""}Candidate answer: ${input.answer}

Return JSON only:
{
 "dimensions": {
  "technicalAccuracy": 0-10 (are the facts correct),
  "conceptualUnderstanding": 0-10 (does the candidate show why, not just what),
  "completeness": 0-10 (are the key points covered),
  "relevance": 0-10 (does it answer this question),
  "problemSolving": 0-10 (reasoning, trade-offs, edge cases, structure),
  "communication": 0-10 (clear and organised)
 },
 "strengths": string[],
 "weaknesses": string[] (say exactly what is wrong or missing),
 "missingConcepts": string[],
 "modelAnswer": string (a concise correct answer)
}`;
}
