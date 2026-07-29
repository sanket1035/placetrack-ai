import type { ReactNode } from "react";
import { ArrowUpRight, CalendarDays, BriefcaseBusiness, Trophy, Building2, Sparkles, Users } from "lucide-react";
import type { Role, DashboardData, Application, Drive, View } from "../types/dashboard";
import { initials, getLogoUrl } from "../lib/queries";
import { ReadinessRing } from "./ReadinessRing";
import ProfileCompleteness from "./ProfileCompleteness";
import DashboardSkeleton from "./ui/DashboardSkeleton";

export function Overview({
  role,
  name,
  dashboard,
  applications,
  drives,
  onNavigate,
  loading
}: {
  role: Role;
  name: string;
  dashboard: DashboardData | null;
  applications: Application[];
  drives: Drive[];
  onNavigate: (view: View) => void;
  loading: boolean;
}) {
  const readiness = dashboard?.readiness as { score?: number; reasons?: string[] } | undefined;
  const stats = dashboard?.stats as Record<string, number> | undefined;

  // Show skeleton on first load before any data arrives
  if (loading && !dashboard) return <DashboardSkeleton />;

  const currentDateString = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {/* Premium Welcome Hero Card */}
      <div
        className="card dashboard-welcome-hero"
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "32px",
          marginBottom: "30px",
          background: "var(--welcome-bg)",
          border: "1px solid var(--welcome-border)",
          borderRadius: "var(--r-xl)",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}
      >
        {/* Abstract decorative glowing elements */}
        <div
          style={{
            position: "absolute",
            top: "-50px",
            right: "-50px",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "radial-gradient(circle, var(--focus) 0%, transparent 70%)",
            pointerEvents: "none"
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-30px",
            left: "40%",
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255, 154, 137, 0.04) 0%, transparent 70%)",
            pointerEvents: "none"
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              className="avatar big"
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                fontSize: "20px",
                fontWeight: 800,
                background: "linear-gradient(135deg, var(--primary), var(--primary-dim))",
                color: "var(--bg)",
                boxShadow: "0 8px 24px var(--focus)"
              }}
            >
              {initials(name)}
            </div>
            <div>
              <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--welcome-accent)" }}>
                {role} PORTAL
              </span>
              <h1 style={{ margin: "4px 0 0", fontSize: "28px", fontWeight: 800, letterSpacing: "-0.025em", color: "var(--welcome-text)" }}>
                Good morning, {name}.
              </h1>
              <p style={{ margin: "4px 0 0", color: "var(--welcome-muted)", fontSize: "13px" }}>
                Welcome back to your workspace. Here is your campus hiring status.
              </p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              className="date-pill"
              style={{
                display: "inline-flex",
                background: "var(--welcome-pill-bg)",
                border: "1px solid var(--welcome-pill-border)",
                color: "var(--welcome-pill-text)"
              }}
            >
              <CalendarDays size={14} /> {currentDateString}
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: "var(--welcome-muted)" }}>
              Placement Season: <b>2025-26</b>
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            marginTop: "12px",
            paddingTop: "20px",
            borderTop: "1px solid var(--welcome-border)",
            zIndex: 1
          }}
        >
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: "10px", color: "var(--welcome-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Readiness Score</span>
              <strong style={{ display: "block", fontSize: "18px", color: "var(--welcome-text)", marginTop: "2px" }}>
                {Math.round(readiness?.score ?? Number(dashboard?.placementRate ?? 0) ?? 68)}%
              </strong>
            </div>
            <div>
              <span style={{ fontSize: "10px", color: "var(--welcome-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Applications</span>
              <strong style={{ display: "block", fontSize: "18px", color: "var(--welcome-text)", marginTop: "2px" }}>
                {stats?.applications ?? Number(dashboard?.applications ?? applications.length)} Submitted
              </strong>
            </div>
            <div>
              <span style={{ fontSize: "10px", color: "var(--welcome-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Hiring Partners</span>
              <strong style={{ display: "block", fontSize: "18px", color: "var(--welcome-text)", marginTop: "2px" }}>
                {Number(dashboard?.companies ?? drives.length)} Active
              </strong>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--welcome-pill-bg)",
              border: "1px solid var(--welcome-pill-border)",
              padding: "10px 14px",
              borderRadius: "var(--r-md)"
            }}
          >
            <Sparkles size={14} style={{ color: "var(--welcome-accent)" }} />
            <span style={{ fontSize: "11px", color: "var(--welcome-accent)", fontWeight: 500 }}>
              {readiness?.reasons?.[0] ?? "Keep profiles updated before every drive."}
            </span>
          </div>
        </div>
      </div>

      <section className="hero-grid">
        <div className="card readiness-card">
          <div className="card-head">
            <div>
              <span className="card-kicker">Placement readiness</span>
              <h3>{role === "STUDENT" ? "Your current signal" : "Campus overview"}</h3>
            </div>
            <button onClick={() => onNavigate("Analytics")}>Details <ArrowUpRight size={14} /></button>
          </div>
          <div className="readiness-body">
            <ReadinessRing value={Math.round(readiness?.score ?? Number(dashboard?.placementRate ?? 0) ?? 68)} />
            <div className="score-breakdown">
              <Metric label="Applications" value={stats?.applications ?? Number(dashboard?.applications ?? applications.length)} />
              <Metric label="Open drives" value={Number(dashboard?.activeDrives ?? drives.length)} />
              <Metric label="Offers/selected" value={stats?.offers ?? Number(dashboard?.selected ?? 0)} />
              <p><Sparkles size={14} /> {readiness?.reasons?.[0] ?? "Keep profiles updated before every drive."}</p>
            </div>
          </div>
        </div>
        <div className="stats-grid">
          <Stat icon={<BriefcaseBusiness />} value={String(stats?.applications ?? dashboard?.applications ?? applications.length)} label="Applications" sub="Live from DB" tone="violet" trend="▲ +8%" />
          <Stat icon={<CalendarDays />} value={String(stats?.interviews ?? applications.filter((item) => item.interview).length)} label="Interviews" sub="Scheduled rounds" tone="mint" trend="▲ +12%" />
          <Stat icon={<Trophy />} value={String(stats?.offers ?? dashboard?.selected ?? 0)} label="Offers" sub="Selected students" tone="gold" trend="▲ +5%" />
          <Stat icon={<Building2 />} value={String(dashboard?.companies ?? drives.length)} label="Companies" sub="Engineering seed" tone="blue" trend="Live Data" />
        </div>
      </section>
      {role === "STUDENT" && dashboard?.profile && (
        <ProfileCompleteness
          student={dashboard.profile as any}
          onEditProfile={() => onNavigate("Profile")}
        />
      )}
      <section className="mid-grid">
        <div className="card applications-card">
          <div className="card-head">
            <div>
              <span className="card-kicker">Recent</span>
              <h3>Applications</h3>
            </div>
            <button onClick={() => onNavigate("Applications")}>View all <ArrowUpRight size={14} /></button>
          </div>
          <MiniApplicationList rows={applications.slice(0, 5)} />
        </div>
        <div className="card upcoming-card">
          <div className="card-head">
            <div>
              <span className="card-kicker">Action</span>
              <h3>Next best step</h3>
            </div>
          </div>
          <div className="event-date">
            <strong>{new Date().getDate()}</strong>
            <span>{new Date().toLocaleString("en", { month: "short" }).toUpperCase()}</span>
          </div>
          <div className="event-info">
            <span>{role === "STUDENT" ? "Student" : "Coordinator"}</span>
            <h4>{role === "STUDENT" ? "Apply to a matching drive" : "Review applications and schedule rounds"}</h4>
            <p>Use live modules from the sidebar.</p>
          </div>
          <button className="primary-button" onClick={() => onNavigate(role === "STUDENT" ? "Opportunities" : "Applications")}>
            Open module <ArrowUpRight size={15} />
          </button>
        </div>
      </section>
    </>
  );
}

