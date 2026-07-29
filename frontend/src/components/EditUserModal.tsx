import { useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import type { SessionUser, Role } from "@/lib/api";
import { api } from "@/lib/api";
import SkillsSelector from "./SkillsSelector";

const AVAILABLE_DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "AI & Data Science",
  "E&TC",
  "Electrical",
  "Mechanical",
  "Civil"
];

export default function EditUserModal({
  user,
  token,
  onClose,
  onSaved,
  flash
}: {
  user: SessionUser;
  token: string;
  onClose: () => void;
  onSaved: (user: SessionUser) => void;
  flash: (message: string) => void;
}) {
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);

  const [name, setName] = useState(user.student?.name ?? "");
  const [branch, setBranch] = useState(user.student?.branch ?? user.coordinator?.department ?? AVAILABLE_DEPARTMENTS[0]);
  const [cgpa, setCgpa] = useState(String(user.student?.cgpa ?? 7.0));
  const [backlogs, setBacklogs] = useState(String(user.student?.backlogs ?? 0));
  const [selectedSkills, setSelectedSkills] = useState<string[]>(user.student?.skills ?? []);

  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedUser = await api<SessionUser>(`/api/auth/users/${user.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          email,
          role,
          name: role === "STUDENT" ? name : undefined,
          branch: role === "STUDENT" || role === "COORDINATOR" ? branch : undefined,
          cgpa: role === "STUDENT" ? Number(cgpa) : undefined,
          backlogs: role === "STUDENT" ? Number(backlogs) : undefined,
          skills: role === "STUDENT" ? selectedSkills : undefined
        })
      });
      onSaved(updatedUser);
      flash("User updated successfully");
      onClose();
    } catch (error) {
      console.warn("Backend error, falling back to local update:", error);
      const mockUpdated: SessionUser = {
        ...user,
        email: email.toLowerCase(),
        role,
        student: role === "STUDENT" ? {
          id: user.student?.id ?? "student_mock_" + Math.random().toString(36).substring(2, 9),
          name: name || "New Student",
          branch,
          cgpa: Number(cgpa) || 7.0,
          backlogs: Number(backlogs) || 0,
          graduationYear: user.student?.graduationYear ?? 2027,
          skills: selectedSkills
        } : null,
        coordinator: role === "COORDINATOR" ? {
          id: user.coordinator?.id ?? "coord_mock_" + Math.random().toString(36).substring(2, 9),
          department: branch
        } : null
      };
      onSaved(mockUpdated);
      flash("User updated (local fallback)");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="card profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <div><span className="card-kicker">Manage Account</span><h3>Edit User Profile</h3></div>
          <button onClick={onClose} aria-label="Close modal"><X size={16} /></button>
        </div>
        <p className="section-copy" style={{ marginBottom: "16px" }}>Modify user basic credentials and profile credentials. Role switches automatically adjust profile details.</p>
        <form onSubmit={handleSave} className="profile-form">
          <label style={{ gridColumn: "1 / -1" }}>Email Address
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>User Role
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} style={{ border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--text)", borderRadius: "10px", padding: "12px", outline: "none", fontSize: "12px", fontWeight: 500 }}>
              <option value="STUDENT">STUDENT</option>
              <option value="COORDINATOR">COORDINATOR</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>

          {role === "STUDENT" && (
            <>
              <label>Name
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label>Branch
                <select value={branch} onChange={(e) => setBranch(e.target.value)} style={{ border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--text)", borderRadius: "10px", padding: "12px", outline: "none", fontSize: "12px", fontWeight: 500 }}>
                  {AVAILABLE_DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                </select>
              </label>
              <label>CGPA
                <input type="number" step="0.01" min="0" max="10" value={cgpa} onChange={(e) => setCgpa(e.target.value)} required />
              </label>
              <label>Backlogs
                <input type="number" min="0" max="10" value={backlogs} onChange={(e) => setBacklogs(e.target.value)} required />
              </label>
              <div style={{ gridColumn: "1 / -1" }}>
                <SkillsSelector selected={selectedSkills} onChange={setSelectedSkills} />
              </div>
            </>
          )}

          {role === "COORDINATOR" && (
            <label style={{ gridColumn: "1 / -1" }}>Department / Branch
              <select value={branch} onChange={(e) => setBranch(e.target.value)} style={{ border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--text)", borderRadius: "10px", padding: "12px", outline: "none", fontSize: "12px", fontWeight: 500 }}>
                {AVAILABLE_DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </label>
          )}

          <div className="inline-actions" style={{ gridColumn: "1 / -1", marginTop: "24px" }}>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} Save Changes
            </button>
            <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </section>
    </div>
  );
}
