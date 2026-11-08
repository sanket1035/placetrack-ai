"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BriefcaseBusiness, GraduationCap, Loader2, TrendingUp, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { View } from "../types/dashboard";
import PageTitle from "./PageTitle";

type Overview = {
  department: string;
  totalStudents: number;
  placedStudents: number;
  placementRate: number;
  averageCgpa: number;
  averageReadiness: number;
  averagePackage: number;
  highestPackage: number;
  lowReadiness: number;
  withBacklogs: number;
  incompleteProfiles: number;
  activeDrives: number;
  funnel: Record<string, number>;
  topDrives: Array<{ company: string; role: string; package: number; applications: number }>;
  atRisk: Array<{ id: string; name: string; branch: string; cgpa: number; backlogs: number; readiness: number; reasons: string[] }>;
};

const STAGES: Array<[string, string]> = [
  ["APPLIED", "Applied"], ["SHORTLISTED", "Shortlisted"], ["APTITUDE_CLEARED", "Aptitude cleared"],
  ["TECHNICAL_ROUND", "Technical round"], ["HR_ROUND", "HR round"], ["SELECTED", "Selected"], ["REJECTED", "Rejected"]
];

export default function DepartmentOverview({ token, onNavigate }: { token: string; onNavigate: (view: View) => void }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    api<Overview>("/api/reports/department-overview", token)
      .then((result) => { if (live) setData(result); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load the department overview"); });
    return () => { live = false; };
  }, [token]);

  if (error) return <section className="card" style={{ padding: 24 }}>{error}</section>;
  if (!data) return <section className="card" style={{ padding: 24, display: "flex", gap: 10 }}><Loader2 className="spin" size={18} /> Loading department overview...</section>;

  const maxStage = Math.max(1, ...STAGES.map(([key]) => data.funnel[key] ?? 0));

  return (
    <>
      <PageTitle eyebrow={data.department} title="Department placement overview." copy="How your department's students are doing: placements, readiness, backlogs and drive activity." />
      <div className="stats-grid">
        <Tile icon={<Users />} value={String(data.totalStudents)} label="Students" sub={`${data.placedStudents} placed`} tone="blue" />
        <Tile icon={<GraduationCap />} value={`${data.placementRate}%`} label="Placement rate" sub={`${data.placedStudents} of ${data.totalStudents} students`} tone="gold" />
        <Tile icon={<TrendingUp />} value={`${data.averageReadiness}%`} label="Avg readiness" sub={`Avg CGPA ${data.averageCgpa}`} tone="mint" />
        <Tile icon={<BriefcaseBusiness />} value={String(data.activeDrives)} label="Active drives" sub={data.highestPackage ? `Top package ${data.highestPackage} LPA` : "No offers recorded yet"} tone="violet" />
      </div>

      <section className="mid-grid" style={{ marginTop: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 12px" }}>Application stages</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {STAGES.map(([key, label]) => {
              const count = data.funnel[key] ?? 0;
              return (
                <div key={key} style={{ display: "grid", gridTemplateColumns: "130px 1fr 36px", alignItems: "center", gap: 10, fontSize: 13 }}>
                  <span>{label}</span>
                  <div style={{ background: "var(--panel-2)", borderRadius: 6, height: 10 }}>
                    <div style={{ width: `${(count / maxStage) * 100}%`, background: "var(--forest, #1B3A0A)", height: 10, borderRadius: 6 }} />
                  </div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
          <button type="button" className="ghost-button" style={{ marginTop: 14 }} onClick={() => onNavigate("Applications")}>Update applications</button>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 12px" }}>Most applied drives</h3>
          {data.topDrives.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>No drives for this department yet.</p>}
          {data.topDrives.map((drive) => (
            <div key={`${drive.company}-${drive.role}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
              <span><strong>{drive.company}</strong><br /><small style={{ color: "var(--muted)" }}>{drive.role} · {drive.package} LPA</small></span>
              <span>{drive.applications} applied</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: 20, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={18} /> Students who need attention</h3>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {data.lowReadiness} low readiness · {data.withBacklogs} with backlogs · {data.incompleteProfiles} incomplete profiles
          </span>
        </div>
        {data.atRisk.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>No student is flagged right now.</p>}
        <div style={{ display: "grid", gap: 8 }}>
          {data.atRisk.map((student) => (
            <div key={student.id} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 13 }}>
              <span><strong>{student.name}</strong><br /><small style={{ color: "var(--muted)" }}>{student.branch} · CGPA {student.cgpa}</small></span>
              <span style={{ textAlign: "right" }}>Readiness {student.readiness}%<br /><small style={{ color: "#b42318" }}>{student.reasons.join(" · ")}</small></span>
            </div>
          ))}
        </div>
        <button type="button" className="ghost-button" style={{ marginTop: 14 }} onClick={() => onNavigate("Students")}>Open all students</button>
      </section>
    </>
  );
}

function Tile({ icon, value, label, sub, tone }: { icon: React.ReactNode; value: string; label: string; sub: string; tone: string }) {
  return (
    <div className={`card stat-card tone-${tone}`}>
      <div className="stat-head"><span className="stat-icon">{icon}</span></div>
      <strong>{value}</strong>
      <h4>{label}</h4>
      <p>{sub}</p>
    </div>
  );
}
