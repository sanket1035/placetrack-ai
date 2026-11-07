"use client";

import { motion } from "framer-motion";

export function ReadinessRing({ value }: { value: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;
  const statusLabel = value >= 80 ? "Placement ready" : value >= 65 ? "Nearly ready" : "Needs prep";

  return (
    <div className="readiness-ring" aria-label={`Readiness score ${value} out of 100`}>
      <svg viewBox="0 0 128 128">
        <circle className="ring-track" cx="64" cy="64" r={radius} />
        <motion.circle
          className="ring-value"
          cx="64"
          cy="64"
          r={radius}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="ring-label">
        <strong>{value}%</strong>
        <span>{statusLabel}</span>
      </div>
    </div>
  );
}
