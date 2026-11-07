"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ElementType, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CircleUserRound, Command, LayoutDashboard, Loader2, LogOut, Menu,
  RotateCw, Search, X, BriefcaseBusiness, Building2, FileScan, BookOpenCheck,
  Sparkles, Gauge, Users, Target, Download, Plus, CheckCircle2, ArrowUpRight,
  Sun, Moon, Upload, Send, CalendarDays, Trophy, Share2, Trash2
} from "lucide-react";
import { api, type LoginResponse, type Role, type SessionUser } from "@/lib/api";
import { NotificationBell } from "./NotificationBell";
import { useNotifications } from "../hooks/useNotifications";
import PracticeView from "./PracticeView";
import ExportCenter from "./ExportCenter";
import { useProfileExport } from "../hooks/useProfileExport";
import ProfileCardExport from "./ProfileCardExport";

import type {
  View, Drive, Application, TestSummary, DashboardData, FilterCondition
} from "../types/dashboard";
import {
  applyFilterConditions, getLogoUrl, initials, calculateEligibility, pretty
} from "../lib/queries";
import SkillsSelector from "./SkillsSelector";

import { LoginScreen } from "./LoginScreen";
import { HighlightedTitle } from "./ui/Highlight";
import { Overview } from "./OverviewView";
import { Applications } from "./ApplicationsView";
import { Opportunities } from "./OpportunitiesView";
import { Analytics } from "./AnalyticsView";
import { UsersManager } from "./UsersView";
import { DriveCreator } from "./DriveCreatorView";

const AVAILABLE_DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "AI & Data Science",
  "E&TC",
  "Electrical",
  "Mechanical",
  "Civil"
];

const navIcons: Record<View, ElementType> = {
  Overview: LayoutDashboard,
  Applications: BriefcaseBusiness,
  Opportunities: Building2,
  "Resume AI": FileScan,
  Aptitude: BookOpenCheck,
  Interview: Sparkles,
  Profile: CircleUserRound,
  "Drive Creator": Plus,
  Analytics: Gauge,
  Users: Users,
  Practice: Target,
  "Export Center": Download,
};

function readStorage(key: string) {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // App still works for the current session if browser storage is unavailable.
  }
}

function removeStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<View>("Overview");
  const [notice, setNotice] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [usersList, setUsersList] = useState<SessionUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDrive, setSelectedDrive] = useState<Drive | null>(null);
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);

  const initialNotifications = useMemo(() => user?.notifications || [], [user?.notifications]);
  const { notifications, markAsRead, markAllAsRead } = useNotifications(token, initialNotifications);

  const role = user?.role ?? "STUDENT";
  const nav = useMemo(() => {
    const base: View[] = ["Overview", "Applications", "Opportunities", "Resume AI", "Aptitude", "Profile"];
    if (role !== "STUDENT") base.push("Interview", "Drive Creator", "Analytics");
    if (role === "STUDENT") base.push("Interview", "Practice");
    if (role === "ADMIN") base.push("Users");
    base.push("Export Center");
    return base;
  }, [role]);

  useEffect(() => {
    const savedToken = readStorage("placetrack-token");
    if (savedToken) {
      api<SessionUser>("/api/auth/me", savedToken)
        .then((freshUser) => {
          setToken(savedToken);
          setUser(freshUser);
          writeStorage("placetrack-user", JSON.stringify(freshUser));
        })
        .catch(() => {
          removeStorage("placetrack-token");
          removeStorage("placetrack-user");
        });
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    refreshAll(token).catch((error) => flash(error.message));
  }, [token]);

  useEffect(() => {
    const handler = (event: MouseEvent | PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest?.("button[data-view]") as HTMLButtonElement | null;
      const next = button?.dataset.view as View | undefined;
      if (!next) return;
      setView(next);
      setMenuOpen(false);
    };
    document.addEventListener("click", handler);
    document.addEventListener("pointerup", handler);
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("pointerup", handler);
    };
  }, []);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  };

  const refreshAll = async (activeToken = token) => {
    if (!activeToken) return;
    setLoading(true);
    try {
      const isAdmin = user?.role === "ADMIN" || (typeof window !== "undefined" && (() => {
        try {
          const storedUser = JSON.parse(window.localStorage.getItem("placetrack-user") || "{}");
          return storedUser.role === "ADMIN";
        } catch { return false; }
      })());

      const [dashboardData, driveRows, applicationResponse, testRows] = await Promise.all([
        api<DashboardData>("/api/dashboard", activeToken),
        api<Drive[]>("/api/drives", activeToken),
        api<any>("/api/applications", activeToken),
        api<TestSummary[]>("/api/tests", activeToken)
      ]);
      setDashboard(dashboardData);
      setDrives(driveRows);
      
      const appRows = Array.isArray(applicationResponse)
        ? applicationResponse
        : (applicationResponse?.items ?? []);
      setApplications(appRows);
      setTests(testRows);

      if (isAdmin) {
        const userRows = await api<SessionUser[]>("/api/auth/users", activeToken);
        setUsersList(userRows);
      }
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not load data. Check your connection.");
        } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setLoading(true);
    try {
      const session = await api<LoginResponse>("/api/auth/google", null, {
        method: "POST",
        body: JSON.stringify({ credential })
      });
      setToken(session.token);
      setUser(session.user);
      writeStorage("placetrack-token", session.token);
      writeStorage("placetrack-user", JSON.stringify(session.user));
      if (session.user.role === "STUDENT" && session.user.student && !session.user.student.onboarded) setView("Profile");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeStorage("placetrack-token");
    removeStorage("placetrack-user");
    setToken(null);
    setUser(null);
    setDashboard(null);
  };

  const refreshMe = async (activeToken = token) => {
    if (!activeToken) return;
    const freshUser = await api<SessionUser>("/api/auth/me", activeToken);
    setUser(freshUser);
    writeStorage("placetrack-user", JSON.stringify(freshUser));
  };

  const drivesWithEligibility = useMemo(() => {
    return drives.map((drive) => {
      const eligibility = calculateEligibility(drive, user?.student);
      return {
        ...drive,
        eligibility
      };
    });
  }, [drives, user]);

  // Client-side search + advanced filter conditions
  const filteredDrives = useMemo(() => {
    let result: Drive[] = drivesWithEligibility;
    // Global search bar (used on Overview / Aptitude tabs)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) =>
        d.company.name.toLowerCase().includes(q) ||
        d.role.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q)
      );
    }
    // Advanced multi-condition filter (Opportunities tab)
    result = applyFilterConditions(result, filterConditions);
    return result;
  }, [drivesWithEligibility, searchQuery, filterConditions]);

  const filteredApplications = useMemo(() => {
    if (!searchQuery) return applications;
    const q = searchQuery.toLowerCase();
    return applications.filter((a) =>
      a.drive.company.name.toLowerCase().includes(q) ||
      a.drive.role.toLowerCase().includes(q) ||
      (a.student?.name || "").toLowerCase().includes(q)
    );
  }, [applications, searchQuery]);

  const filteredTests = useMemo(() => {
    if (!searchQuery) return tests;
    const q = searchQuery.toLowerCase();
    return tests.filter((t) =>
      t.title.toLowerCase().includes(q)
    );
  }, [tests, searchQuery]);

  if (!user || !token) {
    return <LoginScreen loading={loading} onGoogleCredential={handleGoogleCredential} />;
  }

  const name = user.student?.name ?? user.name ?? user.coordinator?.department ?? (role === "ADMIN" ? "Admin Console" : user.email);

  return (
    <main className="app light">
      <AnimatePresence>{notice && <motion.div className="toast" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }}>{notice}</motion.div>}</AnimatePresence>
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <button className="mobile-close" onClick={() => setMenuOpen(false)}><X /></button>
        <div className="brand"><div className="brand-mark"><Command size={20} /></div><span>PlaceTrack <b>AI</b></span></div>
        <div className="profile-card">
          <div className="avatar">{initials(name)}</div>
          <div><strong>{name}</strong><span>{role} {user.student ? `· ${user.student.branch}` : ""}</span></div>
        </div>
        <nav>
          <p className="nav-label">Workspace</p>
          {nav.map((item) => {
            const Icon = navIcons[item];
            return <button
              type="button"
              data-view={item}
              className={view === item ? "active" : ""}
              onClick={() => { setView(item); setMenuOpen(false); }}
              onPointerUp={() => { setView(item); setMenuOpen(false); }}
              key={item}
            ><Icon size={18} /><span>{item}</span></button>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={logout}><LogOut size={18} /> Logout</button>
        </div>
      </aside>

      <section className="workspace">
        <header>
          <button className="menu-button" onClick={() => setMenuOpen(true)}><Menu /></button>
          <div className="search">
            <Search size={17} />
            <input
              placeholder="Search drives, companies, tests..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <kbd>Ctrl + K</kbd>
          </div>
          <div className="header-actions">
            <button onClick={() => refreshAll()} aria-label="Refresh">{loading ? <Loader2 className="spin" size={18} /> : <RotateCw size={18} />}</button>
            <NotificationBell notifications={notifications} markAsRead={markAsRead} markAllAsRead={markAllAsRead} onNavigate={setView} />
            <button className="user-button" onClick={() => setProfileOpen(true)} aria-label="Open profile"><CircleUserRound size={22} /></button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div className="content" key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .22 }}>
            {view === "Overview" && <Overview role={role} name={name} dashboard={dashboard} applications={filteredApplications} drives={filteredDrives} onNavigate={setView} loading={loading} />}
            {view === "Applications" && <Applications role={role} token={token} applications={filteredApplications} onRefresh={() => refreshAll()} flash={flash} loading={loading} />}
            {view === "Opportunities" && <Opportunities role={role} token={token} drives={filteredDrives} onRefresh={() => refreshAll()} onNavigate={setView} flash={flash} onViewDrive={setSelectedDrive} loading={loading} filterConditions={filterConditions} setFilterConditions={setFilterConditions} allDrives={drivesWithEligibility} />}
            {view === "Resume AI" && <ResumeAI token={token} flash={flash} />}
            {view === "Aptitude" && <Aptitude token={token} role={role} tests={filteredTests} flash={flash} />}
            {view === "Interview" && <InterviewCoach token={token} flash={flash} />}
            {view === "Profile" && <ProfilePage user={user} token={token} onSaved={async () => { await refreshMe(); await refreshAll(); flash("Profile updated"); }} flash={flash} dashboard={dashboard} />}
            {view === "Drive Creator" && <DriveCreator token={token} flash={flash} onCreated={() => refreshAll()} drives={drives} />}
            {view === "Analytics" && <Analytics token={token} dashboard={dashboard} />}
            {view === "Users" && <UsersManager token={token} flash={flash} users={usersList} setUsers={setUsersList} />}
            {view === "Practice" && <PracticeView token={token} flash={flash} />}
            {view === "Export Center" && <ExportCenter token={token} role={role} flash={flash} />}
          </motion.div>
        </AnimatePresence>
      </section>
      {profileOpen && <ProfileModal user={user} token={token} onClose={() => setProfileOpen(false)} onSaved={async () => { await refreshMe(); await refreshAll(); flash("Profile updated"); }} flash={flash} />}
      {selectedDrive && <DriveDetailsModal drive={selectedDrive} role={role} token={token} onClose={() => setSelectedDrive(null)} onApplied={() => { refreshAll(); setSelectedDrive(null); }} flash={flash} />}
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}
    </main>
  );
}

