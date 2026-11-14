import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Loader2, CheckCircle2, Pencil, Plus, Trash2, Upload, Download, FileSpreadsheet } from "lucide-react";
import { API_BASE, api, downloadExport } from "@/lib/api";
import { DEPARTMENTS } from "@/lib/departments";
import PageTitle from "./PageTitle";
import { EmptyState } from "./OverviewView";

type StudentRow = {
  id: string;
  name: string;
  branch: string;
  cgpa: number;
  graduationYear: number;
  backlogs: number;
  onboarded: boolean;
  user: { id: string; email: string; lastLoginAt?: string | null };
};

type ImportResult = { created: number; failed: number; errors: { row: number; reason: string }[] };

/** Training & Placement Coordinators add, import, correct, remove and export the students of their department. */
export function StudentsManager({ token, department, flash }: { token: string; department: string | null; flash: (message: string) => void }) {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () =>
    api<StudentRow[]>("/api/auth/students", token)
      .then((data) => { setRows(data); setError(""); })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load students"));

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const remove = async (row: StudentRow) => {
    if (!window.confirm(`Remove ${row.name} (${row.user.email})? Their applications and test results are deleted too. This cannot be undone.`)) return;
    setDeletingId(row.id);
    try {
      await api(`/api/auth/students/${row.id}`, token, { method: "DELETE" });
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      flash("Student removed");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not remove the student");
    } finally {
      setDeletingId("");
    }
  };

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(xlsx|csv)$/i.test(file.name)) {
      flash("Choose an .xlsx or .csv file");
      event.target.value = "";
      return;
    }
    setImporting(true);
    setImportResult(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const result = await api<ImportResult>("/api/auth/bulk-import", token, { method: "POST", body });
      setImportResult(result);
      await load();
      flash(result.failed === 0 ? `Imported ${result.created} students` : `Imported ${result.created}, ${result.failed} rows need attention`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/students/template`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!response.ok) throw new Error("Could not download the template");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "students-import-template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not download the template");
    }
  };

  const exportList = async () => {
    setExporting(true);
    try {
      await downloadExport("students", "csv", token);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((row) => row.name.toLowerCase().includes(q) || row.user.email.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <>
      <PageTitle eyebrow="Coordinator" title="Students in your department." copy={department ? `Add, import, correct, remove and export students of ${department}. Students cannot change their academic details themselves after their first setup.` : "Add, import, correct, remove and export students."} />
      <div className="users-manager-controls" style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <div className="search" style={{ flex: 1, minWidth: "200px" }}>
          <Search size={17} />
          <input placeholder="Search students by name or email..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="primary-button" onClick={() => setAdding(true)}><Plus size={16} /> Add student</button>
        <button className="secondary-button" onClick={() => fileRef.current?.click()} disabled={importing} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          {importing ? <Loader2 className="spin" size={16} /> : <Upload size={16} />} Import Excel / CSV
        </button>
        <button className="ghost-button" onClick={downloadTemplate}><FileSpreadsheet size={16} /> Template</button>
        <button className="ghost-button" onClick={exportList} disabled={exporting}>{exporting ? <Loader2 className="spin" size={16} /> : <Download size={16} />} Export list</button>
        <input ref={fileRef} type="file" accept=".xlsx,.csv" onChange={importFile} style={{ display: "none" }} />
      </div>
      {importResult && (
        <section className="card" style={{ marginBottom: "20px" }}>
          <div className="card-head">
            <div><span className="card-kicker">Import result</span><h3>{importResult.created} added{importResult.failed > 0 ? `, ${importResult.failed} skipped` : ""}</h3></div>
            <button onClick={() => setImportResult(null)} aria-label="Close"><X size={16} /></button>
          </div>
          {importResult.errors.length > 0 && (
            <ul className="helper-text" style={{ margin: 0, paddingLeft: "18px", maxHeight: "180px", overflowY: "auto" }}>
              {importResult.errors.map((item, index) => <li key={index}>Row {item.row}: {item.reason}</li>)}
            </ul>
          )}
        </section>
      )}
      {loading ? <p className="helper-text"><Loader2 className="spin" size={14} /> Loading students...</p>
        : error ? <p className="suggestion">{error}</p>
        : filtered.length === 0 ? <EmptyState title="No students yet" copy="Add a student, or import an Excel/CSV list. Students also appear here after they sign in with Google and choose this department." />
        : (
          <section className="card" style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>CGPA</th><th>Year</th><th>Backlogs</th><th>Profile</th><th></th></tr></thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.user.email}</td>
                    <td>{row.branch}</td>
                    <td>{row.cgpa > 0 ? row.cgpa : "-"}</td>
                    <td>{row.graduationYear}</td>
                    <td>{row.backlogs}</td>
                    <td>{row.onboarded ? "Complete" : "Pending"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="ghost-button" onClick={() => setEditing(row)} aria-label={`Edit ${row.name}`}><Pencil size={14} /> Edit</button>{" "}
                      <button className="ghost-button" onClick={() => remove(row)} disabled={deletingId === row.id} aria-label={`Remove ${row.name}`}>{deletingId === row.id ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />} Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      {adding && (
        <AddStudentModal
          token={token}
          department={department}
          onClose={() => setAdding(false)}
          onAdded={(row) => { setRows((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name))); flash("Student added. They can now sign in with Google using this email."); }}
        />
      )}
      {editing && (
        <EditStudentModal
          student={editing}
          token={token}
          lockDepartment={Boolean(department)}
          onClose={() => setEditing(null)}
          onSaved={(updated) => { setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row))); flash("Student updated"); }}
        />
      )}
    </>
  );
}

function EditStudentModal({ student, token, lockDepartment, onClose, onSaved }: {
  student: StudentRow; token: string; lockDepartment: boolean; onClose: () => void; onSaved: (row: StudentRow) => void;
}) {
  const [form, setForm] = useState({
    name: student.name,
    branch: student.branch === "Undeclared" ? "" : student.branch,
    cgpa: student.cgpa > 0 ? String(student.cgpa) : "",
    graduationYear: String(student.graduationYear),
    backlogs: String(student.backlogs)
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = await api<StudentRow>(`/api/auth/students/${student.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          ...(form.branch ? { branch: form.branch } : {}),
          cgpa: Number(form.cgpa),
          graduationYear: Number(form.graduationYear),
          backlogs: Number(form.backlogs)
        })
      });
      onSaved({ ...student, ...updated });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="card profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <div><span className="card-kicker">{student.user.email}</span><h3>Edit student</h3></div>
          <button onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <form onSubmit={save} className="profile-form">
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} /></label>
          <label>Department
            <select value={form.branch} disabled={lockDepartment && Boolean(form.branch)} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
              {!form.branch && <option value="" disabled>Select department</option>}
              {DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          </label>
          <label>CGPA<input type="number" step="0.01" min="0" max="10" value={form.cgpa} onChange={(e) => setForm({ ...form, cgpa: e.target.value })} required /></label>
          <label>Graduation year<input type="number" min="2024" max="2035" value={form.graduationYear} onChange={(e) => setForm({ ...form, graduationYear: e.target.value })} required /></label>
          <label>Backlogs<input type="number" min="0" max="10" value={form.backlogs} onChange={(e) => setForm({ ...form, backlogs: e.target.value })} required /></label>
          {error && <p className="suggestion" style={{ gridColumn: "1 / -1" }}>{error}</p>}
          <div className="inline-actions" style={{ gridColumn: "1 / -1", marginTop: "12px" }}>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} Save changes</button>
            <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function AddStudentModal({ token, department, onClose, onAdded }: {
  token: string; department: string | null; onClose: () => void; onAdded: (row: StudentRow) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    branch: department ?? "",
    cgpa: "",
    graduationYear: String(new Date().getFullYear() + 1),
    backlogs: "0",
    skills: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await api<StudentRow>("/api/auth/students", token, {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          ...(form.branch ? { branch: form.branch } : {}),
          cgpa: Number(form.cgpa),
          graduationYear: Number(form.graduationYear),
          backlogs: Number(form.backlogs),
          skills: form.skills.split(",").map((skill) => skill.trim()).filter(Boolean)
        })
      });
      onAdded(created);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the student");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="card profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <div><span className="card-kicker">{department ?? "Any department"}</span><h3>Add student</h3></div>
          <button onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <form onSubmit={save} className="profile-form">
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} /></label>
          <label>College email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="name@kkwagh.edu.in" /></label>
          <label>Department
            <select value={form.branch} disabled={Boolean(department)} onChange={(e) => setForm({ ...form, branch: e.target.value })} required>
              {!form.branch && <option value="" disabled>Select department</option>}
              {DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          </label>
          <label>CGPA<input type="number" step="0.01" min="0" max="10" value={form.cgpa} onChange={(e) => setForm({ ...form, cgpa: e.target.value })} required /></label>
          <label>Graduation year<input type="number" min="2024" max="2035" value={form.graduationYear} onChange={(e) => setForm({ ...form, graduationYear: e.target.value })} required /></label>
          <label>Backlogs<input type="number" min="0" max="10" value={form.backlogs} onChange={(e) => setForm({ ...form, backlogs: e.target.value })} required /></label>
          <label style={{ gridColumn: "1 / -1" }}>Skills (optional, comma separated)<input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Java, SQL, React" /></label>
          {error && <p className="suggestion" style={{ gridColumn: "1 / -1" }}>{error}</p>}
          <div className="inline-actions" style={{ gridColumn: "1 / -1", marginTop: "12px" }}>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} Add student</button>
            <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </section>
    </div>
  );
}
