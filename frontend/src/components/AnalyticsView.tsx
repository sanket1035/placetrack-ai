import { useState, useEffect, useMemo } from "react";
import { Users, Building2, GraduationCap, BriefcaseBusiness, Loader2, Download } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import type { DashboardData } from "../types/dashboard";
import { api, downloadExport } from "@/lib/api";
import PageTitle from "./PageTitle";
import { Stat } from "./OverviewView";

export function Analytics({
  token,
  dashboard
}: {
  token: string | null;
  dashboard: DashboardData | null;
}) {
  const [activeTab, setActiveTab] = useState<"department" | "trends" | "salary">("department");
  const [analyticsData, setAnalyticsData] = useState<{
    historicalTrends: Array<{ month: string; applications: number; placements: number }>;
    packageDistribution: { under5: number; from5to10: number; from10to15: number; above15: number };
    departmentPlacements: Array<{ branch: string; totalStudents: number; placedStudents: number; placementRate: number }>;
  } | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoadingAnalytics(true);
    api<any>("/api/reports/analytics", token)
      .then((data) => {
        setAnalyticsData(data);
      })
      .catch((err) => {
        console.warn("Failed to fetch analytical data:", err);
      })
      .finally(() => {
        setLoadingAnalytics(false);
      });
  }, [token]);

  const rows = (dashboard?.branchPerformance as Array<{ branch: string; students: number; readiness: number }> | undefined) ?? [];
  const COLORS = ["var(--info)", "var(--primary)", "var(--warning)", "var(--muted)"];

  const pieData = useMemo(() => {
    if (!analyticsData?.packageDistribution) return [];
    const dist = analyticsData.packageDistribution;
    return [
      { name: "< 5 LPA", value: dist.under5 },
      { name: "5-10 LPA", value: dist.from5to10 },
      { name: "10-15 LPA", value: dist.from10to15 },
      { name: "15+ LPA", value: dist.above15 },
    ].filter((item) => item.value > 0);
  }, [analyticsData]);

  const triggerDownload = async (type: "applications" | "students" | "drives" | "summary", format: "csv" | "json") => {
    if (!token) return;
    setDownloadingType(`${type}-${format}`);
    try {
      await downloadExport(type, format, token);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloadingType(null);
    }
  };

  return (
    <>
      <PageTitle
        eyebrow="Placement intelligence"
        title="Coordinator analytics."
        copy="Placement rate, packages, active companies, and branch readiness."
      />
      <div className="analytics-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <Stat icon={<Users />} value={String(dashboard?.students ?? 0)} label="Students" sub="Seeded profiles" tone="violet" trend="▲ +15%" />
        <Stat icon={<Building2 />} value={String(dashboard?.companies ?? 0)} label="Companies" sub="From report" tone="mint" trend="Live" />
        <Stat icon={<GraduationCap />} value={`${dashboard?.placementRate ?? 0}%`} label="Placement rate" sub="Selected/student" tone="gold" trend="▲ +2.4%" />
        <Stat icon={<BriefcaseBusiness />} value={`Rs ${Number(dashboard?.averagePackage ?? 0).toFixed(1)}L`} label="Avg package" sub={`High Rs ${Number(dashboard?.highestPackage ?? 0).toFixed(1)}L`} tone="blue" trend="▲ +0.5L" />
      </div>

      <div className="interview-tab-row" style={{ marginBottom: "20px", display: "flex", gap: "8px", borderBottom: "1px solid var(--line)", paddingBottom: "1px" }}>
        <button
          type="button"
          className={activeTab === "department" ? "interview-tab active" : "interview-tab"}
          onClick={() => setActiveTab("department")}
          style={{ padding: "10px 16px", fontSize: "13px", fontWeight: 700, cursor: "pointer", background: "none", border: "none", color: activeTab === "department" ? "var(--secondary)" : "var(--muted)", borderBottom: activeTab === "department" ? "2px solid var(--secondary)" : "none" }}
        >
          🎓 Department
        </button>
        <button
          type="button"
          className={activeTab === "trends" ? "interview-tab active" : "interview-tab"}
          onClick={() => setActiveTab("trends")}
          style={{ padding: "10px 16px", fontSize: "13px", fontWeight: 700, cursor: "pointer", background: "none", border: "none", color: activeTab === "trends" ? "var(--secondary)" : "var(--muted)", borderBottom: activeTab === "trends" ? "2px solid var(--secondary)" : "none" }}
        >
          📈 Historical Trends
        </button>
        <button
          type="button"
          className={activeTab === "salary" ? "interview-tab active" : "interview-tab"}
          onClick={() => setActiveTab("salary")}
          style={{ padding: "10px 16px", fontSize: "13px", fontWeight: 700, cursor: "pointer", background: "none", border: "none", color: activeTab === "salary" ? "var(--secondary)" : "var(--muted)", borderBottom: activeTab === "salary" ? "2px solid var(--secondary)" : "none" }}
        >
          💰 Salary Distributions
        </button>
      </div>

      {loadingAnalytics ? (
        <section className="card" style={{ padding: "40px", display: "grid", placeItems: "center" }}>
          <Loader2 className="spin" size={32} style={{ color: "var(--secondary)" }} />
          <p style={{ marginTop: "12px", color: "var(--muted)" }}>Aggregating campus trends and records...</p>
        </section>
      ) : (
        <>
          {activeTab === "department" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
              <section className="card analytics-chart" style={{ padding: "20px" }}>
                <div className="card-head" style={{ marginBottom: "14px" }}>
                  <div><span className="card-kicker">By department</span><h3>Readiness Scores</h3></div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={rows} margin={{ left: -24, right: 10, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="branch" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} />
                    <Tooltip cursor={{ fill: "var(--hover)" }} contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12 }} />
                    <Bar dataKey="readiness" fill="var(--secondary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </section>

              <section className="card analytics-chart" style={{ padding: "20px" }}>
                <div className="card-head" style={{ marginBottom: "14px" }}>
                  <div><span className="card-kicker">By department</span><h3>Selection Rates (%)</h3></div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={analyticsData?.departmentPlacements ?? []} margin={{ left: -24, right: 10, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="branch" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} />
                    <Tooltip cursor={{ fill: "var(--hover)" }} contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12 }} />
                    <Bar dataKey="placementRate" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </section>
            </div>
          )}

          {activeTab === "trends" && (
            <section className="card analytics-chart" style={{ padding: "20px" }}>
              <div className="card-head" style={{ marginBottom: "14px" }}>
                <div><span className="card-kicker">Historical</span><h3>Monthly Application & Selection Trend</h3></div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={analyticsData?.historicalTrends ?? []} margin={{ left: -20, right: 10, top: 10 }}>
                  <defs>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPlacements" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12 }} />
                  <Legend />
                  <Area type="monotone" name="Total Applications" dataKey="applications" stroke="var(--secondary)" fillOpacity={1} fill="url(#colorApps)" strokeWidth={2} />
                  <Area type="monotone" name="Selections (Placed)" dataKey="placements" stroke="var(--primary)" fillOpacity={1} fill="url(#colorPlacements)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </section>
          )}

          {activeTab === "salary" && (
            <section className="card analytics-chart" style={{ padding: "20px" }}>
              <div className="card-head" style={{ marginBottom: "14px" }}>
                <div><span className="card-kicker">Package Ranges</span><h3>LPA Salary Bracket Distribution</h3></div>
              </div>
              {pieData.length === 0 ? (
                <p style={{ color: "var(--muted)", textAlign: "center", padding: "40px" }}>No placement drive records found to group.</p>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: "20px" }}>
                  <ResponsiveContainer width="45%" height={280} minWidth={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {pieData.map((entry, index) => (
                      <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: COLORS[index % COLORS.length] }} />
                        <span style={{ fontSize: "14px", fontWeight: 600 }}>{entry.name}:</span>
                        <span style={{ color: "var(--muted)", fontSize: "14px" }}>{entry.value} Drives</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      <section className="card" style={{ marginTop: "24px", padding: "24px" }}>
        <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: "12px", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700 }}>Centralized Download Center</h3>
          <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>Download spreadsheet-ready CSV tables or raw JSON datasets for audit or college records.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          <div style={{ border: "1px solid var(--line)", padding: "16px", borderRadius: "12px", background: "var(--panel-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ fontSize: "13px", display: "block" }}>Student Placement Roster</strong>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>Complete batch readiness, CGPA, and backlog details.</span>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: "6px 10px", fontSize: "11px" }}
                disabled={!!downloadingType}
                onClick={() => triggerDownload("students", "csv")}
              >
                {downloadingType === "students-csv" ? <Loader2 className="spin" size={12} /> : <Download size={12} />} CSV
              </button>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: "6px 10px", fontSize: "11px" }}
                disabled={!!downloadingType}
                onClick={() => triggerDownload("students", "json")}
              >
                {downloadingType === "students-json" ? <Loader2 className="spin" size={12} /> : <Download size={12} />} JSON
              </button>
            </div>
          </div>

          <div style={{ border: "1px solid var(--line)", padding: "16px", borderRadius: "12px", background: "var(--panel-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ fontSize: "13px", display: "block" }}>Placement Drives Summary</strong>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>Drives metrics, packages, locations, and status records.</span>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: "6px 10px", fontSize: "11px" }}
                disabled={!!downloadingType}
                onClick={() => triggerDownload("drives", "csv")}
              >
                {downloadingType === "drives-csv" ? <Loader2 className="spin" size={12} /> : <Download size={12} />} CSV
              </button>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: "6px 10px", fontSize: "11px" }}
                disabled={!!downloadingType}
                onClick={() => triggerDownload("drives", "json")}
              >
                {downloadingType === "drives-json" ? <Loader2 className="spin" size={12} /> : <Download size={12} />} JSON
              </button>
            </div>
          </div>

          <div style={{ border: "1px solid var(--line)", padding: "16px", borderRadius: "12px", background: "var(--panel-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ fontSize: "13px", display: "block" }}>Applications Timeline Log</strong>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>Student applications, interview stages, and feedback.</span>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: "6px 10px", fontSize: "11px" }}
                disabled={!!downloadingType}
                onClick={() => triggerDownload("applications", "csv")}
              >
                {downloadingType === "applications-csv" ? <Loader2 className="spin" size={12} /> : <Download size={12} />} CSV
              </button>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: "6px 10px", fontSize: "11px" }}
                disabled={!!downloadingType}
                onClick={() => triggerDownload("applications", "json")}
              >
                {downloadingType === "applications-json" ? <Loader2 className="spin" size={12} /> : <Download size={12} />} JSON
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
