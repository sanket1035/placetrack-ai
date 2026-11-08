"use client";

import { useState } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import { api, ApiError, downloadTestTemplate } from "@/lib/api";

type Check = { ok: boolean; count: number; sectionConfig: Record<string, number>; errors: string[] };

export default function TestUploadCard({ token, flash, onCreated }: { token: string; flash: (message: string) => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("30");
  const [file, setFile] = useState<File | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (preview: boolean) => {
    if (!file) { flash("Choose the Excel (.xlsx) or CSV file first."); return; }
    if (!preview && title.trim().length < 3) { flash("Enter a test title."); return; }
    const form = new FormData();
    form.append("file", file);
    form.append("title", title.trim());
    form.append("duration", duration);
    setBusy(true);
    try {
      const result = await api<Check & { id?: string }>(`/api/tests/import${preview ? "?preview=1" : ""}`, token, { method: "POST", body: form });
      setCheck(result);
      if (!preview) {
        flash(`Test created with ${result.count} questions.`);
        setFile(null); setTitle(""); setCheck(null);
        onCreated();
      }
    } catch (error) {
      if (error instanceof ApiError && Array.isArray(error.data?.errors)) setCheck({ ok: false, count: error.data.count ?? 0, sectionConfig: {}, errors: error.data.errors });
      else flash(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" style={{ padding: 20, marginBottom: 16, display: "grid", gap: 12 }}>
      <div>
        <strong>Add a mock test from Excel</strong>
        <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
          Download the template, fill one question per row (Section, Question, Options A to D, Correct as A/B/C/D, Explanation), then upload it here.
        </p>
      </div>
      <button type="button" className="ghost-button" style={{ width: "fit-content" }} onClick={() => downloadTestTemplate(token).catch((e) => flash(e.message))}>
        <Download size={15} /> Download template
      </button>
      <div className="grid-form">
        <label>Test title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Aptitude Mock 3" /></label>
        <label>Duration (minutes)<input type="number" min="1" max="300" value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
        <label style={{ gridColumn: "1 / -1" }}>File (.xlsx or .csv, max 2 MB)
          <input type="file" accept=".xlsx,.csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setCheck(null); }} />
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="ghost-button" disabled={busy || !file} onClick={() => send(true)}>Check file</button>
        <button type="button" className="primary-button" disabled={busy || !file} onClick={() => send(false)}>
          {busy ? <Loader2 className="spin" size={16} /> : <Upload size={16} />} Create test
        </button>
      </div>
      {check && (
        <div style={{ fontSize: 13 }}>
          {check.ok ? (
            <span style={{ color: "var(--success)" }}>
              File is valid: {check.count} questions ({Object.entries(check.sectionConfig).map(([name, n]) => `${name} ${n}`).join(", ")}).
            </span>
          ) : (
            <div style={{ color: "#b42318" }}>
              <strong>Fix these and upload again:</strong>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {check.errors.slice(0, 15).map((message) => <li key={message}>{message}</li>)}
                {check.errors.length > 15 && <li>...and {check.errors.length - 15} more.</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
