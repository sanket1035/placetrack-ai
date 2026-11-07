"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Star, RotateCcw, Lightbulb } from "lucide-react";

interface FeedbackPanelProps {
  score: number;
  feedback: string;
  modelAnswer: string;
  userAnswer: string;
  onReset: () => void;
}

export function FeedbackPanel({ score, feedback, modelAnswer, userAnswer, onReset }: FeedbackPanelProps) {
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  const getScoreColor = (val: number) => {
    if (val >= 8) return "#22C55E"; // Green
    if (val >= 5) return "#F59E0B"; // Yellow/Orange
    return "#EF4444"; // Red
  };

  const scoreColor = getScoreColor(score);

  return (
    <article
      className="card"
      style={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        background: "var(--panel, #fff)",
        border: "1px solid var(--line, #1B3A0A)"
      }}
    >
      {/* Head row: Score and Status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Circular score ring */}
          <div
            style={{
              position: "relative",
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              border: `3px solid ${scoreColor}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            <span style={{ fontSize: "18px", fontWeight: 800, color: "var(--ink, #1B3A0A)" }}>
              {score}
            </span>
            <span style={{ fontSize: "9px", color: "var(--muted)", position: "absolute", bottom: "4px" }}>
              /10
            </span>
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--ink, #1B3A0A)" }}>
              AI Evaluation Score
            </h4>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--muted)" }}>
              Evaluated using Gemini AI
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "2px" }}>
          {Array.from({ length: 10 }).map((_, idx) => (
            <Star
              key={idx}
              size={12}
              fill={idx < score ? scoreColor : "transparent"}
              color={idx < score ? scoreColor : "rgba(27,58,10,0.12)"}
            />
          ))}
        </div>
      </div>

      {/* Answer feedback */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <h5 style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "var(--secondary)" }}>
          AI Feedback
        </h5>
        <div
          style={{
            background: "rgba(27,58,10,0.04)",
            border: "1px solid rgba(27,58,10,0.15)",
            borderRadius: "10px",
            padding: "14px 16px",
            fontSize: "13px",
            color: "var(--text)",
            lineHeight: 1.5,
            whiteSpace: "pre-line"
          }}
        >
          {feedback}
        </div>
      </div>

      {/* Model Answer Dropdown */}
      <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid var(--line, #1B3A0A)", paddingTop: "14px" }}>
        <button
          onClick={() => setShowModelAnswer((prev) => !prev)}
          type="button"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "transparent",
            border: 0,
            color: "var(--ink, #1B3A0A)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
            padding: "4px 0"
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Lightbulb size={15} style={{ color: "var(--warning, #F59E0B)" }} />
            View Suggested Model Answer
          </span>
          {showModelAnswer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showModelAnswer && (
          <div
            style={{
              marginTop: "10px",
              padding: "14px",
              background: "rgba(245, 158, 11, 0.04)",
              border: "1px solid rgba(245, 158, 11, 0.1)",
              borderRadius: "10px",
              fontSize: "12px",
              color: "var(--muted)",
              lineHeight: 1.5
            }}
          >
            {modelAnswer}
          </div>
        )}
      </div>

      {/* Reset button to practice again */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
        <button
          className="secondary-button"
          onClick={onReset}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "10px",
            fontSize: "12px"
          }}
        >
          <RotateCcw size={13} /> Try Again
        </button>
      </div>
    </article>
  );
}
