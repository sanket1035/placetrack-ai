// ProfileCardExport.tsx — Off-screen styled card captured by html2canvas for PNG export.
// IMPORTANT: All styles are hardcoded inline (no CSS custom properties) because
// html2canvas cannot resolve CSS variables at capture time.
// Visual language follows the app's "design C": cream, forest-green ink, yellow highlighter, pastel tiles.

"use client";

import { forwardRef } from "react";

interface StudentData {
  name: string;
  branch: string;
  cgpa: number;
  graduationYear: number;
  skills: string[];
  backlogs?: number;
  projectsCount?: number;
  internshipsCount?: number;
  mockTestCount?: number;
}

interface ProfileCardExportProps {
  student: StudentData;
  readinessScore: number;
}

const INK = "#1B3A0A";
const MUTED = "#5E7550";
const DISPLAY = "'Bricolage Grotesque', 'Hanken Grotesk', 'Segoe UI', system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'Geist Mono', ui-monospace, monospace";

function statusFor(value: number) {
  if (value >= 80) return { label: "Placement Ready", color: "#2E7D32", bg: "#DDF3DF" };
  if (value >= 65) return { label: "Nearly Ready", color: "#B26A00", bg: "#FFEFC2" };
  return { label: "Needs Preparation", color: "#C2410C", bg: "#FFE3D3" };
}

// Self-contained inline SVG ring — no CSS vars, no framer-motion
function ExportRing({ value }: { value: number }) {
  const r = 50;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;
  const { color } = statusFor(value);

  return (
    <div style={{ position: "relative", width: "148px", height: "148px", flexShrink: 0 }}>
      <svg viewBox="0 0 128 128" width="148" height="148">
        <circle cx="64" cy="64" r="60" fill="#FFFFFF" stroke={INK} strokeWidth="1.5" />
        <circle cx="64" cy="64" r={r} fill="none" stroke="#E9EFDD" strokeWidth="9" />
        <circle
          cx="64" cy="64" r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 64 64)"
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "3px"
      }}>
        <span style={{ fontFamily: DISPLAY, fontSize: "34px", fontWeight: 800, color: INK, lineHeight: 1, letterSpacing: "-0.03em" }}>
          {value}%
        </span>
        <span style={{ fontFamily: MONO, fontSize: "8px", fontWeight: 500, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Readiness
        </span>
      </div>
    </div>
  );
}

// PlaceTrack AI mark (same as the app favicon) as inline SVG so html2canvas renders it reliably
function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="15" fill={INK} />
      <path d="M32 16 8 28l24 12 24-12z" fill="#FFE859" />
      <path d="M18 35v10c0 4 7 8 14 8s14-4 14-8V35l-14 7z" fill="#FFE859" opacity=".85" />
      <rect x="52" y="28" width="3" height="16" rx="1.5" fill="#FFE859" />
    </svg>
  );
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

