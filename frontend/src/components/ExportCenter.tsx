"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  FileJson,
  FileDown,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  BriefcaseBusiness,
  Building2,
  BarChart3,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { downloadExport, fetchExportData, type ExportReportType } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ExportFormat = "csv" | "json" | "pdf";

interface FormatCard {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ElementType;
  accent: string;
  bg: string;
  border: string;
}

interface ReportCard {
  id: ExportReportType;
  label: string;
  description: string;
  icon: React.ElementType;
  coordinatorOnly?: boolean;
}

// ─── Static config ─────────────────────────────────────────────────────────────

const FORMAT_CARDS: FormatCard[] = [
  {
    id: "csv",
    label: "CSV",
    description: "Spreadsheet-ready flat file. Open in Excel, Google Sheets or any data tool.",
    icon: FileText,
    accent: "hsl(142, 71%, 45%)",
    bg: "hsl(142, 40%, 8%)",
    border: "hsl(142, 40%, 20%)",
  },
  {
    id: "json",
    label: "JSON",
    description: "Structured data with metadata envelope. Ideal for programmatic processing.",
    icon: FileJson,
    accent: "hsl(221, 83%, 60%)",
    bg: "hsl(221, 40%, 8%)",
    border: "hsl(221, 40%, 20%)",
  },
  {
    id: "pdf",
    label: "PDF",
    description: "Polished report for sharing, printing and offline record keeping.",
    icon: FileDown,
    accent: "hsl(349, 84%, 60%)",
    bg: "hsl(349, 40%, 8%)",
    border: "hsl(349, 40%, 20%)",
  },
];

