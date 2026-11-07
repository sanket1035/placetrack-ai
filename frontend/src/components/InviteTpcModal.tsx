import { useState } from "react";
import { X, Loader2, Send } from "lucide-react";
import type { SessionUser } from "@/lib/api";
import { api } from "@/lib/api";

export const DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "AI & Data Science",
  "E&TC",
  "Electrical",
  "Mechanical",
  "Civil"
];

/** Admin invites a Training & Placement Coordinator (TPC) for one department. They activate by signing in with Google. */
export default function InviteTpcModal({
  token,
  onClose,
  onSaved,
  flash
}: {
  token: string;
  onClose: () => void;
  onSaved: (user: SessionUser) => void;
  flash: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const invited = await api<SessionUser>("/api/auth/users/tpc", token, {
        method: "POST",
        body: JSON.stringify({ name, email, department })
      });
      onSaved(invited);
      flash(`Invitation created for ${department}`);
      onClose();
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not create the invitation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="card profile-modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(500px, 100%)" }}>
        <div className="card-head">
          <div><span className="card-kicker">Training &amp; Placement</span><h3>Invite coordinator</h3></div>
          <button onClick={onClose} aria-label="Close modal"><X size={16} /></button>
        </div>
        <p className="section-copy" style={{ marginBottom: "16px" }}>
          The coordinator signs in with this Google email and only sees students, drives and reports of the chosen department.
        </p>
        <form onSubmit={handleSave} className="profile-form" style={{ gridTemplateColumns: "1fr" }}>
          <label>Full name
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder="Prof. A. Deshmukh" />
          </label>
          <label>Google email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tpc.computer@college.edu" />
          </label>
          <label>Department
            <select value={department} onChange={(e) => setDepartment(e.target.value)}>
              {DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          </label>
          <div className="inline-actions" style={{ marginTop: "24px" }}>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? <Loader2 className="spin" size={16} /> : <Send size={16} />} Send invitation
            </button>
            <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </section>
    </div>
  );
}