export function Stat({
  icon,
  value,
  label,
  sub,
  tone,
  trend
}: {
  icon: ReactNode;
  value: string;
  label: string;
  sub: string;
  tone: string;
  trend?: string;
}) {
  return (
    <div className={`card stat-card tone-${tone}`}>
      <div className="stat-head">
        <span className="stat-icon">{icon}</span>
        {trend && <span className="stat-trend">{trend}</span>}
      </div>
      <strong>{value}</strong>
      <h4>{label}</h4>
      <p>{sub}</p>
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="score-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function MiniApplicationList({ rows }: { rows: Application[] }) {
  return (
    <div className="mini-applications">
      {rows.length ? (
        rows.map((item) => (
          <div className="mini-app-row" key={item.id}>
            <div className="company-logo small" style={{ overflow: "hidden", display: "grid", placeItems: "center" }}>
              {item.drive.company.logo ? (
                <img
                  src={getLogoUrl(item.drive.company.logo)!}
                  alt={item.drive.company.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                initials(item.drive.company.name)
              )}
            </div>
            <div className="mini-app-info">
              <h4>{item.drive.company.name}</h4>
              <p>{item.drive.role}</p>
            </div>
            <span className={`status-badge-compact ${item.status.toLowerCase()}`}>{item.status.replaceAll("_", " ")}</span>
          </div>
        ))
      ) : (
        <EmptyState title="No applications yet" copy="When you apply to placement drives, their progress will appear here." />
      )}
    </div>
  );
}

export function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="empty-state">
      <Sparkles size={22} />
      <strong>{title}</strong>
      <span>{copy}</span>
    </div>
  );
}