const REPORT_CARDS: ReportCard[] = [
  {
    id: "applications",
    label: "Applications",
    description: "All placement applications with student info, company, status and interview dates.",
    icon: BriefcaseBusiness,
    coordinatorOnly: true,
  },
  {
    id: "students",
    label: "Students",
    description: "Full student roster — CGPA, branch, readiness score, skills and activity counts.",
    icon: Users,
    coordinatorOnly: true,
  },
  {
    id: "drives",
    label: "Drives",
    description: "Placement drives listing with company, package, eligibility criteria and status.",
    icon: Building2,
    coordinatorOnly: false,
  },
  {
    id: "summary",
    label: "Placement Summary",
    description: "Aggregate statistics — placement rate, average package, active drives.",
    icon: BarChart3,
    coordinatorOnly: true,
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function generatePdf(reportType: ExportReportType, token: string): Promise<void> {
  // Dynamic import keeps jsPDF out of the initial bundle.
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const data = await fetchExportData(reportType, token);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const date = new Date().toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric",
  });
  const title = REPORT_CARDS.find((r) => r.id === reportType)?.label ?? "Report";
  const reportTitle = `PlaceTrack AI — ${title}`;

  // Header bar
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, 297, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(reportTitle, 10, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 174, 192);
  doc.text(`Generated: ${date}`, 230, 13);

  // Build table columns and rows
  type ColDef = { header: string; dataKey: string };
  let columns: ColDef[] = [];
  let rows: Record<string, unknown>[] = [];

  if (reportType === "summary") {
    const summary = data.summary as Record<string, unknown>;
    columns = [
      { header: "Metric", dataKey: "metric" },
      { header: "Value", dataKey: "value" },
    ];
    rows = Object.entries(summary).map(([k, v]) => ({
      metric: k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
      value: String(v),
    }));
  } else if (reportType === "applications") {
    columns = [
      { header: "Student", dataKey: "student" },
      { header: "Branch", dataKey: "branch" },
      { header: "Company", dataKey: "company" },
      { header: "Role", dataKey: "role" },
      { header: "Pkg (LPA)", dataKey: "packageLpa" },
      { header: "Status", dataKey: "status" },
      { header: "Applied At", dataKey: "appliedAt" },
    ];
    rows = ((data.data ?? []) as any[]).map((item) => ({
      student: item.student?.name ?? "",
      branch: item.student?.branch ?? "",
      company: item.drive?.company ?? "",
      role: item.drive?.role ?? "",
      packageLpa: item.drive?.packageLpa ?? "",
      status: item.status ?? "",
      appliedAt: item.appliedAt ? new Date(item.appliedAt).toLocaleDateString("en-IN") : "",
    }));
  } else if (reportType === "students") {
    columns = [
      { header: "Name", dataKey: "name" },
      { header: "Branch", dataKey: "branch" },
      { header: "CGPA", dataKey: "cgpa" },
      { header: "Batch", dataKey: "graduationYear" },
      { header: "Readiness", dataKey: "readinessScore" },
      { header: "Applications", dataKey: "applicationCount" },
      { header: "Skills", dataKey: "skills" },
    ];
    rows = ((data.data ?? []) as any[]).map((item) => ({
      name: item.name ?? "",
      branch: item.branch ?? "",
      cgpa: item.cgpa ?? "",
      graduationYear: item.graduationYear ?? "",
      readinessScore: item.readinessScore ?? "",
      applicationCount: item.applicationCount ?? "",
      skills: Array.isArray(item.skills) ? item.skills.slice(0, 3).join(", ") : "",
    }));
  } else {
    // drives
    columns = [
      { header: "Company", dataKey: "company" },
      { header: "Role", dataKey: "role" },
      { header: "Pkg (LPA)", dataKey: "packageLpa" },
      { header: "Location", dataKey: "location" },
      { header: "Status", dataKey: "status" },
      { header: "Min CGPA", dataKey: "minCgpa" },
      { header: "Applications", dataKey: "applicationCount" },
    ];
    rows = ((data.data ?? []) as any[]).map((item) => ({
      company: item.company ?? "",
      role: item.role ?? "",
      packageLpa: item.packageLpa ?? "",
      location: item.location ?? "",
      status: item.status ?? "",
      minCgpa: item.minCgpa ?? "",
      applicationCount: item.applicationCount ?? "",
    }));
  }

  autoTable(doc, {
    startY: 26,
    columns,
    body: rows as any[],
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8.5, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    styles: { cellPadding: 3, lineColor: [200, 210, 220], lineWidth: 0.25 },
    margin: { left: 10, right: 10 },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}  •  PlaceTrack AI — Confidential`,
      148,
      203,
      { align: "center" }
    );
  }

  const date2 = new Date().toISOString().slice(0, 10);
  doc.save(`placetrack-${reportType}-${date2}.pdf`);
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface ExportCenterProps {
  token: string | null;
  role: string;
  flash: (msg: string) => void;
}

export default function ExportCenter({ token, role, flash }: ExportCenterProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [selectedReport, setSelectedReport] = useState<ExportReportType | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isCoordinator = role === "TPC" || role === "ADMIN";

  const availableReports = isCoordinator
    ? REPORT_CARDS
    : REPORT_CARDS.filter((r) => !r.coordinatorOnly);

  const pdfSupportedReports: ExportReportType[] = [
    "applications", "students", "drives", "summary",
  ];
  const isPdfSupported =
    selectedFormat !== "pdf" ||
    !selectedReport ||
    pdfSupportedReports.includes(selectedReport);

  const canExport =
    selectedFormat !== null &&
    selectedReport !== null &&
    isPdfSupported &&
    status !== "loading";

  const handleExport = async () => {
    if (!selectedFormat || !selectedReport || !token) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      if (selectedFormat === "pdf") {
        await generatePdf(selectedReport, token);
      } else {
        await downloadExport(selectedReport, selectedFormat, token);
      }
      setStatus("success");
      flash(`✓ ${selectedReport} ${selectedFormat.toUpperCase()} exported successfully`);
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err: any) {
      const msg = err?.message ?? "Export failed. Please try again.";
      setStatus("error");
      setErrorMsg(msg);
      flash(msg);
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100%", padding: "0 0 40px" }}>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, var(--primary), var(--primary-dim))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--bg)"
            }}
          >
            <Download size={20} color="currentColor" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>
              Export Center
            </h1>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.55 }}>
              Generate and download placement reports in your preferred format.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Step 1: Choose Format ─── */}
      <SectionLabel step={1} label="Choose Export Format" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14, marginBottom: 32 }}>
        {FORMAT_CARDS.map((card) => (
          <FormatCardButton
            key={card.id}
            card={card}
            selected={selectedFormat === card.id}
            onSelect={() => setSelectedFormat(card.id)}
          />
        ))}
      </div>

      {/* ─── Step 2: Choose Report Type ─── */}
      <SectionLabel step={2} label="Choose Report Type" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14, marginBottom: 36 }}>
        {availableReports.map((card) => {
          const disabled = selectedFormat === "pdf" && card.id === "summary" && false; // summary always allowed in PDF
          return (
            <ReportCardButton
              key={card.id}
              card={card}
              selected={selectedReport === card.id}
              disabled={disabled}
              onSelect={() => !disabled && setSelectedReport(card.id)}
            />
          );
        })}
      </div>

      {/* ─── Step 3: Export ─── */}
      <SectionLabel step={3} label="Generate & Download" />
      <ExportPreview
        format={selectedFormat}
        report={selectedReport}
        reportCards={REPORT_CARDS}
        formatCards={FORMAT_CARDS}
      />

      {/* Export button */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 20 }}>
        <motion.button
          whileHover={canExport ? { scale: 1.02 } : {}}
          whileTap={canExport ? { scale: 0.98 } : {}}
          onClick={handleExport}
          disabled={!canExport}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "13px 28px",
            borderRadius: 12,
            border: "none",
            cursor: canExport ? "pointer" : "not-allowed",
            background: canExport
              ? "linear-gradient(135deg, var(--primary), var(--primary-dim))"
              : "var(--panel-3)",
            color: canExport ? "var(--bg)" : "var(--muted)",
            fontWeight: 700,
            fontSize: 15,
            opacity: canExport ? 1 : 0.5,
            transition: "background 0.2s, opacity 0.2s",
            boxShadow: canExport
              ? "var(--shadow-glow)"
              : "none",
          }}
        >
          {status === "loading" ? (
            <Loader2 size={18} className="spin" />
          ) : status === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <Download size={18} />
          )}
          {status === "loading"
            ? "Generating…"
            : status === "success"
            ? "Downloaded!"
            : "Export Report"}
          {canExport && status === "idle" && <ArrowRight size={16} />}
        </motion.button>

        <AnimatePresence>
          {status === "error" && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "hsl(349,84%,60%)",
                fontWeight: 500,
              }}
            >
              <AlertCircle size={15} />
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Coordinator notice */}
      {!isCoordinator && (
        <div
          style={{
            marginTop: 24,
            padding: "12px 16px",
            borderRadius: 10,
            background: "hsla(221,83%,55%,0.08)",
            border: "1px solid hsla(221,83%,55%,0.2)",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "hsl(221,83%,70%)",
          }}
        >
          <Sparkles size={15} />
          Some report types are restricted to Training & Placement Coordinators and Admins. Contact your TPC to request a full export.
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ step, label }: { step: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--primary), var(--primary-dim))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--bg)",
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {step}
      </div>
      <span style={{ fontWeight: 600, fontSize: 15 }}>{label}</span>
    </div>
  );
}

function FormatCardButton({
  card,
  selected,
  onSelect,
}: {
  card: FormatCard;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = card.icon;
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      style={{
        textAlign: "left",
        padding: "18px 18px 16px",
        borderRadius: 14,
        border: `2px solid ${selected ? card.accent : card.border}`,
        background: selected
          ? `linear-gradient(135deg, ${card.bg}, ${card.bg}cc)`
          : "hsla(0,0%,100%,0.03)",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
        boxShadow: selected
          ? `0 0 0 3px ${card.accent}22, 0 4px 20px ${card.accent}18`
          : "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {selected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: card.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckCircle2 size={12} color="#fff" />
        </motion.div>
      )}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${card.accent}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Icon size={20} color={card.accent} />
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: selected ? card.accent : "inherit" }}>
        {card.label}
      </div>
      <div style={{ fontSize: 12, opacity: 0.55, lineHeight: 1.5 }}>
        {card.description}
      </div>
    </motion.button>
  );
}

function ReportCardButton({
  card,
  selected,
  disabled,
  onSelect,
}: {
  card: ReportCard;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const Icon = card.icon;
  const accent = "hsl(221,83%,60%)";
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      onClick={onSelect}
      style={{
        textAlign: "left",
        padding: "18px 18px 16px",
        borderRadius: 14,
        border: `2px solid ${selected ? accent : "hsla(0,0%,100%,0.1)"}`,
        background: selected
          ? "hsla(221,83%,55%,0.1)"
          : "hsla(0,0%,100%,0.03)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "border-color 0.15s, background 0.15s",
        boxShadow: selected
          ? `0 0 0 3px ${accent}22, 0 4px 20px ${accent}18`
          : "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {selected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckCircle2 size={12} color="#fff" />
        </motion.div>
      )}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: selected ? `${accent}22` : "hsla(0,0%,100%,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Icon size={20} color={selected ? accent : "hsla(0,0%,100%,0.6)"} />
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: selected ? accent : "inherit" }}>
        {card.label}
      </div>
      <div style={{ fontSize: 12, opacity: 0.55, lineHeight: 1.5 }}>
        {card.description}
      </div>
    </motion.button>
  );
}

function ExportPreview({
  format,
  report,
  reportCards,
  formatCards,
}: {
  format: ExportFormat | null;
  report: ExportReportType | null;
  reportCards: ReportCard[];
  formatCards: FormatCard[];
}) {
  const fmt = formatCards.find((f) => f.id === format);
  const rpt = reportCards.find((r) => r.id === report);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${format}-${report}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18 }}
        style={{
          padding: "16px 20px",
          borderRadius: 12,
          border: "1px solid hsla(0,0%,100%,0.08)",
          background: "hsla(0,0%,100%,0.03)",
          fontSize: 13,
          minHeight: 52,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {!format && !report ? (
          <span style={{ opacity: 0.4 }}>Select a format and report type above to preview your export.</span>
        ) : (
          <>
            <FileDown size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
            <span style={{ opacity: 0.65 }}>
              {rpt ? (
                <>
                  <strong style={{ opacity: 1 }}>{rpt.label}</strong>
                  {" report "}
                </>
              ) : (
                "Select a report type "
              )}
              {fmt ? (
                <>
                  {"as "}
                  <strong style={{ color: fmt.accent }}>{fmt.label}</strong>
                </>
              ) : (
                "— select a format"
              )}
              {format && report && (
                <> · filename: <code style={{ opacity: 0.8 }}>placetrack-{report}-{new Date().toISOString().slice(0, 10)}.{format}</code></>
              )}
            </span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
