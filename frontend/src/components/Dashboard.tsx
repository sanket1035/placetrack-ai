"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight, Bell, BookOpenCheck, BriefcaseBusiness, Building2, CalendarDays, CheckCircle2,
  CircleUserRound, Command, FileScan, Gauge, GraduationCap, LayoutDashboard, Loader2, LogOut,
  Menu, Moon, Plus, Search, Send, Sparkles, Sun, Target, Trophy, Upload, Users, X
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, demoAccounts, type LoginResponse, type Role, type SessionUser } from "@/lib/api";
import { ApplicationTimeline } from "./ApplicationTimeline";
import { ReadinessRing } from "./ReadinessRing";

type View = "Overview" | "Applications" | "Opportunities" | "Resume AI" | "Aptitude" | "Interview" | "Profile" | "Drive Creator" | "Analytics";

type Drive = {
  id: string;
  company: { name: string; website?: string | null; description?: string | null };
  role: string;
  package: number;
  location: string;
  jobType: string;
  deadline: string;
  allowedBranches: string[];
  minCgpa: number;
  eligibility?: { eligible: boolean; score: number; reasons: string[] } | null;
  alreadyApplied?: boolean;
  _count?: { applications: number };
  description?: string;
  maxBacklogs?: number;
};

type Application = {
  id: string;
  status: string;
  updatedAt: string;
  timeline: unknown;
  drive: Drive;
  interview?: { dateTime: string; mode: string; locationOrLink: string; status: string } | null;
  student?: { name: string; branch: string; cgpa: number; user?: { email: string } };
};

type TestSummary = {
  id: string;
  title: string;
  duration: number;
  _count?: { questions: number; results: number };
};

type DashboardData = Record<string, unknown>;

const AVAILABLE_DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "AI & Data Science",
  "E&TC",
  "Electrical",
  "Mechanical",
  "Civil"
];

const AVAILABLE_SKILLS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Express", "Python",
  "Java", "C++", "SQL", "PostgreSQL", "MongoDB", "AWS", "Docker", "Git",
  "Machine Learning", "Data Structures", "Algorithms", "Communication"
];