function DriveDetailsModal({ drive, role, token, onClose, onApplied, flash }: {
  drive: Drive;
  role: Role;
  token: string;
  onClose: () => void;
  onApplied: () => void;
  flash: (message: string) => void;
}) {
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<{ message: string; reasons?: string[] } | null>(null);

  const apply = async () => {
    setApplying(true);
    setApplyError(null);
    try {
      await api("/api/applications", token, { method: "POST", body: JSON.stringify({ driveId: drive.id }) });
      flash("Application submitted successfully!");
      onApplied();
    } catch (error: any) {
      const reasons = error?.reasons ?? (Array.isArray(error?.data?.reasons) ? error.data.reasons : undefined);
      const msg = error instanceof Error ? error.message : "Could not submit application";
      setApplyError({ message: msg, reasons });
      if (reasons && reasons.length > 0) {
        flash(`Application rejected: ${reasons.join(". ")}`);
      } else {
        flash(msg);
      }
    } finally {
      setApplying(false);
    }
  };

  const isEligible = drive.eligibility?.eligible !== false;

  const [deleting, setDeleting] = useState(false);
  const deleteDrive = async () => {
    if (!window.confirm(`Are you sure you want to delete the placement drive for ${drive.company.name} (${drive.role})? This will permanently delete all associated student applications.`)) {
      return;
    }
    setDeleting(true);
    try {
      await api(`/api/drives/${drive.id}`, token, { method: "DELETE" });
      flash("Drive deleted successfully");
      onApplied();
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not delete drive");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card drive-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="drive-modal-header">
          <div className="drive-modal-company-info">
            <div className="company-logo large" style={{ overflow: "hidden", display: "grid", placeItems: "center" }}>
              {drive.company.logo ? (
                <img src={getLogoUrl(drive.company.logo)!} alt={drive.company.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                initials(drive.company.name)
              )}
            </div>
            <div>
              <h2>{drive.company.name}</h2>
              <p>{drive.role}</p>
            </div>
          </div>
          <button className="drive-modal-close-btn" onClick={onClose} aria-label="Close modal"><X size={16} /></button>
        </div>

        <div className={isEligible ? "drive-eligibility-card" : "drive-eligibility-card ineligible"}>
          <div className="drive-eligibility-header">
            <div>
              <span className="card-kicker">Check Eligibility</span>
              <h3 style={{ margin: "4px 0 0" }}>{isEligible ? "✓ Eligible to Apply" : "✗ Not Eligible"}</h3>
            </div>
            <span className={isEligible ? "drive-eligibility-status eligible" : "drive-eligibility-status ineligible"}>
              {isEligible ? "Eligible" : "Not Eligible"}
            </span>
          </div>
          {!isEligible && drive.eligibility?.reasons && drive.eligibility.reasons.length > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: "20px", fontSize: "12px", color: "var(--warning, #f7bd4e)", display: "grid", gap: "2px" }}>
              {drive.eligibility.reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          )}
        </div>

        {applyError && (
          <div
            className="warning-box"
            style={{
              marginTop: "12px",
              padding: "12px 16px",
              borderRadius: "10px",
              background: "rgba(255, 77, 79, 0.1)",
              border: "1px solid rgba(255, 77, 79, 0.3)",
              color: "#ff4d4f"
            }}
          >
            <strong style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>
              ⚠️ {applyError.message}
            </strong>
            {applyError.reasons && applyError.reasons.length > 0 && (
              <ul style={{ margin: "6px 0 0", paddingLeft: "20px", fontSize: "12px", display: "grid", gap: "4px" }}>
                {applyError.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="drive-details-grid">
          <div className="drive-detail-section">
            <h4>Package</h4>
            <p>Rs {drive.package} LPA</p>
          </div>
          <div className="drive-detail-section">
            <h4>Location</h4>
            <p>{drive.location}</p>
          </div>
          <div className="drive-detail-section">
            <h4>Min CGPA</h4>
            <p>{drive.minCgpa}</p>
          </div>
          <div className="drive-detail-section">
            <h4>Allowed Branches</h4>
            <p>{drive.allowedBranches.join(", ")}</p>
          </div>
          <div className="drive-detail-section">
            <h4>Deadline</h4>
            <p>{new Date(drive.deadline).toLocaleDateString()}</p>
          </div>
          <div className="drive-detail-section">
            <h4>Job Type</h4>
            <p>{drive.jobType}</p>
          </div>
        </div>

        <div className="drive-detail-section">
          <h4>Job Description</h4>
          <div className="drive-description-box">
            {drive.description || "No detailed description available."}
          </div>
        </div>

        <div className="inline-actions" style={{ marginTop: "8px", flexDirection: "column", gap: "10px" }}>
          {role === "STUDENT" && drive.alreadyApplied ? (
            <button className="secondary-button" disabled style={{ width: "100%" }}>
              Already applied <CheckCircle2 size={15} />
            </button>
          ) : role === "STUDENT" ? (
            <button
              className="primary-button"
              disabled={!isEligible || applying}
              onClick={apply}
              style={{ width: "100%", padding: "12px" }}
            >
              {applying ? <Loader2 className="spin" size={16} /> : <ArrowUpRight size={16} />} Apply Now
            </button>
          ) : (
            <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <p className="helper-text" style={{ margin: 0 }}>TPC / admin accounts can monitor or manage this drive.</p>
              <button
                type="button"
                className="ghost-button"
                disabled={deleting}
                onClick={deleteDrive}
                style={{ color: "#ff4d4f", borderColor: "rgba(255, 77, 79, 0.3)", padding: "8px 14px", flexShrink: 0 }}
              >
                {deleting ? <Loader2 className="spin" size={15} /> : <Trash2 size={15} />} Delete Drive
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileModal({ user, token, onClose, onSaved, flash }: {
  user: SessionUser;
  token: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  flash: (message: string) => void;
}) {
  const student = user.student;
  const [form, setForm] = useState({
    name: student?.name ?? "",
    branch: student?.branch ?? "Computer Engineering",
    cgpa: String(student?.cgpa ?? 7),
    graduationYear: String(student?.graduationYear ?? 2027),
    backlogs: String(student?.backlogs ?? 0),
    phone: student?.phone ?? "",
    linkedinUrl: student?.linkedinUrl ?? "",
    projectsCount: String(student?.projectsCount ?? 0),
    internshipsCount: String(student?.internshipsCount ?? 0),
    emailEnabled: student?.emailEnabled ?? true
  });
  const [selectedSkills, setSelectedSkills] = useState<string[]>(student?.skills ?? []);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!student) {
      flash("Only student profiles can be edited here");
      return;
    }
    setSaving(true);
    try {
      await api("/api/auth/me/student", token, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          branch: form.branch,
          cgpa: Number(form.cgpa),
          graduationYear: Number(form.graduationYear),
          skills: selectedSkills,
          backlogs: Number(form.backlogs),
          phone: form.phone || null,
          linkedinUrl: form.linkedinUrl || null,
          projectsCount: Number(form.projectsCount),
          internshipsCount: Number(form.internshipsCount),
          emailEnabled: form.emailEnabled
        })
      });
      await onSaved();
      onClose();
    } catch (error) {
      flash(error instanceof Error ? error.message : "Profile update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="card profile-modal" onClick={(event) => event.stopPropagation()}>
        <div className="card-head">
          <div><span className="card-kicker">Student profile</span><h3>Edit readiness inputs</h3></div>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        {!student && <p className="section-copy">TPC/admin profile editing is not needed here. Student records can be managed from applications and analytics.</p>}
        {student && <>
          <p className="section-copy">Update CGPA, branch, skills, or backlog count whenever your profile improves. Dashboard readiness will refresh after saving.</p>
          <div className="profile-form">
            <label>Name<input value={form.name} onChange={(event) => setForm((old) => ({ ...old, name: event.target.value }))} /></label>
            <label>Branch
              <select value={form.branch} onChange={(event) => setForm((old) => ({ ...old, branch: event.target.value }))}>
                {AVAILABLE_DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </label>
            <label>CGPA<input value={form.cgpa} onChange={(event) => setForm((old) => ({ ...old, cgpa: event.target.value }))} /></label>
            <label>Graduation Year<input value={form.graduationYear} onChange={(event) => setForm((old) => ({ ...old, graduationYear: event.target.value }))} /></label>
            <label>Backlogs<input value={form.backlogs} onChange={(event) => setForm((old) => ({ ...old, backlogs: event.target.value }))} /></label>
            <label>Phone Number<input value={form.phone} onChange={(event) => setForm((old) => ({ ...old, phone: event.target.value }))} /></label>
            <label>LinkedIn URL<input value={form.linkedinUrl} onChange={(event) => setForm((old) => ({ ...old, linkedinUrl: event.target.value }))} /></label>
            <label>Projects Count<input value={form.projectsCount} type="number" onChange={(event) => setForm((old) => ({ ...old, projectsCount: event.target.value }))} /></label>
            <label>Internships Count<input value={form.internshipsCount} type="number" onChange={(event) => setForm((old) => ({ ...old, internshipsCount: event.target.value }))} /></label>
            <label style={{ flexDirection: "row", alignItems: "center", gap: "10px", gridColumn: "span 2", cursor: "pointer", textTransform: "none", letterSpacing: "normal", fontSize: "13px", color: "var(--text)", fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={form.emailEnabled}
                onChange={(event) => setForm((old) => ({ ...old, emailEnabled: event.target.checked }))}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <span>Receive transactional email alerts for critical events (interviews, selection status, upcoming deadlines).</span>
            </label>
            <SkillsSelector selected={selectedSkills} onChange={setSelectedSkills} />
          </div>
          <div className="inline-actions" style={{ marginTop: "24px" }}>
            <button className="primary-button" onClick={save} disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} Save profile</button>
            <button className="ghost-button" onClick={onClose}>Cancel</button>
          </div>
        </>}
      </section>
    </div>
  );
}

function ProfilePage({ user, token, onSaved, flash, dashboard }: {
  user: SessionUser;
  token: string;
  onSaved: () => void | Promise<void>;
  flash: (message: string) => void;
  dashboard: DashboardData | null;
}) {
  return (
    <>
      <PageTitle eyebrow="Profile" title="Keep your placement profile updated." copy="CGPA, skills, branch, graduation year, and backlogs directly affect eligibility and readiness." />
      <ProfileEditor user={user} token={token} onSaved={onSaved} flash={flash} dashboard={dashboard} />
    </>
  );
}

function ProfileEditor({ user, token, onSaved, flash, dashboard }: {
  user: SessionUser;
  token: string;
  onSaved: () => void | Promise<void>;
  flash: (message: string) => void;
  dashboard: DashboardData | null;
}) {
  const student = user.student;
  const cardRef = useRef<HTMLDivElement>(null);
  const { exportCard, exporting } = useProfileExport();
  const [form, setForm] = useState({
    name: student?.name ?? "",
    branch: student?.branch ?? "Computer Engineering",
    cgpa: String(student?.cgpa ?? 7),
    graduationYear: String(student?.graduationYear ?? 2027),
    backlogs: String(student?.backlogs ?? 0),
    phone: student?.phone ?? "",
    linkedinUrl: student?.linkedinUrl ?? "",
    projectsCount: String(student?.projectsCount ?? 0),
    internshipsCount: String(student?.internshipsCount ?? 0),
    emailEnabled: student?.emailEnabled ?? true
  });
  const [selectedSkills, setSelectedSkills] = useState<string[]>(student?.skills ?? []);
  const [saving, setSaving] = useState(false);

  const readinessScore = Math.round(
    (dashboard?.readiness as { score?: number } | undefined)?.score ??
    (student?.cgpa ?? 7) * 8 + Math.min(selectedSkills.length * 3, 24)
  );

  const save = async () => {
    if (!student) {
      flash("Only student profiles can be edited here");
      return;
    }
    setSaving(true);
    try {
      if (user.role === "STUDENT") {
        if (form.linkedinUrl && !form.linkedinUrl.startsWith("http://") && !form.linkedinUrl.startsWith("https://")) {
          flash("LinkedIn URL must be a valid URL (starting with http:// or https://)");
          setSaving(false);
          return;
        }

        await api("/api/auth/profile", token, {
          method: "PATCH",
          body: JSON.stringify({
            skills: selectedSkills,
            phone: form.phone || null,
            linkedinUrl: form.linkedinUrl || null,
            projectsCount: Number(form.projectsCount),
            internshipsCount: Number(form.internshipsCount)
          })
        });
      } else {
        await api("/api/auth/me/student", token, {
          method: "PATCH",
          body: JSON.stringify({
            name: form.name,
            branch: form.branch,
            cgpa: Number(form.cgpa),
            graduationYear: Number(form.graduationYear),
            skills: selectedSkills,
            backlogs: Number(form.backlogs),
            phone: form.phone || null,
            linkedinUrl: form.linkedinUrl || null,
            projectsCount: Number(form.projectsCount),
            internshipsCount: Number(form.internshipsCount),
            emailEnabled: form.emailEnabled
          })
        });
      }
      await onSaved();
    } catch (error) {
      flash(error instanceof Error ? error.message : "Profile update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!student) {
    return <section className="card form-card"><EmptyState title="No student profile" copy="TPC and admin accounts use analytics and application tools instead." /></section>;
  }

  return (
    <section className="card profile-page-card">
      <div className="profile-hero">
        <div className="avatar big">{initials(form.name)}</div>
        <div>
          <span className="card-kicker">Student readiness profile</span>
          <h3>{form.name}</h3>
          <p>{form.branch} · CGPA {form.cgpa} · {selectedSkills.length} skills</p>
        </div>
      </div>
      <div className="profile-form">
        <label>Name<input value={form.name} disabled={user.role === "STUDENT"} style={user.role === "STUDENT" ? { opacity: 0.6, cursor: "not-allowed" } : undefined} onChange={(event) => setForm((old) => ({ ...old, name: event.target.value }))} /></label>
        <label>Branch
          <select value={form.branch} disabled={user.role === "STUDENT"} style={user.role === "STUDENT" ? { opacity: 0.6, cursor: "not-allowed" } : undefined} onChange={(event) => setForm((old) => ({ ...old, branch: event.target.value }))}>
            {AVAILABLE_DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
          </select>
        </label>
        <label>CGPA<input value={form.cgpa} disabled={user.role === "STUDENT"} style={user.role === "STUDENT" ? { opacity: 0.6, cursor: "not-allowed" } : undefined} onChange={(event) => setForm((old) => ({ ...old, cgpa: event.target.value }))} /></label>
        <label>Graduation Year<input value={form.graduationYear} disabled={user.role === "STUDENT"} style={user.role === "STUDENT" ? { opacity: 0.6, cursor: "not-allowed" } : undefined} onChange={(event) => setForm((old) => ({ ...old, graduationYear: event.target.value }))} /></label>
        <label>Backlogs<input value={form.backlogs} disabled={user.role === "STUDENT"} style={user.role === "STUDENT" ? { opacity: 0.6, cursor: "not-allowed" } : undefined} onChange={(event) => setForm((old) => ({ ...old, backlogs: event.target.value }))} /></label>
        <label>Phone Number<input value={form.phone} onChange={(event) => setForm((old) => ({ ...old, phone: event.target.value }))} /></label>
        <label>LinkedIn URL<input value={form.linkedinUrl} onChange={(event) => setForm((old) => ({ ...old, linkedinUrl: event.target.value }))} /></label>
        <label>Projects Count<input value={form.projectsCount} type="number" onChange={(event) => setForm((old) => ({ ...old, projectsCount: event.target.value }))} /></label>
        <label>Internships Count<input value={form.internshipsCount} type="number" onChange={(event) => setForm((old) => ({ ...old, internshipsCount: event.target.value }))} /></label>
        <label style={{ flexDirection: "row", alignItems: "center", gap: "10px", gridColumn: "span 2", cursor: "pointer", textTransform: "none", letterSpacing: "normal", fontSize: "13px", color: "var(--text)", fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={form.emailEnabled}
            onChange={(event) => setForm((old) => ({ ...old, emailEnabled: event.target.checked }))}
            style={{ width: "18px", height: "18px", cursor: "pointer" }}
          />
          <span>Receive transactional email alerts for critical events (interviews, selection status, upcoming deadlines).</span>
        </label>
        <SkillsSelector selected={selectedSkills} onChange={setSelectedSkills} />
      </div>
      <div className="inline-actions" style={{ marginTop: "24px" }}>
        <button className="primary-button" onClick={save} disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} Save profile</button>
        <button
          className="secondary-button"
          disabled={exporting}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          onClick={async () => {
            if (!cardRef.current) return;
            await exportCard(
              cardRef.current,
              `placetrack-profile-${form.name.replace(/\s+/g, "-").toLowerCase()}-2026.png`
            );
            flash("Profile card exported!");
          }}
        >
          {exporting ? <Loader2 className="spin" size={16} /> : <Share2 size={16} />}
          {exporting ? "Exporting…" : "Export Profile Card"}
        </button>
        <span className="helper-text">Tip: add hackathons, certifications, internships, and stack keywords to improve matching.</span>
      </div>
      {/* Hidden card for html2canvas capture — always rendered, positioned off-screen */}
      {student && (
        <ProfileCardExport
          ref={cardRef}
          student={{
            name: form.name,
            branch: form.branch,
            cgpa: Number(form.cgpa),
            graduationYear: Number(form.graduationYear),
            skills: selectedSkills,
            backlogs: Number(form.backlogs),
            projectsCount: Number(form.projectsCount),
            internshipsCount: Number(form.internshipsCount),
            mockTestCount: student.mockTestCount
          }}
          readinessScore={Math.min(100, Math.max(0, readinessScore))}
        />
      )}
    </section>
  );
}

function ResumeAI({ token, flash }: { token: string; flash: (message: string) => void }) {
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Core parsing request function to trigger the backend multipart pipeline
  const processResumeFile = async (file: File) => {
    if (file.type !== "application/pdf" && file.type !== "text/plain") {
      flash("Only valid PDF or TXT files are supported.");
      return;
    }

    setLoading(true);
    setUploadedFileName(file.name);
    
    const formData = new FormData();
    formData.append("resume", file);

    try {
      // Call backend file parser endpoint using api helper
      const data = await api<any>("/api/ai/resume/upload", token, {
        method: "POST",
        body: formData,
      });

      setResult(data);
      flash("Resume analyzed successfully!");
    } catch (error: any) {
      flash(error.message || "Pipeline processing failure.");
      setUploadedFileName(null);
    } finally {
      setLoading(false);
    }
  };

  // Drag-and-drop interface event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processResumeFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processResumeFile(e.target.files[0]);
    }
  };

  return (
    <section className="analyzer-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
      <div>
        <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <FileScan size={15} /> Resume AI Smart Analyzer
        </span>
        <h2>Upload Your Placement Profile</h2>
        <p className="section-copy" style={{ margin: "8px 0 16px", color: "var(--muted)" }}>
          Drag and drop your structured PDF or text resume below. Our system will extract skills and score eligibility matching instantly.
        </p>

        {/* Drag and Drop Zone UI Panel */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          style={{
            border: isDragActive ? "2px dashed var(--violet)" : "2px dashed var(--line)",
            background: isDragActive ? "var(--hover)" : "var(--panel-2)",
            borderRadius: "16px",
            padding: "40px 20px",
            textAlign: "center",
            cursor: "pointer",
            position: "relative",
            transition: "all 0.2s ease"
          }}
        >
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileChange}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
            disabled={loading}
          />
          
          {loading ? (
            <div style={{ display: "grid", placeItems: "center", gap: "8px" }}>
              <Loader2 className="spin" size={32} style={{ color: "var(--violet)" }} />
              <p style={{ fontSize: "14px", fontWeight: 500 }}>Extracting metrics from {uploadedFileName}...</p>
            </div>
          ) : uploadedFileName ? (
            <div>
              <CheckCircle2 size={32} style={{ color: "var(--mint)", margin: "0 auto 8px" }} />
              <p style={{ fontSize: "14px", fontWeight: 600 }}>{uploadedFileName}</p>
              <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>Click or drag a new file to replace</p>
            </div>
          ) : (
            <div>
              <Upload size={32} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
              <p style={{ fontSize: "14px", fontWeight: 500 }}>
                {isDragActive ? "Drop the file here!" : "Drag & Drop PDF here or click to browse"}
              </p>
              <p style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>Maximum file size: 5MB</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Dynamic Results Display Frame */}
      <AnalysisPanel result={result} />
    </section>
  );
}

function Aptitude({ token, role, tests, flash }: { token: string; role: Role; tests: TestSummary[]; flash: (message: string) => void }) {
  const [active, setActive] = useState<Record<string, unknown> | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const openTest = async (id: string) => {
    try {
      setActive(await api(`/api/tests/${id}`, token));
      setAnswers({});
    } catch (error) {
      console.warn("Backend API not reachable for loading test questions. Using client-side questions.");
      setActive({
        id,
        title: tests.find((t) => t.id === id)?.title ?? "Mock Test",
        questions: [
          { id: "q1", section: "Quantitative", questionText: "A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?", options: ["120 metres", "180 metres", "324 metres", "150 metres"] },
          { id: "q2", section: "Quantitative", questionText: "The average of 20 numbers is zero. Of them, at the most, how many may be greater than zero?", options: ["0", "1", "10", "19"] },
          { id: "q3", section: "Logical", questionText: "Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?", options: ["(1/3)", "(1/8)", "(2/8)", "(1/16)"] },
          { id: "q4", section: "Logical", questionText: "Which word does not belong with the others?", options: ["parsley", "basil", "dill", "mayonnaise"] },
          { id: "q5", section: "Verbal", questionText: "Choose the synonym for: AMBIGUOUS", options: ["Vague", "Clear", "Certain", "Helpful"] }
        ]
      });
      setAnswers({});
    }
  };
  const submit = async () => {
    if (!active?.id) return;
    try {
      const result = await api<Record<string, unknown>>(`/api/tests/${active.id}/submit`, token, { method: "POST", body: JSON.stringify({ answers }) });
      flash(`Submitted. Accuracy ${result.accuracy}%`);
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not submit the test. Try again.");
    }
  };
  const questions = (active?.questions as Array<{ id: string; section: string; questionText: string; options: string[] }> | undefined) ?? [];
  return (
    <>
      <PageTitle eyebrow="Aptitude tests" title="Practice and submit mock tests." copy={role === "STUDENT" ? "Attempt seeded placement mocks." : "Monitor test inventory and participation."} />
      <div className="split-grid">
        <section className="card list-card">
          {tests.map((test) => <button className="list-row" key={test.id} onClick={() => openTest(test.id)}><BookOpenCheck size={18} /><span><strong>{test.title}</strong><small>{test.duration} min · {test._count?.questions ?? 0} questions · {test._count?.results ?? 0} attempts</small></span></button>)}
        </section>
        <section className="card test-card">
          {!active && <EmptyState title="Pick a test" copy="Questions will load here." />}
          {active && <>
            <h3>{String(active.title)}</h3>
            {questions.map((question, index) => <div className="question-card" key={question.id}>
              <strong>{index + 1}. {question.questionText}</strong>
              {question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={question.id} onChange={() => setAnswers((old) => ({ ...old, [question.id]: optionIndex }))} /> {option}</label>)}
            </div>)}
            {role === "STUDENT" && <button className="primary-button" onClick={submit}><Send size={16} /> Submit test</button>}
          </>}
        </section>
      </div>
    </>
  );
}

function InterviewCoach({ token, flash }: { token: string; flash: (message: string) => void }) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"technical" | "soft">("technical");
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Record<string, { score: number; strengths: string[]; weaknesses: string[]; modelAnswer: string }>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  const softSkillsQuestions = [
    "Why should we hire you?",
    "What are your greatest strengths and weaknesses?",
    "Describe a challenge you faced during a project and how you overcame it.",
    "How do you handle work pressure and tight deadlines?",
    "Where do you see yourself in 5 years?"
  ];

  const questionBank: Record<string, { technical: string[]; soft: string[] }> = {
    "Computer Engineering": {
      technical: [
        "Explain the difference between stack and heap memory allocation.",
        "What are the four pillars of Object-Oriented Programming (OOP)? Explain each.",
        "How does database indexing work, and what are its advantages and disadvantages?",
        "Explain the difference between process and thread.",
        "What is the difference between TCP and UDP? When would you use each?",
        "Explain the concept of recursion and its overhead.",
        "What is a deadlock? What are the four necessary conditions for deadlock to occur?",
        "Explain the difference between primary key, foreign key, and unique key in SQL.",
        "How does Virtual Memory work? What is page fault?",
        "What is the difference between REST API and GraphQL?",
        "Explain sorting algorithms: Compare Quick Sort and Merge Sort in terms of complexity.",
        "What is garbage collection? How does Java's garbage collector work?",
        "Explain the difference between SQL (Relational) and NoSQL (Non-Relational) databases.",
        "What is the CAP theorem in distributed systems?",
        "How would you design a simple URL shortener (system design concept)?"
      ],
      soft: softSkillsQuestions
    },
    "Information Technology": {
      technical: [
        "Explain the MVC (Model-View-Controller) architecture.",
        "What is JWT (JSON Web Token) and how is it used for session management?",
        "What is the difference between client-side rendering (CSR) and server-side rendering (SSR)?",
        "Explain CSS Box Model and CSS Grid vs Flexbox.",
        "What is CORS (Cross-Origin Resource Sharing) and how do you resolve CORS errors?",
        "Explain the difference between Git merge and Git rebase.",
        "What is a virtual DOM and how does React use it to optimize rendering?",
        "What is the difference between local storage, session storage, and cookies?",
        "Explain the concepts of virtualization and containerization (Docker).",
        "What is CI/CD, and what is its role in modern software development pipelines?",
        "What is the difference between monolithic and microservices architecture?",
        "Explain the difference between GET, POST, PUT, and DELETE HTTP methods.",
        "What is rate limiting and why is it important in API development?",
        "Explain WebSockets and how they differ from HTTP polling.",
        "What are the best practices to secure a web application against SQL injection and XSS?"
      ],
      soft: softSkillsQuestions
    },
    "AI & Data Science": {
      technical: [
        "What is the difference between supervised and unsupervised learning?",
        "Explain the bias-variance tradeoff in machine learning.",
        "What is overfitting and how can you prevent it?",
        "Explain the difference between precision, recall, and F1-score.",
        "How does the K-Means clustering algorithm work?",
        "What is a confusion matrix? How do you calculate accuracy from it?",
        "Explain the difference between Random Forest and Decision Tree.",
        "What is gradient descent? Explain the role of learning rate.",
        "What is the purpose of activation functions in a neural network?",
        "Explain the difference between L1 (Lasso) and L2 (Ridge) regularization.",
        "What is feature engineering? Give three common feature extraction techniques.",
        "How do you handle missing values or outliers in a dataset?",
        "Explain the difference between correlation and causation.",
        "What is PCA (Principal Component Analysis) and when is it used?",
        "Explain A/B testing and how statistical significance is calculated."
      ],
      soft: softSkillsQuestions
    },
    "Electronics & TC": {
      technical: [
        "What is the difference between analog and digital modulation? Explain ASK, FSK, and PSK.",
        "Explain the operation of a PN junction diode under forward and reverse bias.",
        "What is Shannon's channel capacity theorem?",
        "Explain the difference between microprocessors and microcontrollers.",
        "What is Nyquist rate of sampling, and why is it important to prevent aliasing?",
        "Explain the function of an operational amplifier (Op-Amp) and its ideal characteristics.",
        "What is the difference between serial communication protocols SPI, I2C, and UART?",
        "How does a multiplexer differ from a demultiplexer?",
        "What are setup time and hold time in flip-flops/digital circuits?",
        "Explain DSP (Digital Signal Processing) and DFT (Discrete Fourier Transform).",
        "What is the difference between GSM and CDMA technologies?",
        "Explain the concept of electromagnetic wave propagation and antenna gain.",
        "What is PLL (Phase Locked Loop) and what are its applications?",
        "How does feedback affect the stability and gain of an amplifier?",
        "Explain the working of an Analog-to-Digital Converter (ADC)."
      ],
      soft: softSkillsQuestions
    },
    "Electrical Engineering": {
      technical: [
        "Explain the working principle of a 3-phase induction motor.",
        "What is the difference between active power, reactive power, and apparent power?",
        "Explain Faraday's laws of electromagnetic induction.",
        "What is the purpose of transformer breathing, and why is silica gel used?",
        "Explain Lenz's Law and its significance.",
        "What is power factor, and how can it be improved in industrial setups?",
        "What is the difference between AC transmission and DC transmission lines?",
        "Explain the difference between circuit breakers, isolators, and fuses.",
        "What is the working principle of a synchronous generator?",
        "Explain the concept of corona discharge in high voltage transmission lines.",
        "What is skin effect, and how does it affect transmission line impedance?",
        "What is the difference between step-up and step-down transformers?",
        "Explain Kirchhoff's Current Law (KCL) and Voltage Law (KVL).",
        "What are the different types of electrical faults?",
        "What is the working of a solar photovoltaic cell?"
      ],
      soft: softSkillsQuestions
    },
    "Mechanical Engineering": {
      technical: [
        "Explain the four strokes of an Internal Combustion (IC) engine.",
        "What is the difference between stress, strain, and Young's modulus?",
        "Explain the three modes of heat transfer: Conduction, Convection, and Radiation.",
        "What is the difference between a refrigerator, a heat pump, and a heat engine?",
        "Explain Bernoulli's principle in fluid mechanics.",
        "What is the significance of the Iron-Carbon phase diagram?",
        "Explain the difference between elastic deformation and plastic deformation.",
        "What is the function of a flywheel in an engine?",
        "Explain the working principle of a centrifugal pump.",
        "What is the difference between scavenging and supercharging in engines?",
        "Explain Hooke's law and its limitations.",
        "What is mechanical advantage, and how is it calculated for gears?",
        "Explain the difference between welding, soldering, and brazing.",
        "What is the difference between laminar flow and turbulent flow?",
        "Explain the Carnot cycle and why it is considered an ideal cycle."
      ],
      soft: softSkillsQuestions
    },
    "Civil Engineering": {
      technical: [
        "What is the difference between one-way slab and two-way slab?",
        "Explain the difference between segregation and bleeding in concrete.",
        "What is slump test of concrete, and what does it measure?",
        "Explain the difference between shallow foundation and deep foundation.",
        "What is survey contouring, and what are contour lines?",
        "Explain the concept of shear force and bending moment.",
        "What is initial setting time and final setting time of cement?",
        "What is the difference between working stress method and limit state method?",
        "Explain the role of fly ash in concrete mix design.",
        "What is curing of concrete, and why is it essential?",
        "Explain bearing capacity of soil and how it is determined.",
        "What is the difference between flexible pavement and rigid pavement?",
        "Explain the hydrological cycle.",
        "What are the common tests performed on bricks?",
        "Explain what is meant by pre-stressed concrete."
      ],
      soft: softSkillsQuestions
    },
    "Chemical Engineering": {
      technical: [
        "Explain the difference between batch process and continuous process.",
        "What is the difference between unit operations and unit processes?",
        "Explain Raoult's law and Henry's law in vapour-liquid equilibrium.",
        "What is heat transfer coefficient and how does fouling affect it?",
        "Explain the concept of distillation and its different types (e.g. fractional, steam).",
        "What is the difference between Newtonian and non-Newtonian fluids?",
        "Explain the working principle of a shell and tube heat exchanger.",
        "What is catalyst selectivity and how does temperature affect catalyst activity?",
        "Explain the difference between laminar flow and turbulent flow in chemical reactors.",
        "What is cavitation in pumps, and how can it be avoided?",
        "Explain Fick's law of diffusion.",
        "What is the difference between absorption and adsorption?",
        "What is a fluidised bed reactor and what are its advantages?",
        "Explain Gibbs free energy and its relation to reaction spontaneity.",
        "What is reflux ratio in distillation and how does it affect column height?"
      ],
      soft: softSkillsQuestions
    },
    "Robotics & Automation": {
      technical: [
        "What is ROS (Robot Operating System)? Explain its node, topic, and service architecture.",
        "Explain forward kinematics and inverse kinematics in robotic manipulators.",
        "What is SLAM (Simultaneous Localisation and Mapping)? How do robots use it for navigation?",
        "Explain the difference between servo motors and stepper motors. When would you use each?",
        "What is a PID controller and how is it applied in robotic motion control?",
        "Explain the role of sensors (lidar, ultrasonic, encoders) in autonomous robotics.",
        "What is a cobot (collaborative robot)? How does it differ from an industrial robot?",
        "Explain the concept of degrees of freedom (DOF) in a robot arm.",
        "What is path planning in robotics? Explain A* and RRT algorithms.",
        "How does computer vision aid in robotic pick-and-place tasks?",
        "Explain the difference between pneumatic, hydraulic, and electric actuators.",
        "What is PLC ladder logic programming? Give a simple example.",
        "Explain what Industry 4.0 means and how robotics fits into smart manufacturing.",
        "What is the difference between open-loop and closed-loop control in automation?",
        "Explain end effectors — what types exist and how are they selected for tasks?"
      ],
      soft: softSkillsQuestions
    },
    "MBA / MCA": {
      technical: [
        "Explain database normalization. What are 1NF, 2NF, and 3NF?",
        "What is the difference between a stack and a queue? Give real-world application examples.",
        "Explain the OSI model. What happens at each of the 7 layers?",
        "What is SDLC (Software Development Life Cycle)? Compare Agile and Waterfall.",
        "Explain ERP systems. What is SAP and how does it benefit an organisation?",
        "What is supply chain management? Explain just-in-time (JIT) inventory.",
        "Explain SWOT analysis and Porter's Five Forces with a real company example.",
        "What is business intelligence? How do OLAP and OLTP systems differ?",
        "What are decision support systems (DSS) and how do they aid management?",
        "Explain the difference between primary market research and secondary market research.",
        "What is cloud computing? Explain IaaS, PaaS, and SaaS with examples.",
        "What is operations research? Explain linear programming with an example.",
        "Explain working capital management and the cash conversion cycle.",
        "What is the difference between a primary key and a foreign key in RDBMS?",
        "Explain marketing analytics — what KPIs would you track for a product launch?"
      ],
      soft: softSkillsQuestions
    }
  };

  const submitAnswer = async (questionText: string) => {
    const answer = answers[questionText]?.trim();
    if (!answer) { flash("Please type an answer before submitting."); return; }
    setSubmitting((prev) => ({ ...prev, [questionText]: true }));
    try {
      // Call Next.js API route directly (works on Vercel without Express backend)
      const res = await fetch("/api/ai/interview/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionText, answer, role: selectedRole }),
      });
      if (!res.ok) throw new Error("AI evaluation failed");
      const response = await res.json() as { score: number; strengths: string[]; weaknesses: string[]; modelAnswer: string };
      setEvaluations((prev) => ({ ...prev, [questionText]: response }));
      flash("Answer evaluated by AI!");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Feedback generation failed");
    } finally {
      setSubmitting((prev) => ({ ...prev, [questionText]: false }));
    }
  };

  const currentQuestions = selectedRole ? (questionBank[selectedRole]?.[activeTab] ?? []) : [];

  if (!selectedRole) {
    return (
      <>
        <PageTitle eyebrow="Interview coach" title="Choose a department to start practicing." copy="10 engineering & IT departments — each with 15 specific technical questions and 5 soft skills questions (numbered 16–20). Practice and get AI feedback." />
        <div className="role-card-grid">
          {Object.keys(questionBank).map((dept) => (
            <button key={dept} type="button" className="role-card-btn" onClick={() => { setSelectedRole(dept); setSelectedQuestion(null); setEvaluations({}); setAnswers({}); setActiveTab("technical"); }}>
              <span className="role-card-name">{dept}</span>
              <span className="role-card-meta">{questionBank[dept].technical.length} technical · {questionBank[dept].soft.length} soft skills</span>
            </button>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
        <button type="button" className="ghost-button" style={{ padding: "6px 12px", fontSize: "13px" }} onClick={() => { setSelectedRole(null); setSelectedQuestion(null); }}>
          ← All Departments
        </button>
        <PageTitle eyebrow={`Interview coach · ${selectedRole}`} title={`${selectedRole} Interview Prep`} copy={`${questionBank[selectedRole].technical.length} technical questions + ${questionBank[selectedRole].soft.length} soft skill questions. Click any question to practice and get AI feedback.`} />
      </div>
      <div className="interview-tab-row">
        <button type="button" className={activeTab === "technical" ? "interview-tab active" : "interview-tab"} onClick={() => { setActiveTab("technical"); setSelectedQuestion(null); }}>
          Technical ({questionBank[selectedRole].technical.length})
        </button>
        <button type="button" className={activeTab === "soft" ? "interview-tab active" : "interview-tab"} onClick={() => { setActiveTab("soft"); setSelectedQuestion(null); }}>
          Soft Skills ({questionBank[selectedRole].soft.length})
        </button>
      </div>
      <div className="insight-list">
        {currentQuestions.map((question, index) => {
          const isSelected = selectedQuestion === question;
          const evaluation = evaluations[question];
          const isSubmitting = submitting[question] || false;
          const displayIndex = activeTab === "technical" ? index + 1 : index + 16;
          return (
            <div className={`card insight insight-row-clickable ${isSelected ? "selected-question" : ""}`} key={question} onClick={() => setSelectedQuestion(isSelected ? null : question)}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: activeTab === "soft" ? "var(--warning)" : "var(--primary)", minWidth: "28px" }}>{String(displayIndex).padStart(2, "0")}</span>
              <div style={{ width: "100%" }}>
                <strong style={{ fontSize: "14px", lineHeight: "1.5" }}>{question}</strong>
                <p style={{ fontSize: "12px", marginTop: "2px" }}>{activeTab === "soft" ? "Soft skill / behavioral" : "Technical"} · Click to practice</p>
                {isSelected && (
                  <div className="interview-practice-panel" onClick={(e) => e.stopPropagation()}>
                    <textarea placeholder="Type your answer here... Be specific and use examples." value={answers[question] || ""} onChange={(e) => setAnswers({ ...answers, [question]: e.target.value })} />
                    <button className="primary-button" disabled={isSubmitting || !(answers[question]?.trim())} onClick={() => submitAnswer(question)}>
                      {isSubmitting ? <Loader2 className="spin" size={16} /> : <Send size={16} />} Get AI Evaluation
                    </button>
                    {evaluation && (
                      <div className="interview-feedback-box">
                        <div className="interview-feedback-header">
                          <strong>AI Evaluation Feedback</strong>
                          <span style={{ color: evaluation.score >= 7 ? "var(--success)" : evaluation.score >= 5 ? "var(--warning)" : "var(--error)" }}>Score: {evaluation.score}/10</span>
                        </div>
                        <div className="feedback-points-list strengths">
                          <span>✅ Strengths</span>
                          <ul>{evaluation.strengths.map((str, idx) => <li key={idx}>{str}</li>)}</ul>
                        </div>
                        <div className="feedback-points-list weaknesses">
                          <span>⚠️ Areas for Improvement</span>
                          <ul>{evaluation.weaknesses.map((weak, idx) => <li key={idx}>{weak}</li>)}</ul>
                        </div>
                        <div className="model-answer-section">
                          <span>💡 Model Answer Suggestion</span>
                          <p>{evaluation.modelAnswer}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function PageTitle({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div className="page-title"><div><span>{eyebrow}</span><h1><HighlightedTitle text={title} /></h1><p>{copy}</p></div><div className="date-pill"><CalendarDays size={16} /> Placement season 2025-26</div></div>;
}

function Stat({ icon, value, label, sub, tone, trend }: { icon: ReactNode; value: string; label: string; sub: string; tone: string; trend?: string }) {
  return (
    <div className={`card stat-card tone-${tone}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon" aria-hidden="true">{icon}</span>
      </div>
      <strong className="stat-value">{value}</strong>
      <div className="stat-foot">
        <small>{sub}</small>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div><span>{label}</span><strong>{value}</strong><i><b style={{ width: `${Math.min(100, value)}%` }} /></i></div>;
}

function MiniApplicationList({ rows }: { rows: Application[] }) {
  if (!rows.length) return <EmptyState title="No applications" copy="Recent applications will appear here." />;
  return <div className="application-list">{rows.map((item) => <div className="application-row" key={item.id}>
    <div className="company-logo" style={{ overflow: "hidden", display: "grid", placeItems: "center" }}>
      {item.drive.company.logo ? (
        <img src={getLogoUrl(item.drive.company.logo)!} alt={item.drive.company.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials(item.drive.company.name)
      )}
    </div>
    <div className="company-name"><strong>{item.drive.company.name}</strong><span>{item.drive.role}</span></div>
    <span className="status-badge">{pretty(item.status)}</span>
    <span className="date">{new Date(item.updatedAt).toLocaleDateString()}</span>
  </div>)}</div>;
}

function AnalysisPanel({ result }: { result: Record<string, unknown> | null }) {
  if (!result) return <div className="analysis-panel"><div className="empty-analysis"><div className="scan-lines"><i /><i /><i /><i /></div><h3>Waiting for resume</h3><p>Analysis score, skills, and suggestions will appear here.</p></div></div>;
  const skills = (result.skills as string[] | undefined) ?? [];
  const suggestions = (result.suggestions as string[] | undefined) ?? [];
  return <div className="analysis-panel">
    <div className="analysis-score"><CheckCircle2 /><div><strong>{String(result.score ?? 0)}</strong><span>resume score</span></div></div>
    <div className="tag-list">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
    <h4>Suggestions</h4>
    {suggestions.length ? suggestions.map((item) => <p className="suggestion" key={item}>{item}</p>) : <p className="suggestion success">Looks strong. Keep tailoring it per role.</p>}
  </div>;
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="empty-state"><Sparkles size={22} /><strong>{title}</strong><span>{copy}</span></div>;
}