const ProfileCardExport = forwardRef<HTMLDivElement, ProfileCardExportProps>(
  ({ student, readinessScore }, ref) => {
    const topSkills = student.skills.slice(0, 5);
    const generatedDate = new Date().toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric"
    });
    const status = statusFor(readinessScore);
    const projects = student.projectsCount ?? 0;
    const internships = student.internshipsCount ?? 0;

    const nameParts = student.name.trim().split(/\s+/);
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
    const firstNames = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : student.name;

    const tile = (bg: string, value: string, label: string) => (
      <div style={{
        background: bg, border: `1.5px solid ${INK}`, borderRadius: "12px",
        padding: "7px 12px", minWidth: "78px"
      }}>
        <div style={{ fontFamily: DISPLAY, fontSize: "20px", fontWeight: 800, color: INK, lineHeight: 1.05, letterSpacing: "-0.02em" }}>{value}</div>
        <div style={{ fontFamily: MONO, fontSize: "8px", fontWeight: 500, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "2px" }}>{label}</div>
      </div>
    );

    return (
      <div
        ref={ref}
        style={{
          // Hidden off-screen — rendered but not visible until capture
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          zIndex: -1,
          // 600x340 → exports at 1200x680 (2x), a good social-share ratio
          width: "600px",
          height: "340px",
          overflow: "hidden",
          background: "#FBFAF4",
          padding: "26px 30px 22px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          color: INK
        }}
      >
        {/* Soft pastel shapes */}
        <div style={{ position: "absolute", top: "-70px", right: "-50px", width: "230px", height: "230px", borderRadius: "50%", background: "#D9F2E3", opacity: 0.8 }} />
        <div style={{ position: "absolute", bottom: "-90px", left: "-40px", width: "200px", height: "200px", borderRadius: "50%", background: "#E6DCF7", opacity: 0.55 }} />

        {/* TOP ROW: logo + status pill */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <LogoMark />
            <span style={{ fontFamily: DISPLAY, fontSize: "17px", fontWeight: 800, letterSpacing: "-0.02em" }}>
              PlaceTrack <span style={{ background: "#FFE859", padding: "0 5px", borderRadius: "4px" }}>AI</span>
            </span>
          </div>
          <div style={{
            background: status.bg, border: `1.5px solid ${INK}`, color: status.color,
            padding: "5px 13px", borderRadius: "999px", fontFamily: MONO,
            fontSize: "9.5px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase"
          }}>
            {status.label}
          </div>
        </div>

        {/* MAIN: name + meta + tiles + skills | ring */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "22px", position: "relative", zIndex: 1 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: "0 0 5px", fontFamily: MONO, fontSize: "9px", fontWeight: 500, color: MUTED, textTransform: "uppercase", letterSpacing: "0.14em" }}>
              Student readiness profile
            </p>
            <h2 style={{
              margin: "0 0 5px", fontFamily: DISPLAY, fontSize: "31px", fontWeight: 800,
              letterSpacing: "-0.03em", lineHeight: 1.08, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
            }}>
              {firstNames}{lastName && " "}
              {lastName && <span style={{ background: "#FFE859", padding: "0 6px", borderRadius: "4px" }}>{lastName}</span>}
            </h2>
            <p style={{ margin: "0 0 13px", fontSize: "12px", color: MUTED, fontWeight: 500 }}>
              {student.branch} &nbsp;·&nbsp; Class of {student.graduationYear}
            </p>

            <div style={{ display: "flex", gap: "8px", marginBottom: "13px" }}>
              {tile("#D9F2E3", student.cgpa.toFixed(1), "CGPA")}
              {tile("#E6DCF7", String(projects), plural(projects, "Project", "Projects"))}
              {tile("#D2EEF5", String(internships), plural(internships, "Internship", "Internships"))}
            </div>

            {topSkills.length > 0 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {topSkills.map((skill) => (
                  <span key={skill} style={{
                    background: "#FFFFFF", border: `1px solid ${INK}`, color: INK,
                    padding: "3px 10px", borderRadius: "999px", fontSize: "10px", fontWeight: 600
                  }}>
                    {skill}
                  </span>
                ))}
                {student.skills.length > 5 && (
                  <span style={{ color: MUTED, padding: "3px 4px", fontSize: "10px", fontWeight: 600 }}>
                    +{student.skills.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>

          <ExportRing value={readinessScore} />
        </div>

        {/* FOOTER: society logo + date */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1, borderTop: `1px solid ${INK}33`, paddingTop: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/kkw-society.png" alt="" width={46} height={27} style={{ display: "block", objectFit: "contain" }} />
            <span style={{ fontFamily: MONO, fontSize: "8.5px", color: MUTED, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              KKWagh Engineering · Placement Cell
            </span>
          </div>
          <span style={{ fontFamily: MONO, fontSize: "8.5px", color: MUTED }}>
            Generated {generatedDate}
          </span>
        </div>
      </div>
    );
  }
);

ProfileCardExport.displayName = "ProfileCardExport";
export default ProfileCardExport;