const statusOptions = ["APPLIED", "SHORTLISTED", "APTITUDE_CLEARED", "TECHNICAL_ROUND", "HR_ROUND", "SELECTED", "REJECTED"];
const navIcons: Record<View, ElementType> = {
  Overview: LayoutDashboard,
  Applications: BriefcaseBusiness,
  Opportunities: Building2,
  "Resume AI": FileScan,
  Aptitude: BookOpenCheck,
  Interview: Sparkles,
  Profile: CircleUserRound,
  "Drive Creator": Plus,
  Analytics: Gauge
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
  const [dark, setDark] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<View>("Overview");
  const [notice, setNotice] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDrive, setSelectedDrive] = useState<Drive | null>(null);

  const role = user?.role ?? "STUDENT";
  const nav = useMemo(() => {
    const base: View[] = ["Overview", "Applications", "Opportunities", "Resume AI", "Aptitude", "Profile"];
    if (role !== "STUDENT") base.push("Interview", "Drive Creator", "Analytics");
    if (role === "STUDENT") base.push("Interview");
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
      const [dashboardData, driveRows, applicationRows, testRows] = await Promise.all([
        api<DashboardData>("/api/dashboard", activeToken),
        api<Drive[]>("/api/drives", activeToken),
        api<Application[]>("/api/applications", activeToken),
        api<TestSummary[]>("/api/tests", activeToken)
      ]);
      setDashboard(dashboardData);
      setDrives(driveRows);
      setApplications(applicationRows);
      setTests(testRows);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    try {
      const session = await api<LoginResponse>("/api/auth/login", null, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setToken(session.token);
      setUser(session.user);
      writeStorage("placetrack-token", session.token);
      writeStorage("placetrack-user", JSON.stringify(session.user));
      flash(`Logged in as ${session.user.role.toLowerCase()}`);
    } catch (error) {
      flash(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (input: { name: string; email: string; password: string; branch: string; cgpa: number; skills: string[] }) => {
    setLoading(true);
    try {
      const session = await api<LoginResponse>("/api/auth/signup", null, {
        method: "POST",
        body: JSON.stringify({ ...input, graduationYear: 2027, backlogs: 0 })
      });
      setToken(session.token);
      setUser(session.user);
      writeStorage("placetrack-token", session.token);
      writeStorage("placetrack-user", JSON.stringify(session.user));
      flash("Account created and logged in");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Signup failed");
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

  // Client-side search filters
  const filteredDrives = useMemo(() => {
    if (!searchQuery) return drives;
    const q = searchQuery.toLowerCase();
    return drives.filter((d) =>
      d.company.name.toLowerCase().includes(q) ||
      d.role.toLowerCase().includes(q) ||
      d.location.toLowerCase().includes(q)
    );
  }, [drives, searchQuery]);

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
    return <LoginScreen dark={dark} loading={loading} onToggleTheme={() => setDark(!dark)} onLogin={handleLogin} onSignup={handleSignup} />;
  }

  const name = user.student?.name ?? user.coordinator?.department ?? (role === "ADMIN" ? "Admin Console" : user.email);

  return (
    <main className={dark ? "app dark" : "app light"}>
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
            <kbd>API</kbd>
          </div>
          <div className="header-actions">
            <button onClick={() => refreshAll()} aria-label="Refresh">{loading ? <Loader2 className="spin" size={18} /> : <Bell size={18} />}</button>
            <button onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="user-button" onClick={() => setProfileOpen(true)} aria-label="Open profile"><CircleUserRound size={22} /></button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div className="content" key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .22 }}>
            {view === "Overview" && <Overview role={role} name={name} dashboard={dashboard} applications={filteredApplications} drives={filteredDrives} onNavigate={setView} />}
            {view === "Applications" && <Applications role={role} token={token} applications={filteredApplications} onRefresh={() => refreshAll()} flash={flash} />}
            {view === "Opportunities" && <Opportunities role={role} token={token} drives={filteredDrives} onRefresh={() => refreshAll()} onNavigate={setView} flash={flash} onViewDrive={setSelectedDrive} />}
            {view === "Resume AI" && <ResumeAI token={token} flash={flash} />}
            {view === "Aptitude" && <Aptitude token={token} role={role} tests={filteredTests} flash={flash} />}
            {view === "Interview" && <InterviewCoach token={token} applications={applications} flash={flash} />}
            {view === "Profile" && <ProfilePage user={user} token={token} onSaved={async () => { await refreshMe(); await refreshAll(); flash("Profile updated"); }} flash={flash} />}
            {view === "Drive Creator" && <DriveCreator token={token} flash={flash} onCreated={() => refreshAll()} />}
            {view === "Analytics" && <Analytics dashboard={dashboard} />}
          </motion.div>
        </AnimatePresence>
      </section>
      {profileOpen && <ProfileModal user={user} token={token} onClose={() => setProfileOpen(false)} onSaved={async () => { await refreshMe(); await refreshAll(); flash("Profile updated"); }} flash={flash} />}
      {selectedDrive && <DriveDetailsModal drive={selectedDrive} role={role} token={token} onClose={() => setSelectedDrive(null)} onApplied={() => { refreshAll(); setSelectedDrive(null); }} flash={flash} />}
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}
    </main>
  );
}

function SkillsSelector({ selected, onChange }: { selected: string[]; onChange: (skills: string[]) => void }) {
  const toggleSkill = (skill: string) => {
    if (selected.includes(skill)) {
      onChange(selected.filter((s) => s !== skill));
    } else {
      onChange([...selected, skill]);
    }
  };

  return (
    <div className="skills-selector">
      <span>Skills (click to toggle)</span>
      <div className="skills-tags">
        {AVAILABLE_SKILLS.map((skill) => {
          const active = selected.includes(skill);
          return (
            <button
              key={skill}
              type="button"
              className={active ? "skill-tag active" : "skill-tag"}
              onClick={() => toggleSkill(skill)}
            >
              {skill}
            </button>
          );
        })}
      </div>
    </div>
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
  const apply = async () => {
    setApplying(true);
    try {
      await api("/api/applications", token, { method: "POST", body: JSON.stringify({ driveId: drive.id }) });
      flash("Application submitted successfully!");
      onApplied();
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not submit application");
    } finally {
      setApplying(false);
    }
  };

  const isEligible = drive.eligibility?.eligible !== false;
  const matchScore = drive.eligibility?.score ?? drive._count?.applications ?? 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card drive-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="drive-modal-header">
          <div className="drive-modal-company-info">
            <div className="company-logo large">{initials(drive.company.name)}</div>
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
              <span className="card-kicker">Match Score & Eligibility</span>
              <h3 style={{ margin: "4px 0 0" }}>Signal Score: {matchScore}%</h3>
            </div>
            <span className={isEligible ? "drive-eligibility-status eligible" : "drive-eligibility-status ineligible"}>
              {isEligible ? "Eligible" : "Not Eligible"}
            </span>
          </div>
          {!isEligible && drive.eligibility?.reasons && (
            <p className="warning" style={{ margin: "4px 0 0" }}>
              {drive.eligibility.reasons.join(", ")}
            </p>
          )}
        </div>

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

        <div className="inline-actions" style={{ marginTop: "8px" }}>
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
            <p className="helper-text">Coordinator / admin accounts can monitor this drive via the applications panel.</p>
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
    backlogs: String(student?.backlogs ?? 0)
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
          backlogs: Number(form.backlogs)
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
        {!student && <p className="section-copy">Coordinator/admin profile editing is not needed here. Student records can be managed from applications and analytics.</p>}
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

function ProfilePage({ user, token, onSaved, flash }: {
  user: SessionUser;
  token: string;
  onSaved: () => void | Promise<void>;
  flash: (message: string) => void;
}) {
  return (
    <>
      <PageTitle eyebrow="Profile" title="Keep your placement profile updated." copy="CGPA, skills, branch, graduation year, and backlogs directly affect eligibility and readiness." />
      <ProfileEditor user={user} token={token} onSaved={onSaved} flash={flash} />
    </>
  );
}

function ProfileEditor({ user, token, onSaved, flash }: {
  user: SessionUser;
  token: string;
  onSaved: () => void | Promise<void>;
  flash: (message: string) => void;
}) {
  const student = user.student;
  const [form, setForm] = useState({
    name: student?.name ?? "",
    branch: student?.branch ?? "Computer Engineering",
    cgpa: String(student?.cgpa ?? 7),
    graduationYear: String(student?.graduationYear ?? 2027),
    backlogs: String(student?.backlogs ?? 0)
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
          backlogs: Number(form.backlogs)
        })
      });
      await onSaved();
    } catch (error) {
      flash(error instanceof Error ? error.message : "Profile update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!student) {
    return <section className="card form-card"><EmptyState title="No student profile" copy="Coordinator and admin accounts use analytics and application tools instead." /></section>;
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
        <label>Name<input value={form.name} onChange={(event) => setForm((old) => ({ ...old, name: event.target.value }))} /></label>
        <label>Branch
          <select value={form.branch} onChange={(event) => setForm((old) => ({ ...old, branch: event.target.value }))}>
            {AVAILABLE_DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
          </select>
        </label>
        <label>CGPA<input value={form.cgpa} onChange={(event) => setForm((old) => ({ ...old, cgpa: event.target.value }))} /></label>
        <label>Graduation Year<input value={form.graduationYear} onChange={(event) => setForm((old) => ({ ...old, graduationYear: event.target.value }))} /></label>
        <label>Backlogs<input value={form.backlogs} onChange={(event) => setForm((old) => ({ ...old, backlogs: event.target.value }))} /></label>
        <SkillsSelector selected={selectedSkills} onChange={setSelectedSkills} />
      </div>
      <div className="inline-actions" style={{ marginTop: "24px" }}>
        <button className="primary-button" onClick={save} disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} Save profile</button>
        <span className="helper-text">Tip: add hackathons, certifications, internships, and stack keywords to improve matching.</span>
      </div>
    </section>
  );
}

function LoginScreen({ dark, loading, onToggleTheme, onLogin, onSignup }: {
  dark: boolean;
  loading: boolean;
  onToggleTheme: () => void;
  onLogin: (email: string, password: string) => void;
  onSignup: (input: { name: string; email: string; password: string; branch: string; cgpa: number; skills: string[] }) => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("New KK Wagh Student");
  const [branch, setBranch] = useState("Computer Engineering");
  const [cgpa, setCgpa] = useState("7.8");
  const [selectedSkills, setSelectedSkills] = useState<string[]>(["Java", "Python", "SQL", "Communication"]);

  useEffect(() => {
    setEmail("");
    setPassword("");
  }, [mode]);

  const submitAuth = () => {
    if (mode === "signup") {
      const isDemoEmail = demoAccounts.some((a) => a.email.toLowerCase() === email.toLowerCase().trim());
      if (isDemoEmail) { alert("Demo account emails cannot be used for signup. Use a unique email."); return; }
      onSignup({ name, email, password, branch, cgpa: Number(cgpa), skills: selectedSkills });
    } else {
      onLogin(email, password);
    }
  };

  return (
    <main className={dark ? "app dark login-app" : "app light login-app"}>
      <div className="login-card card">
        <div className="brand"><div className="brand-mark"><Command size={20} /></div><span>PlaceTrack <b>AI</b></span></div>
        <span className="eyebrow">Campus placement command center</span>
        <h1>{mode === "signin" ? "Login and run the full workflow." : "Create a student account."}</h1>
        <p className="section-copy">{mode === "signin" ? "Click a demo role below to instantly sign in, or type your own credentials." : "Signup creates a student profile and logs you in instantly."}</p>
        <div className="auth-tabs">
          <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Sign up</button>
        </div>
        {mode === "signin" && (
          <div className="demo-buttons" style={{ marginTop: "8px" }}>
            {demoAccounts.map((account) => (
              <span
                key={account.email}
                className="demo-btn-capsule"
                onClick={() => onLogin(account.email, account.password)}
              >
                {account.label}
              </span>
            ))}
            <p className="helper-text" style={{ marginTop: "6px", fontSize: "11px" }}>↑ One click instant login — or fill fields below manually</p>
          </div>
        )}
        <div style={{ display: "grid", gap: "16px", marginTop: "8px" }}>
          {mode === "signup" && <>
            <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label>Branch
              <select value={branch} onChange={(e) => setBranch(e.target.value)}>
                {AVAILABLE_DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </label>
            <label>CGPA<input value={cgpa} onChange={(e) => setCgpa(e.target.value)} /></label>
            <SkillsSelector selected={selectedSkills} onChange={setSelectedSkills} />
          </>}
          <label>Email<input value={email} autoComplete="off" onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitAuth(); }} /></label>
          <label>Password<input type="text" className="no-autofill-password" value={password} autoComplete="off" onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitAuth(); }} /></label>
          <button className="primary-button" disabled={loading} type="button" onClick={submitAuth}>
            {loading ? <Loader2 className="spin" size={16} /> : <ArrowUpRight size={16} />} {mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <button className="ghost-button" type="button" onClick={onToggleTheme}>{dark ? <Sun size={16} /> : <Moon size={16} />} Toggle theme</button>
        </div>
      </div>
    </main>
  );
}

function Overview({ role, name, dashboard, applications, drives, onNavigate }: { role: Role; name: string; dashboard: DashboardData | null; applications: Application[]; drives: Drive[]; onNavigate: (view: View) => void }) {
  const readiness = dashboard?.readiness as { score?: number; reasons?: string[] } | undefined;
  const stats = dashboard?.stats as Record<string, number> | undefined;
  return (
    <>
      <PageTitle eyebrow={role} title={`Good morning, ${name}.`} copy="Real backend data is powering this dashboard now." />
      <section className="hero-grid">
        <div className="card readiness-card">
          <div className="card-head"><div><span className="card-kicker">Placement readiness</span><h3>{role === "STUDENT" ? "Your current signal" : "Campus overview"}</h3></div><button onClick={() => onNavigate("Analytics")}>Details <ArrowUpRight size={14} /></button></div>
          <div className="readiness-body">
            <ReadinessRing value={Math.round(readiness?.score ?? Number(dashboard?.placementRate ?? 0) ?? 68)} />
            <div className="score-breakdown">
              <Metric label="Applications" value={stats?.applications ?? Number(dashboard?.applications ?? applications.length)} />
              <Metric label="Open drives" value={Number(dashboard?.activeDrives ?? drives.length)} />
              <Metric label="Offers/selected" value={stats?.offers ?? Number(dashboard?.selected ?? 0)} />
              <p><Sparkles size={14} /> {readiness?.reasons?.[0] ?? "Keep profiles updated before every drive."}</p>
            </div>
          </div>
        </div>
        <div className="stats-grid">
          <Stat icon={<BriefcaseBusiness />} value={String(stats?.applications ?? dashboard?.applications ?? applications.length)} label="Applications" sub="Live from DB" tone="violet" />
          <Stat icon={<CalendarDays />} value={String(stats?.interviews ?? applications.filter((item) => item.interview).length)} label="Interviews" sub="Scheduled rounds" tone="mint" />
          <Stat icon={<Trophy />} value={String(stats?.offers ?? dashboard?.selected ?? 0)} label="Offers" sub="Selected students" tone="gold" />
          <Stat icon={<Building2 />} value={String(dashboard?.companies ?? drives.length)} label="Companies" sub="Engineering seed" tone="blue" />
        </div>
      </section>
      <section className="mid-grid">
        <div className="card applications-card">
          <div className="card-head"><div><span className="card-kicker">Recent</span><h3>Applications</h3></div><button onClick={() => onNavigate("Applications")}>View all <ArrowUpRight size={14} /></button></div>
          <MiniApplicationList rows={applications.slice(0, 5)} />
        </div>
        <div className="card upcoming-card">
          <div className="card-head"><div><span className="card-kicker">Action</span><h3>Next best step</h3></div></div>
          <div className="event-date"><strong>{new Date().getDate()}</strong><span>{new Date().toLocaleString("en", { month: "short" }).toUpperCase()}</span></div>
          <div className="event-info"><span>{role === "STUDENT" ? "Student" : "Coordinator"}</span><h4>{role === "STUDENT" ? "Apply to a matching drive" : "Review applications and schedule rounds"}</h4><p>Use live modules from the sidebar.</p></div>
          <button className="primary-button" onClick={() => onNavigate(role === "STUDENT" ? "Opportunities" : "Applications")}>Open module <ArrowUpRight size={15} /></button>
        </div>
      </section>
    </>
  );
}

function Applications({ role, token, applications, onRefresh, flash }: { role: Role; token: string; applications: Application[]; onRefresh: () => void; flash: (message: string) => void }) {
  const [busyId, setBusyId] = useState("");
  const updateStatus = async (id: string, status: string) => {
    setBusyId(id);
    try {
      await api(`/api/applications/${id}/status`, token, { method: "PATCH", body: JSON.stringify({ status, note: "Updated from coordinator UI" }) });
      flash("Application status updated");
      onRefresh();
    } catch (error) {
      flash(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusyId("");
    }
  };
  return (
    <>
      <PageTitle eyebrow="Application center" title="Every application, one clear story." copy="Track status, timelines, and interview details." />
      <div className="application-detail-list">
        {applications.map((item) => <section className="card application-detail" key={item.id}>
          <div className="application-detail-head">
            <div className="company-logo large">{initials(item.drive.company.name)}</div>
            <div><h3>{item.drive.company.name}</h3><p>{item.drive.role}{item.student ? ` · ${item.student.name}` : ""}</p></div>
            <span className="status-badge">{pretty(item.status)}</span>
            <div className="deadline"><span>Updated</span><strong>{new Date(item.updatedAt).toLocaleDateString()}</strong></div>
          </div>
          <ApplicationTimeline current={Math.max(0, statusOptions.indexOf(item.status))} />
          {role !== "STUDENT" && <div className="inline-actions">
            <select disabled={busyId === item.id} defaultValue={item.status} onChange={(event) => updateStatus(item.id, event.target.value)}>
              {statusOptions.map((status) => <option key={status}>{status}</option>)}
            </select>
            {busyId === item.id && <Loader2 className="spin" size={16} />}
          </div>}
        </section>)}
        {!applications.length && <EmptyState title="No applications yet" copy="Apply to an open drive to create the first timeline." />}
      </div>
    </>
  );
}

function Opportunities({ role, token, drives, onRefresh, onNavigate, flash, onViewDrive }: { role: Role; token: string; drives: Drive[]; onRefresh: () => void; onNavigate: (view: View) => void; flash: (message: string) => void; onViewDrive: (drive: Drive) => void }) {
  const sortedDrives = [...drives].sort((a, b) => {
    if (a.alreadyApplied !== b.alreadyApplied) return a.alreadyApplied ? 1 : -1;
    return (b.eligibility?.score ?? 0) - (a.eligibility?.score ?? 0);
  });

  return (
    <>
      <PageTitle eyebrow="Matched opportunities" title="KK Wagh engineering placement profile." copy="Students can apply; coordinators can monitor demand and eligibility." />
      <div className="opportunity-grid">
        {sortedDrives.slice(0, 24).map((drive) => <article className="card opportunity-card" key={drive.id}>
          <div className={drive.eligibility?.eligible === false ? "match-score weak" : "match-score"}><strong>{drive.eligibility?.score ?? drive._count?.applications ?? 0}</strong><span>{drive.eligibility ? "match" : "apps"}</span></div>
          <div className="opportunity-logo">{initials(drive.company.name)}</div>
          <span className="deadline-chip">Closes {new Date(drive.deadline).toLocaleDateString()}</span>
          <h3>{drive.company.name}</h3><p className="role">{drive.role}</p>
          <div className="job-meta"><span>Rs {drive.package} LPA</span><span>{drive.location}</span><span>CGPA {drive.minCgpa}+</span></div>
          {drive.eligibility && !drive.eligibility.eligible && <p className="warning">{drive.eligibility.reasons.join(", ")}</p>}
          {role === "STUDENT" && drive.alreadyApplied
            ? <button className="secondary-button" disabled>Already applied <CheckCircle2 size={15} /></button>
            : role === "STUDENT" && drive.eligibility?.eligible === false
            ? <button className="secondary-button" onClick={() => onNavigate("Profile")}>Update profile <ArrowUpRight size={15} /></button>
            : <button className="primary-button" onClick={() => onViewDrive(drive)}>View & Apply <ArrowUpRight size={15} /></button>}
        </article>)}
      </div>
    </>
  );
}

function ResumeAI({ token, flash }: { token: string; flash: (message: string) => void }) {
  const [text, setText] = useState("Education: B.Sc Computer Science. Skills: JavaScript, React, Node.js, SQL, Docker. Projects: Built placement tracker used by 500+ students. Experience: Internship in web development. Contact: student@example.com +91 9876543210");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const analyze = async () => {
    setLoading(true);
    try {
      setResult(await api("/api/ai/resume/text", token, { method: "POST", body: JSON.stringify({ text }) }));
      flash("Resume analyzed");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Resume analysis failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className="analyzer-grid">
      <div>
        <span className="eyebrow"><FileScan size={15} /> Resume AI</span>
        <h2>Analyze text resume.</h2>
        <p className="section-copy">Paste your resume text below to run the AI placement matching analysis.</p>
        <textarea value={text} onChange={(event) => setText(event.target.value)} />
        <div className="inline-actions">
          <button className="primary-button" onClick={analyze} disabled={loading}>{loading ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />} Analyze text</button>
        </div>
      </div>
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
      flash(error instanceof Error ? error.message : "Could not load test");
    }
  };
  const submit = async () => {
    if (!active?.id) return;
    try {
      const result = await api<Record<string, unknown>>(`/api/tests/${active.id}/submit`, token, { method: "POST", body: JSON.stringify({ answers }) });
      flash(`Submitted. Accuracy ${result.accuracy}%`);
    } catch (error) {
      flash(error instanceof Error ? error.message : "Submit failed");
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

function InterviewCoach({ token, applications, flash }: { token: string; applications: Application[]; flash: (message: string) => void }) {
  const [role, setRole] = useState(applications[0]?.drive.role ?? "Software Engineer");
  const [questions, setQuestions] = useState<Array<{ question: string; difficulty: string; focus: string }>>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Record<string, { score: number; strengths: string[]; weaknesses: string[]; modelAnswer: string }>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  const generate = async () => {
    try {
      setQuestions(await api("/api/ai/interview", token, { method: "POST", body: JSON.stringify({ role, count: 8 }) }));
      setSelectedQuestion(null);
      setEvaluations({});
      setAnswers({});
      flash("Interview questions generated");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not generate questions");
    }
  };

  const submitAnswer = async (questionText: string) => {
    const answer = answers[questionText]?.trim();
    if (!answer) {
      flash("Please type an answer before submitting.");
      return;
    }
    setSubmitting((prev) => ({ ...prev, [questionText]: true }));
    try {
      const response = await api<{ score: number; strengths: string[]; weaknesses: string[]; modelAnswer: string }>(
        "/api/ai/interview/feedback",
        token,
        {
          method: "POST",
          body: JSON.stringify({ question: questionText, answer, role })
        }
      );
      setEvaluations((prev) => ({ ...prev, [questionText]: response }));
      flash("Answer evaluated by AI!");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Feedback generation failed");
    } finally {
      setSubmitting((prev) => ({ ...prev, [questionText]: false }));
    }
  };

  return (
    <>
      <PageTitle eyebrow="Interview coach" title="Generate role-specific practice questions." copy="Students use it for prep; coordinators can use it to design mock panels." />
      <section className="card form-card">
        <label>Target role<input value={role} onChange={(event) => setRole(event.target.value)} /></label>
        <button className="primary-button" onClick={generate}><Sparkles size={16} /> Generate questions</button>
      </section>
      <div className="insight-list">
        {questions.map((item, index) => {
          const isSelected = selectedQuestion === item.question;
          const evaluation = evaluations[item.question];
          const isSubmitting = submitting[item.question] || false;

          return (
            <div
              className={`card insight insight-row-clickable ${isSelected ? "selected-question" : ""}`}
              key={item.question}
              onClick={() => setSelectedQuestion(isSelected ? null : item.question)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div style={{ width: "100%" }}>
                <strong>{item.question}</strong>
                <p>{item.difficulty} · {item.focus}</p>

                {isSelected && (
                  <div className="interview-practice-panel" onClick={(e) => e.stopPropagation()}>
                    <textarea
                      placeholder="Type your answer to this question..."
                      value={answers[item.question] || ""}
                      onChange={(e) => setAnswers({ ...answers, [item.question]: e.target.value })}
                    />
                    <button
                      className="primary-button"
                      disabled={isSubmitting || !(answers[item.question]?.trim())}
                      onClick={() => submitAnswer(item.question)}
                    >
                      {isSubmitting ? <Loader2 className="spin" size={16} /> : <Send size={16} />} Submit Answer for AI Evaluation
                    </button>

                    {evaluation && (
                      <div className="interview-feedback-box">
                        <div className="interview-feedback-header">
                          <strong>AI Evaluation Feedback</strong>
                          <span>Score: {evaluation.score}/10</span>
                        </div>
                        <div className="feedback-points-list strengths">
                          <span>Strengths</span>
                          <ul>
                            {evaluation.strengths.map((str, idx) => <li key={idx}>{str}</li>)}
                          </ul>
                        </div>
                        <div className="feedback-points-list weaknesses">
                          <span>Areas for Improvement</span>
                          <ul>
                            {evaluation.weaknesses.map((weak, idx) => <li key={idx}>{weak}</li>)}
                          </ul>
                        </div>
                        <div className="model-answer-section">
                          <span>Model Answer Suggestion</span>
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

function DriveCreator({ token, flash, onCreated }: { token: string; flash: (message: string) => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    company: "Cognizant", role: "Graduate Trainee", package: "2.9", location: "Pune", minCgpa: "6.5",
    deadline: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10)
  });
  const [allowedBranches, setAllowedBranches] = useState<string[]>(["Computer Engineering", "Information Technology"]);

  const create = async () => {
    try {
      await api("/api/drives", token, {
        method: "POST",
        body: JSON.stringify({
          company: { name: form.company, description: `${form.company} campus hiring partner.` },
          role: form.role,
          package: Number(form.package),
          location: form.location,
          jobType: "Full-time",
          description: "Campus hiring drive created from coordinator dashboard.",
          minCgpa: Number(form.minCgpa),
          allowedBranches: allowedBranches,
          maxBacklogs: 1,
          graduationYear: 2027,
          deadline: form.deadline,
          status: "OPEN"
        })
      });
      flash("Drive created");
      onCreated();
    } catch (error) {
      flash(error instanceof Error ? error.message : "Drive creation failed");
    }
  };

  return (
    <>
      <PageTitle eyebrow="Coordinator tools" title="Create a new placement drive." copy="This posts directly to the backend and appears for eligible students." />
      <section className="card form-card">
        <div className="grid-form">
          <label>Company<input value={form.company} onChange={(e) => setForm(old => ({ ...old, company: e.target.value }))} /></label>
          <label>Role<input value={form.role} onChange={(e) => setForm(old => ({ ...old, role: e.target.value }))} /></label>
          <label>Package (LPA)<input value={form.package} onChange={(e) => setForm(old => ({ ...old, package: e.target.value }))} /></label>
          <label>Location<input value={form.location} onChange={(e) => setForm(old => ({ ...old, location: e.target.value }))} /></label>
          <label>Min CGPA<input value={form.minCgpa} onChange={(e) => setForm(old => ({ ...old, minCgpa: e.target.value }))} /></label>
          <label>Deadline<input value={form.deadline} type="date" onChange={(e) => setForm(old => ({ ...old, deadline: e.target.value }))} /></label>
        </div>
        <div style={{ marginTop: "14px", display: "grid", gap: "8px" }}>
          <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".11em" }}>Allowed Branches</span>
          <div className="branch-checkbox-grid">
            {AVAILABLE_DEPARTMENTS.map((dept) => {
              const checked = allowedBranches.includes(dept);
              return (
                <label key={dept} className="branch-checkbox-label">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (checked) {
                        setAllowedBranches(allowedBranches.filter((b) => b !== dept));
                      } else {
                        setAllowedBranches([...allowedBranches, dept]);
                      }
                    }}
                  />
                  {dept}
                </label>
              );
            })}
          </div>
        </div>
        <button className="primary-button" style={{ marginTop: "20px" }} onClick={create}>
          <Plus size={16} /> Create drive
        </button>
      </section>
    </>
  );
}

function Analytics({ dashboard }: { dashboard: DashboardData | null }) {
  const rows = (dashboard?.branchPerformance as Array<{ branch: string; students: number; readiness: number }> | undefined) ?? [];
  return (
    <>
      <PageTitle eyebrow="Placement intelligence" title="Coordinator analytics." copy="Placement rate, packages, active companies, and branch readiness." />
      <div className="analytics-stats">
        <Stat icon={<Users />} value={String(dashboard?.students ?? 0)} label="Students" sub="Seeded profiles" tone="violet" />
        <Stat icon={<Building2 />} value={String(dashboard?.companies ?? 0)} label="Companies" sub="From report" tone="mint" />
        <Stat icon={<GraduationCap />} value={`${dashboard?.placementRate ?? 0}%`} label="Placement rate" sub="Selected/student" tone="gold" />
        <Stat icon={<BriefcaseBusiness />} value={`Rs ${Number(dashboard?.averagePackage ?? 0).toFixed(1)}L`} label="Avg package" sub={`High Rs ${Number(dashboard?.highestPackage ?? 0).toFixed(1)}L`} tone="blue" />
      </div>
      <section className="card analytics-chart">
        <div className="card-head"><div><span className="card-kicker">By department</span><h3>Readiness</h3></div></div>
        <ResponsiveContainer width="100%" height={310}>
          <BarChart data={rows} margin={{ left: -24, right: 10, top: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
            <XAxis dataKey="branch" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)" }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)" }} />
            <Tooltip cursor={{ fill: "var(--hover)" }} contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12 }} />
            <Bar dataKey="readiness" fill="#8c6cff" radius={[8, 8, 2, 2]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </>
  );
}

function PageTitle({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div className="page-title"><div><span>{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div><div className="date-pill"><CalendarDays size={16} /> Placement season 2025-26</div></div>;
}

function Stat({ icon, value, label, sub, tone }: { icon: ReactNode; value: string; label: string; sub: string; tone: string }) {
  return <div className="card stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><strong>{value}</strong><span>{label}</span><small>{sub}</small></div></div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div><span>{label}</span><strong>{value}</strong><i><b style={{ width: `${Math.min(100, value)}%` }} /></i></div>;
}

function MiniApplicationList({ rows }: { rows: Application[] }) {
  if (!rows.length) return <EmptyState title="No applications" copy="Recent applications will appear here." />;
  return <div className="application-list">{rows.map((item) => <div className="application-row" key={item.id}>
    <div className="company-logo">{initials(item.drive.company.name)}</div>
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

function initials(value: string) {
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "PT";
}

function pretty(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
