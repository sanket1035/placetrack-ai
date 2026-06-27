"use client";

import { motion } from "framer-motion";

export function ReadinessRing({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="readiness-ring" aria-label={`Readiness score ${value} out of 100`}>
      <svg viewBox="0 0 128 128">
        <defs>
          <linearGradient id="score-gradient" x1="0" x2="1">
            <stop offset="0" stopColor="var(--violet)" />
            <stop offset="1" stopColor="#42d7c4" />
          </linearGradient>
        </defs>
        <circle className="ring-track" cx="64" cy="64" r="54" />
        <motion.circle
          className="ring-value"
          cx="64"
          cy="64"
          r="54"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="ring-label">
        <strong>{value}</strong>
        <span>out of 100</span>
      </div>
    </div>
  );
}
