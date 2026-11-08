"use client";

import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { isLinkedinUrl } from "@/lib/profile";

interface StudentProfile {
  cgpa?: number;
  branch?: string;
  skills?: string[];
  linkedinUrl?: string | null;
  projectNames?: string[];
  internshipNames?: string[];
}

interface ProfileCompletenessProps {
  student: StudentProfile;
  onEditProfile: () => void;
}

export default function ProfileCompleteness({ student, onEditProfile }: ProfileCompletenessProps) {
  const checks = [
    { key: "cgpa", label: "CGPA", weight: 20, isComplete: (student.cgpa ?? 0) > 0 },
    { key: "branch", label: "Branch", weight: 10, isComplete: !!student.branch && student.branch !== "Undeclared" },
    { key: "skills", label: "At least 3 skills", weight: 25, isComplete: (student.skills ?? []).length >= 3 },
    { key: "projects", label: "Projects (name them)", weight: 15, isComplete: (student.projectNames ?? []).length > 0 },
    { key: "internships", label: "Internships (name them)", weight: 15, isComplete: (student.internshipNames ?? []).length > 0 },
    { key: "linkedinUrl", label: "LinkedIn link", weight: 15, isComplete: isLinkedinUrl(student.linkedinUrl ?? "") }
  ];

  const totalPercentage = checks.reduce((sum, item) => sum + (item.isComplete ? item.weight : 0), 0);
  const missingItems = checks.filter(item => !item.isComplete);

  return (
    <div className="card" style={{ padding: "24px", marginTop: "24px" }}>
      <div className="card-head" style={{ marginBottom: "16px" }}>
        <div>
          <span className="card-kicker">Profile Quality</span>
          <h3 style={{ margin: "4px 0 0", fontSize: "16px", fontWeight: 700 }}>Completeness Status</h3>
        </div>
        <button onClick={onEditProfile} type="button" style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
          Edit Profile <ArrowRight size={14} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
            <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--text)" }}>{totalPercentage}% Complete</span>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
              {checks.filter(item => item.isComplete).length} of {checks.length} fields filled
            </span>
          </div>
          <div style={{ width: "100%", height: "8px", background: "var(--line)", borderRadius: "4px", overflow: "hidden" }}>
            <div 
              style={{ 
                width: `${totalPercentage}%`, 
                height: "100%", 
                background: totalPercentage >= 80 ? "var(--success)" : totalPercentage >= 50 ? "var(--warning)" : "var(--violet)", 
                borderRadius: "4px",
                transition: "width 0.5s ease-out"
              }} 
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "rgba(136, 189, 242, 0.06)", borderRadius: "12px", border: "1px solid rgba(136, 189, 242, 0.1)" }}>
          <AlertCircle size={14} style={{ color: "var(--secondary)", flexShrink: 0 }} />
          <span style={{ fontSize: "11px", color: "var(--secondary)" }}>
            Complete your profile to improve readiness score.
          </span>
        </div>

        {missingItems.length > 0 ? (
          <div>
            <p style={{ margin: "0 0 10px", fontSize: "11px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Missing Fields</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {missingItems.map(item => (
                <button 
                  key={item.key} 
                  onClick={onEditProfile}
                  type="button"
                  style={{
                    border: "1px dashed var(--line)",
                    background: "transparent",
                    color: "var(--muted)",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "10px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "var(--secondary)";
                    e.currentTarget.style.color = "var(--text)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = "var(--line)";
                    e.currentTarget.style.color = "var(--muted)";
                  }}
                >
                  <span>+</span> {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--success)", fontSize: "12px", fontWeight: 500 }}>
            <CheckCircle2 size={16} /> All profile fields completed! Great job.
          </div>
        )}
      </div>
    </div>
  );
}
