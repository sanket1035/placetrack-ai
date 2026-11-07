"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { api } from "../lib/api";
import { FeedbackPanel } from "./FeedbackPanel";

interface Question {
  id: string;
  role: string;
  question: string;
  difficulty: string;
  category: string;
  modelAnswer: string | null;
  attempts?: Array<{
    id: string;
    answer: string;
    score: number | null;
    feedback: string | null;
    createdAt: string;
  }>;
}

interface QuestionCardProps {
  question: Question;
  token: string | null;
  flash: (msg: string) => void;
}

export function QuestionCard({ question, token, flash }: QuestionCardProps) {
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState<any>(
    question.attempts && question.attempts.length > 0 ? question.attempts[0] : null
  );

  const getDifficultyColor = (diff: string) => {
    switch (diff.toUpperCase()) {
      case "EASY":
        return "#22C55E";
      case "MEDIUM":
        return "#F59E0B";
      case "HARD":
        return "#EF4444";
      default:
        return "var(--secondary)";
    }
  };

  const getDifficultyBg = (diff: string) => {
    switch (diff.toUpperCase()) {
      case "EASY":
        return "rgba(34, 197, 94, 0.12)";
      case "MEDIUM":
        return "rgba(245, 158, 11, 0.12)";
      case "HARD":
        return "rgba(239, 68, 68, 0.12)";
      default:
        return "rgba(136, 189, 242, 0.08)";
    }
  };

  const handleSubmit = async () => {
    if (!token) return;
    if (answer.trim().length < 5) {
      flash("Answer must be at least 5 characters long");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<any>(`/api/questions/${question.id}/attempt`, token, {
        method: "POST",
        body: JSON.stringify({ answer })
      });
      setAttemptResult(res);
      flash("Answer evaluated successfully!");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (attemptResult) {
    return (
      <FeedbackPanel
        score={attemptResult.score ?? 0}
        feedback={attemptResult.feedback ?? "No feedback provided."}
        modelAnswer={question.modelAnswer ?? "No model answer available."}
        userAnswer={attemptResult.answer}
        onReset={() => {
          setAttemptResult(null);
          setAnswer("");
        }}
      />
    );
  }

  const diffColor = getDifficultyColor(question.difficulty);
  const diffBg = getDifficultyBg(question.difficulty);

  return (
    <article
      className="card"
      style={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        background: "var(--panel, #fff)",
        border: "1px solid var(--line, #1B3A0A)"
      }}
    >
      {/* Badges row */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <span
          style={{
            color: diffColor,
            background: diffBg,
            border: `1px solid ${diffColor}30`,
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase"
          }}
        >
          {question.difficulty}
        </span>
        <span
          style={{
            color: "var(--secondary, #88BDF2)",
            background: "rgba(136, 189, 242, 0.08)",
            border: "1px solid rgba(136, 189, 242, 0.15)",
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase"
          }}
        >
          {question.category}
        </span>
        <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "auto" }}>
          Role: <b>{question.role}</b>
        </span>
      </div>

      {/* Question Text */}
      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "var(--text)", lineHeight: 1.45 }}>
        {question.question}
      </h3>

      {/* Answer Area */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)" }}>
          Your Answer
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your structured answer here (minimum 5 characters)... Use STAR method for behavioral questions."
          disabled={submitting}
          style={{
            width: "100%",
            minHeight: "100px",
            background: "var(--panel-2, rgba(28, 28, 40, 0.7))",
            border: "1px solid var(--line, #1B3A0A)",
            borderRadius: "10px",
            padding: "12px",
            color: "var(--text)",
            fontSize: "13px",
            lineHeight: 1.5,
            resize: "vertical",
            outline: "none"
          }}
        />
      </div>

      {/* CTA Row */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className="primary-button"
          onClick={handleSubmit}
          disabled={submitting || !answer.trim()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          {submitting ? (
            <>
              <Loader2 className="spin" size={16} /> Evaluating…
            </>
          ) : (
            <>
              <Send size={14} /> Submit Answer
            </>
          )}
        </button>
      </div>
    </article>
  );
}
