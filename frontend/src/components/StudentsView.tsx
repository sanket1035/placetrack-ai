import { useEffect, useMemo, useState } from "react";
import { Search, X, Loader2, CheckCircle2, Pencil } from "lucide-react";
import { api } from "@/lib/api";
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

/** Training & Placement Coordinators review and correct the academic details of students in their department. */
export function StudentsManager({ token, department, flash }: { token: string; department: string | null; flash: (message: string) => void }) {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<StudentRow | null>(null);

  useEffect(() => {
    setLoading(true);
    api<StudentRow[]>("/api/auth/students", token)
      .then((data) => { setRows(data); setError(""); })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load students"))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((row) => row.name.toLowerCase().includes(q) || row.user.email.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <>
      <PageTitle eyebrow="Coordinator" title="Students in your department." copy={department ? `Review and correct academic details for ${department}. Students cannot change these themselves after their first setup.` : "Review and correct academic details of students."} />
      <div className="users-manager-controls" style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <div className="search" style={{ flex: 1, minWidth: "200px" }}>
          <Search size={17} />
          <input placeholder="Search students by name or email..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      {loading ? <p className="helper-text"><Loader2 className="spin" size={14} /> Loading students...</p>
        : error ? <p className="suggestion">{error}</p>
        : filtered.length === 0 ? <EmptyState title="No students yet" copy="Students appear here after they sign in with Google and choose this department." />
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
                    <td><button className="ghost-button" onClick={() => setEditing(row)} aria-label={`Edit ${row.name}`}><Pencil size={14} /> Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
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
