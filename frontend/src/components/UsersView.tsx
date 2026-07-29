import { useState, useRef, useMemo } from "react";
import { Search, Plus, Upload, Loader2, X } from "lucide-react";
import type { SessionUser } from "@/lib/api";
import { api } from "@/lib/api";
import { initials, pretty } from "../lib/queries";
import PageTitle from "./PageTitle";
import { EmptyState } from "./OverviewView";
import AddCoordinatorModal from "./AddCoordinatorModal";
import EditUserModal from "./EditUserModal";

export function UsersManager({
  token,
  flash,
  users,
  setUsers
}: {
  token: string;
  flash: (message: string) => void;
  users: SessionUser[];
  setUsers: React.Dispatch<React.SetStateAction<SessionUser[]>>;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "STUDENT" | "COORDINATOR" | "ADMIN">("ALL");
  const [showAddCoordinator, setShowAddCoordinator] = useState(false);
  const [editingUser, setEditingUser] = useState<SessionUser | null>(null);
  const [deletingId, setDeletingId] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ created: number; failed: number; errors: { row: number; reason: string }[] } | null>(null);

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      flash("Please upload a valid CSV file");
      e.target.value = "";
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api<{ created: number; failed: number; errors: { row: number; reason: string }[] }>(
        "/api/auth/bulk-import",
        token,
        {
          method: "POST",
          body: formData
        }
      );

      setImportResults(res);

      try {
        const freshUsers = await api<SessionUser[]>("/api/auth/users", token);
        setUsers(freshUsers);
      } catch (refreshErr) {
        console.warn("Could not reload users:", refreshErr);
      }

      if (res.failed === 0) {
        flash(`Successfully imported ${res.created} student accounts.`);
      } else {
        flash(`Import complete: ${res.created} succeeded, ${res.failed} failed.`);
      }
    } catch (error: any) {
      flash(error?.message || "CSV student import failed");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
      const q = searchTerm.toLowerCase();
      const name = u.student?.name ?? "";
      const email = u.email;
      const matchesSearch = name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchTerm]);

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This will permanently remove their profile.")) return;
    setDeletingId(id);
    try {
      await api(`/api/auth/users/${id}`, token, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      flash("User deleted successfully");
    } catch (error) {
      console.warn("Backend error, falling back to local deletion:", error);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      flash("User deleted (local fallback)");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <>
      <PageTitle eyebrow="System Administration" title="User Account Management" copy="Create coordinators, manage roles, edit user credentials and profiles." />

      <div className="users-manager-controls" style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <div className="search" style={{ flex: 1, minWidth: "200px" }}>
          <Search size={17} />
          <input
            placeholder="Search users by name, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as any)}
          style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--text)", outline: "none", fontSize: "12px" }}
        >
          <option value="ALL">All Roles</option>
          <option value="STUDENT">Students</option>
          <option value="COORDINATOR">Coordinators</option>
          <option value="ADMIN">Admins</option>
        </select>
        <button className="primary-button" onClick={() => setShowAddCoordinator(true)}>
          <Plus size={16} /> Add Coordinator
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv"
          style={{ display: "none" }}
          onChange={handleCSVImport}
        />
        <button className="secondary-button" onClick={() => fileInputRef.current?.click()} disabled={importing} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {importing ? <Loader2 className="spin" size={14} /> : <Upload size={14} />} Bulk Import Students (CSV)
        </button>
      </div>

      <div className="users-list-container" style={{ display: "grid", gap: "12px" }}>
        {filteredUsers.map((u) => (
          <div className="card user-card" key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div className="avatar">{initials(u.student?.name ?? u.email)}</div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: "15px" }}>{u.student?.name ?? (u.role === "COORDINATOR" ? "Faculty Coordinator" : u.role === "ADMIN" ? "Administrator" : u.email)}</strong>
                  <span className={`status-badge`} style={{ fontSize: "10px", padding: "2px 8px" }}>{pretty(u.role)}</span>
                </div>
                <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>{u.email}</p>
                {u.role === "STUDENT" && u.student && (
                  <div style={{ display: "flex", gap: "12px", marginTop: "6px", fontSize: "12px", color: "var(--muted)", flexWrap: "wrap" }}>
                    <span>Branch: <b>{u.student.branch}</b></span>
                    <span>CGPA: <b>{u.student.cgpa}</b></span>
                    <span>Backlogs: <b>{u.student.backlogs}</b></span>
                    {u.student.skills && u.student.skills.length > 0 && (
                      <span style={{ display: "inline-flex", gap: "4px", flexWrap: "wrap" }}>
                        Skills: {u.student.skills.slice(0, 3).map(s => <b key={s} style={{ background: "var(--hover)", padding: "1px 4px", borderRadius: "4px" }}>{s}</b>)}
                        {u.student.skills.length > 3 && ` +${u.student.skills.length - 3}`}
                      </span>
                    )}
                  </div>
                )}
                {u.role === "COORDINATOR" && u.coordinator && (
                  <div style={{ display: "flex", gap: "12px", marginTop: "6px", fontSize: "12px", color: "var(--muted)" }}>
                    <span>Department: <b>{u.coordinator.department}</b></span>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="secondary-button" onClick={() => setEditingUser(u)}>Edit</button>
              <button className="secondary-button" style={{ color: "var(--error)", borderColor: "rgba(255, 107, 107, 0.2)" }} disabled={deletingId === u.id} onClick={() => handleDeleteUser(u.id)}>
                {deletingId === u.id ? <Loader2 className="spin" size={12} /> : "Delete"}
              </button>
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <EmptyState title="No users found" copy="No student or coordinator accounts match your search filters." />
        )}
      </div>

      {showAddCoordinator && (
        <AddCoordinatorModal
          token={token}
          onClose={() => setShowAddCoordinator(false)}
          onSaved={(newCoord) => {
            setUsers((prev) => [...prev, newCoord]);
          }}
          flash={flash}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          token={token}
          onClose={() => setEditingUser(null)}
          onSaved={(updatedUser) => {
            setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
          }}
          flash={flash}
        />
      )}

      {importResults && (
        <div className="modal-backdrop" onClick={() => setImportResults(null)}>
          <div className="card drive-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="drive-modal-header">
              <div>
                <h2 style={{ margin: 0 }}>Import Results</h2>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--muted)" }}>Bulk Student CSV Import Summary</p>
              </div>
              <button className="drive-modal-close-btn" onClick={() => setImportResults(null)} aria-label="Close modal"><X size={16} /></button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "16px 0" }}>
              <div style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.15)", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Created</span>
                <h2 style={{ margin: "4px 0 0", color: "#22c55e", fontSize: "28px" }}>{importResults.created}</h2>
              </div>
              <div style={{ background: importResults.failed > 0 ? "rgba(239, 68, 68, 0.1)" : "rgba(255, 255, 255, 0.03)", border: importResults.failed > 0 ? "1px solid rgba(239, 68, 68, 0.15)" : "1px solid var(--line)", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Failed</span>
                <h2 style={{ margin: "4px 0 0", color: importResults.failed > 0 ? "#ef4444" : "var(--text)", fontSize: "28px" }}>{importResults.failed}</h2>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <strong style={{ fontSize: "13px", display: "block", marginBottom: "8px", color: "var(--text)" }}>Import Failures & Reasons</strong>
                <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid var(--line)", borderRadius: "8px", background: "var(--panel-2)" }}>
                  {importResults.errors.map((err, idx) => (
                    <div key={idx} style={{ padding: "8px 12px", borderBottom: idx < importResults.errors.length - 1 ? "1px solid var(--line)" : "none", display: "flex", gap: "10px", fontSize: "12px" }}>
                      <span style={{ color: "var(--error)", fontWeight: 700 }}>Row {err.row}:</span>
                      <span style={{ color: "var(--muted)" }}>{err.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className="primary-button" style={{ width: "100%", marginTop: "20px" }} onClick={() => setImportResults(null)}>
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
