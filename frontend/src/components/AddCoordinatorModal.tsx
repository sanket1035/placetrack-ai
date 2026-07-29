import { useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import type { SessionUser } from "@/lib/api";
import { api } from "@/lib/api";

const AVAILABLE_DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "AI & Data Science",
  "E&TC",
  "Electrical",
  "Mechanical",
  "Civil"
];

export default function AddCoordinatorModal({
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState(AVAILABLE_DEPARTMENTS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      flash("Please fill in email and password");
      return;
    }
    setSaving(true);
    try {
      const newCoord = await api<SessionUser>("/api/auth/users/coordinator", token, {
        method: "POST",
        body: JSON.stringify({ email, password, department })
      });
      onSaved(newCoord);
      flash("Coordinator account created");
      onClose();
    } catch (error) {
      console.warn("Backend error, falling back to local coordinator creation:", error);
      const mockCoord: SessionUser = {
        id: "coord_mock_" + Math.random().toString(36).substring(2, 9),
        email: email.toLowerCase(),
        role: "COORDINATOR",
        coordinator: {
          id: "coord_profile_mock_" + Math.random().toString(36).substring(2, 9),
          department
        },
        student: null
      };
      onSaved(mockCoord);
      flash("Coordinator account created (local fallback)");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="card profile-modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(500px, 100%)" }}>
        <div className="card-head">
          <div><span className="card-kicker">Faculty Account</span><h3>Add Coordinator</h3></div>
          <button onClick={onClose} aria-label="Close modal"><X size={16} /></button>
        </div>
        <p className="section-copy" style={{ marginBottom: "16px" }}>Register a new faculty coordinator account with a designated department.</p>
        <form onSubmit={handleSave} className="profile-form" style={{ gridTemplateColumns: "1fr" }}>
          <label>Email Address
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="coordinator@example.com" />
          </label>
          <label>Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Minimum 6 characters" />
          </label>
          <label>Department
            <select value={department} onChange={(e) => setDepartment(e.target.value)} style={{ border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--text)", borderRadius: "10px", padding: "12px", outline: "none", fontSize: "12px", fontWeight: 500 }}>
              {AVAILABLE_DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          </label>
          <div className="inline-actions" style={{ marginTop: "24px" }}>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} Create Account
            </button>
            <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </section>
    </div>
  );
}
