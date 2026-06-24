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
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (input: { name: string; email: string; password: string; branch: string; cgpa: number; skills: string[]; role: "STUDENT" | "COORDINATOR" }) => {
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
      flash(`Account created as ${input.role.toLowerCase()} — logged in`);
    } catch (error) {
      flash(error instanceof Error ? error.message : "Signup failed");
      throw error;
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
            {view === "Interview" && <InterviewCoach token={token} flash={flash} />}
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
  onLogin: (email: string, password: string) => void | Promise<void>;
  onSignup: (input: { name: string; email: string; password: string; branch: string; cgpa: number; skills: string[]; role: "STUDENT" | "COORDINATOR" }) => void | Promise<void>;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<"STUDENT" | "COORDINATOR">("STUDENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("Computer Engineering");
  const [cgpa, setCgpa] = useState("7.8");
  const [selectedSkills, setSelectedSkills] = useState<string[]>(["Java", "Python", "SQL", "Communication"]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setEmail("");
    setPassword("");
    setName("");
    setCgpa("7.8");
    setRole("STUDENT");
    setErrorMsg("");
  }, [mode]);

  const submitAuth = async () => {
    setErrorMsg("");
    try {
      if (mode === "signin") {
        await onLogin(email, password);
      } else {
        await onSignup({ name, email, password, branch, cgpa: Number(cgpa), skills: selectedSkills, role });
      }
    } catch (error: any) {
      console.error("Authentication error caught:", error);
      const msg = error?.message || error?.error || (typeof error === "string" ? error : "Authentication failed");
      setErrorMsg(msg);
    }
  };

  return (
    <main className={dark ? "app dark login-app" : "app light login-app"}>
      <div className="login-card card">
        <div className="brand"><div className="brand-mark"><Command size={20} /></div><span>PlaceTrack <b>AI</b></span></div>
        <span className="eyebrow">Campus placement command center</span>
        <h1>{mode === "signin" ? "Login to your account." : "Create your account."}</h1>
        <p className="section-copy">{mode === "signin" ? "Enter your email and password to access your placement dashboard." : "Choose your role and fill in your details to get started."}</p>
        
        {errorMsg && (
          <div className="login-error-message">
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="auth-tabs">
          <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Sign up</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); submitAuth(); }} style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
          {mode === "signup" && <>
            <div>
              <label style={{ display: "block", marginBottom: "6px" }}>I am a</label>
              <div className="role-selector">
                <button
                  type="button"
                  className={role === "STUDENT" ? "role-btn active" : "role-btn"}
                  onClick={() => setRole("STUDENT")}
                >
                  🎓 Student
                </button>
                <button
                  type="button"
                  className={role === "COORDINATOR" ? "role-btn active" : "role-btn"}
                  onClick={() => setRole("COORDINATOR")}
                >
                  🏢 Coordinator
                </button>
              </div>
            </div>
            <label>Name<input value={name} placeholder="Your full name" onChange={(e) => { setName(e.target.value); setErrorMsg(""); }} /></label>
            {role === "STUDENT" && <>
              <label>Branch
                <select value={branch} onChange={(e) => { setBranch(e.target.value); setErrorMsg(""); }}>
                  {AVAILABLE_DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                </select>
              </label>
              <label>CGPA<input value={cgpa} placeholder="e.g. 8.2" onChange={(e) => { setCgpa(e.target.value); setErrorMsg(""); }} /></label>
              <SkillsSelector selected={selectedSkills} onChange={(skills) => { setSelectedSkills(skills); setErrorMsg(""); }} />
            </>}
            {role === "COORDINATOR" && <>
              <label>Department
                <select value={branch} onChange={(e) => { setBranch(e.target.value); setErrorMsg(""); }}>
                  {AVAILABLE_DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                </select>
              </label>
            </>}
          </>}
          <label>Email<input value={email} placeholder="your@email.com" autoComplete="off" onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }} /></label>
          <label>Password<input type="text" className="no-autofill-password" value={password} placeholder="Password" autoComplete="off" onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }} /></label>
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? <Loader2 className="spin" size={16} /> : <ArrowUpRight size={16} />} {mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <button className="ghost-button" type="button" onClick={onToggleTheme}>{dark ? <Sun size={16} /> : <Moon size={16} />} Toggle theme</button>
        </form>
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
    // Applied goes last
    if (a.alreadyApplied !== b.alreadyApplied) return a.alreadyApplied ? 1 : -1;
    // Eligible goes before ineligible
    const aElig = a.eligibility?.eligible !== false ? 1 : 0;
    const bElig = b.eligibility?.eligible !== false ? 1 : 0;
    if (aElig !== bElig) return bElig - aElig;
    // Among eligible: higher package first
    return b.package - a.package;
  });

  return (
    <>
      <PageTitle eyebrow="Placement drives" title="KK Wagh engineering placement profile." copy="Drives are filtered by your eligibility — branch, CGPA, and backlogs." />
      <div className="opportunity-grid">
        {sortedDrives.slice(0, 24).map((drive) => {
          const eligible = drive.eligibility?.eligible !== false;
          const hasEligibility = !!drive.eligibility;
          return (
            <article className="card opportunity-card" key={drive.id}>
              {hasEligibility && (
                <div className={eligible ? "eligibility-badge eligible" : "eligibility-badge ineligible"}>
                  {eligible ? <CheckCircle2 size={12} /> : <X size={12} />}
                  {eligible ? "Eligible" : "Not Eligible"}
                </div>
              )}
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
            </article>
          );
        })}
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

function InterviewCoach({ token, flash }: { token: string; flash: (message: string) => void }) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"technical" | "soft">("technical");
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Record<string, { score: number; strengths: string[]; weaknesses: string[]; modelAnswer: string }>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  const questionBank: Record<string, { technical: string[]; soft: string[] }> = {
    "Software Engineer": {
      technical: ["What is the difference between stack and heap memory?","Explain time complexity. Give examples of O(1), O(n log n), and O(n²) operations.","What are SOLID principles? Explain each with a real-world example.","What is the difference between a process and a thread?","Explain how garbage collection works in Java or Python.","What is the difference between REST and GraphQL APIs?","What is a deadlock? How do you detect and prevent it?","Name 3 common design patterns and describe when you would use each.","What is the difference between SQL and NoSQL databases? When would you choose each?","How would you design a URL shortener system like bit.ly?","What is the CAP theorem in distributed systems?","Explain database indexing — how it works and when it can hurt performance."],
      soft: ["Why are you the best fit for a Software Engineer role compared to other candidates?","Describe a challenging technical problem you solved. What was your thought process?","How do you keep yourself updated with the latest technologies and trends?","Tell me about a time you had to collaborate with a difficult team member. How did you handle it?","Where do you see yourself in 5 years, and how does this role help you get there?"],
    },
    "Frontend Developer": {
      technical: ["What is the difference between == and === in JavaScript?","Explain the virtual DOM in React and why it improves performance.","What is the difference between let, const, and var in JavaScript?","How does CSS specificity work? Give an example of a specificity conflict.","What is a closure in JavaScript? Provide a real-world use case.","Explain the React component lifecycle — mounting, updating, and unmounting phases.","What is the difference between useEffect and useLayoutEffect?","How does CORS work and how do you handle it in a frontend app?","What is lazy loading and how do you implement it in React?","Explain Flexbox vs CSS Grid — when do you use each?","What is debouncing and throttling? When would you use each?","How do you optimize a React application for performance?"],
      soft: ["Why are you the best fit for a Frontend Developer role?","Describe a UI/UX challenge you faced and how you solved it creatively.","How do you ensure your code is accessible for all users including those with disabilities?","Tell me about a time you received critical feedback on your design or code. How did you respond?","How do you balance visual design aesthetics with performance requirements?"],
    },
    "Backend Developer": {
      technical: ["Explain the difference between synchronous and asynchronous programming.","What is middleware in Express.js? Give a concrete example.","How do you handle authentication and authorization in a backend API?","What is the N+1 query problem in databases and how do you solve it?","Explain database transactions and ACID properties with examples.","What is the difference between horizontal and vertical scaling?","How do you implement rate limiting in an API?","What is JWT? Explain how it works for stateless authentication.","Explain caching strategies — write-through, write-back, and cache-aside.","How would you design a REST API for a food delivery platform?","What is message queuing? When would you use Kafka over RabbitMQ?","How do you handle API versioning in a backward-compatible way?"],
      soft: ["Why are you the best fit for a Backend Developer role?","Describe a situation where your backend code failed in production. What did you do?","How do you approach performance optimization when an API endpoint is slow?","Tell me about a critical architectural decision you made. What were the trade-offs?","How do you ensure security in your backend APIs beyond just authentication?"],
    },
    "Full Stack Developer": {
      technical: ["How do you decide which logic should live on the frontend vs the backend?","Explain how a request travels from a browser to a database and back with all layers.","What is server-side rendering (SSR) vs client-side rendering (CSR)? When do you use each?","How do you manage global state in a full stack application?","What is WebSocket and when would you use it over HTTP?","Explain database normalization vs intentional denormalization.","How do you handle file uploads securely in a full stack application?","What is the difference between cookies, local storage, and session storage?","How would you implement real-time notifications in a web app?","What is CI/CD and how have you used it in a real project?","How do you handle environment variables and secrets securely in production?","Explain microservices vs monolithic architecture trade-offs."],
      soft: ["Why are you the best fit for a Full Stack Developer role?","Describe the most complex full stack project you have built. What were the hardest parts?","How do you manage your time when working on both frontend and backend tasks simultaneously?","Tell me about a time you had to learn a new technology quickly for a project deadline.","How do you ensure consistency between frontend and backend data validation?"],
    },
    "Data Analyst": {
      technical: ["What is the difference between INNER JOIN, LEFT JOIN, and FULL OUTER JOIN?","How do you handle missing or null data in a dataset?","Explain the difference between GROUP BY and PARTITION BY in SQL.","What is a pivot table and how do you create one?","What is the difference between mean, median, and mode? When is each more useful?","Explain what a SQL window function is and give a practical example.","How do you detect and handle outliers in a dataset?","What is the difference between data normalization and standardization?","How would you analyze and visualize monthly sales trends over 3 years?","Explain the concept of A/B testing. How do you determine statistical significance?","What tools have you used for data visualization? Compare Power BI vs Tableau.","How do you validate data quality and accuracy before starting analysis?"],
      soft: ["Why are you the best fit for a Data Analyst role?","Describe a data analysis project where your insights surprised the team or management.","How do you explain complex data findings to non-technical business stakeholders?","Tell me about a time your analysis directly influenced an important business decision.","How do you prioritize which data questions to answer first when you have limited time?"],
    },
    "Machine Learning Engineer": {
      technical: ["What is the difference between supervised, unsupervised, and reinforcement learning?","Explain overfitting and underfitting. How do you prevent each?","What is the bias-variance tradeoff and how does it affect model selection?","Explain k-fold cross-validation. Why is it preferred over a single train-test split?","What is the difference between precision and recall? When do you prioritize each?","How does gradient descent work? What problems can arise with the learning rate?","What is the difference between Random Forest and XGBoost? When would you choose each?","What is L1 vs L2 regularization? How does each affect the model?","How do you handle class imbalance in a classification problem?","What is feature engineering? Give 3 examples of useful feature transformations.","Explain how backpropagation works in a neural network.","How would you deploy a machine learning model to production and monitor it?"],
      soft: ["Why are you the best fit for a Machine Learning Engineer role?","Describe a machine learning project where the model did not perform as expected. How did you debug it?","How do you explain predictions from a black-box model to non-technical stakeholders?","Tell me about a time you had to preprocess a messy, real-world dataset under time pressure.","How do you stay current with the rapidly evolving field of machine learning?"],
    },
    "DevOps Engineer": {
      technical: ["What is the difference between Docker and a Virtual Machine?","Explain the Kubernetes concepts of pod, deployment, and service.","What is CI/CD? Describe each stage of a typical CI/CD pipeline.","What is infrastructure as code? Compare Terraform and Ansible.","How do you monitor a production application? What metrics matter most?","What is the difference between blue-green and canary deployments?","Explain how a load balancer works and the difference between L4 and L7 load balancing.","What is Helm in Kubernetes and why is it useful?","How do you manage secrets in a DevOps pipeline securely?","Explain DNS resolution step by step from browser to IP address.","What is the difference between TCP and UDP? When would you choose each?","How would you set up alerting for a production service going down at 2 AM?"],
      soft: ["Why are you the best fit for a DevOps Engineer role?","Describe a production deployment incident you helped resolve. What was the root cause?","How do you collaborate with developers to improve deployment speed and reliability?","Tell me about a time you automated a repetitive operational task that saved significant time.","How do you build a culture of security throughout the CI/CD pipeline?"],
    },
    "Cloud Engineer": {
      technical: ["What is the difference between IaaS, PaaS, and SaaS? Give examples of each.","Explain the difference between AWS EC2, Lambda, and ECS.","What is auto-scaling? Describe how it works and when it triggers.","Explain S3 storage classes and give a use case for each.","What is a VPC? Explain how subnets, route tables, and security groups relate.","What is the difference between AWS RDS and DynamoDB? When do you choose each?","How do you implement high availability in a cloud architecture?","What is CloudFront and how does it reduce latency for global users?","Explain IAM roles, policies, and the principle of least privilege.","How do you identify and reduce unnecessary cloud costs in a large environment?","What is a serverless architecture? What are its advantages and limitations?","How does a CDN (Content Delivery Network) work?"],
      soft: ["Why are you the best fit for a Cloud Engineer role?","Describe a cloud architecture you designed or significantly contributed to.","Tell me about a time you reduced cloud infrastructure costs without sacrificing reliability.","How do you ensure compliance and security in a multi-cloud environment?","How do you keep up with the constantly expanding catalog of cloud services?"],
    },
    "Android Developer": {
      technical: ["What is the difference between an Activity and a Fragment in Android?","Explain the Android Activity lifecycle and what happens during a screen rotation.","What is a ViewModel and how does it survive configuration changes?","What is LiveData and how does it differ from Kotlin Flow?","Explain how Retrofit works and how you handle API errors in Android.","What is the Room database library? How is it better than raw SQLite?","How do you handle background work in Android using WorkManager?","What is the difference between Serializable and Parcelable in Android?","Explain how Dependency Injection with Hilt simplifies Android development.","What is Jetpack Compose? How is it different from XML-based UI development?","How do you profile and optimize memory usage in an Android app?","What are the best practices for storing sensitive data securely on Android?"],
      soft: ["Why are you the best fit for an Android Developer role?","Describe the most complex Android feature you have built. What technical challenges did you face?","How do you approach testing an Android app across different screen sizes and OS versions?","Tell me about a time you had to optimize a poorly performing Android app.","How do you prioritize battery life and performance while delivering feature-rich apps?"],
    },
    "Java Developer": {
      technical: ["What is the difference between an abstract class and an interface in Java 8+?","Explain Java's memory model — heap, stack, Metaspace, and method area.","What is the difference between checked and unchecked exceptions? When do you use each?","How does HashMap work internally? What happens during a hash collision?","What is the difference between synchronized, volatile, and AtomicInteger?","What are Java Streams? Write an example to filter and sort a list of employees by salary.","What is the difference between String, StringBuilder, and StringBuffer?","How does Spring Boot's dependency injection work? What is the IoC container?","How do you implement a thread-safe singleton in Java? Show two approaches.","What is the difference between JVM, JRE, and JDK?","What is the difference between final, finally, and finalize in Java?","Explain Java garbage collection — what are the different GC algorithms and when to use each?"],
      soft: ["Why are you the best fit for a Java Developer role?","Describe the most complex Java project you have worked on professionally or academically.","Tell me about a time a Java concurrency bug caused a production issue. How did you debug it?","How do you ensure your Java code is clean, maintainable, and scalable over time?","How do you approach learning a new Java framework quickly when assigned to a new project?"],
    },
    "Python Developer": {
      technical: ["What are Python decorators? Write a simple logging decorator from scratch.","What is the difference between a list and a tuple? When would you prefer each?","What is a generator in Python? How is it more memory-efficient than returning a list?","Explain Python's GIL (Global Interpreter Lock). How does it affect multithreaded code?","What is the difference between copy.copy() and copy.deepcopy()?","How does Python's asyncio event loop work? Explain async/await.","Compare list comprehension vs generator expression — when to use each.","What are context managers? Write a custom context manager using __enter__ and __exit__.","What is the difference between @staticmethod and @classmethod?","How do you manage packages and virtual environments in a Python project?","Explain Python's memory management, reference counting, and cyclic garbage collector.","What is FastAPI and how does it differ from Flask and Django for building APIs?"],
      soft: ["Why are you the best fit for a Python Developer role?","Describe a Python project you built from scratch. What were the biggest technical challenges?","How do you write clean, Pythonic, readable code? What standards do you follow?","Tell me about a time you significantly optimized a slow Python script or service.","How do you approach debugging a complex Python issue that only occurs in production?"],
    },
    "QA / Test Engineer": {
      technical: ["What is the difference between unit, integration, system, and end-to-end testing?","Explain the test pyramid. Why should you have more unit tests than E2E tests?","What is the difference between black-box and white-box testing?","What makes a good test case? What properties should a well-written test have?","What is regression testing and at what stage of development do you perform it?","How does Selenium WebDriver work for UI test automation?","What is the difference between functional and non-functional testing?","How do you perform API testing? Describe your approach and tools used.","What is boundary value analysis and equivalence partitioning? Give examples.","How do you identify and handle flaky tests in a CI/CD pipeline?","What is performance testing? What metrics do you measure and what tools do you use?","How do you decide which test cases to automate vs keep as manual tests?"],
      soft: ["Why are you the best fit for a QA/Test Engineer role?","Describe a critical bug you found that would have caused a major issue if it reached production.","How do you collaborate effectively with developers who push back on bug reports?","Tell me about a time you had to test a feature with very little documentation or specifications.","How do you maintain quality standards when the team is under pressure to ship quickly?"],
    },
    "Database Administrator": {
      technical: ["What is the difference between a clustered and a non-clustered index?","Explain database normalization forms 1NF, 2NF, 3NF, and BCNF with examples.","How do you use EXPLAIN or EXPLAIN ANALYZE to optimize a slow query?","What is database replication? Compare master-slave and master-master replication.","What is database sharding? What are its benefits and trade-offs?","Explain the difference between OLTP and OLAP systems with examples.","How do you perform a point-in-time recovery of a PostgreSQL database?","What is a stored procedure? When is it better to use one vs application-level code?","How do you handle database schema migrations safely in a production environment?","How do you detect and resolve database deadlocks?","What is connection pooling and why is it critical for high-traffic applications?","How do you identify and tune the top 5 slowest queries in a production database?"],
      soft: ["Why are you the best fit for a Database Administrator role?","Describe a database incident that caused production downtime. How did you investigate and resolve it?","How do you ensure data security, encryption, and prevent unauthorized access?","Tell me about a time you optimized a poorly performing database under production load.","How do you communicate database limitations and schema constraints to development teams?"],
    },
    "Cybersecurity Analyst": {
      technical: ["What is the difference between symmetric and asymmetric encryption? Give examples of each.","Explain SQL injection with an example and describe how to prevent it.","What is Cross-Site Scripting (XSS)? What is the difference between stored and reflected XSS?","What is a man-in-the-middle attack? How is it prevented in HTTPS?","Explain 5 items from the OWASP Top 10 and how to mitigate each.","What is the difference between an IDS and an IPS?","How does SSL/TLS handshake work? What is the role of a certificate authority?","What are the phases of a penetration test?","Explain the CIA triad — Confidentiality, Integrity, Availability — with examples.","What is a zero-day vulnerability? How do organizations protect against unknown threats?","How do you perform a security audit on a web application?","What is the difference between authentication, authorization, and accounting (AAA)?"],
      soft: ["Why are you the best fit for a Cybersecurity Analyst role?","Describe a security incident you investigated or helped respond to.","How do you stay updated on the latest threats, CVEs, and attack techniques?","Tell me about a time you had to convince management to invest in a security improvement.","How do you balance strict security requirements with a smooth user experience?"],
    },
    "Network Engineer": {
      technical: ["Explain the OSI model and describe the role of each of the 7 layers.","What is the difference between TCP and UDP? When would you use each?","How does the BGP routing protocol work and when is it used?","What is a VLAN and why do organizations use them?","Explain NAT (Network Address Translation) and the difference between SNAT and DNAT.","What is the difference between a router, a managed switch, and a hub?","Describe the complete DNS resolution process from browser to IP address.","What is the difference between OSPF and RIP routing protocols?","Explain subnetting. Calculate the hosts, network address, and broadcast for a /26 subnet.","What is QoS (Quality of Service)? How do you configure traffic prioritization?","Walk me through how you would troubleshoot a complete network outage step by step.","What is the difference between a stateful and stateless firewall?"],
      soft: ["Why are you the best fit for a Network Engineer role?","Describe a major network outage you helped diagnose and resolve under pressure.","How do you document network architecture so future engineers can understand it quickly?","Tell me about a time you had to learn a new networking protocol or technology quickly.","How do you handle multiple network issues occurring simultaneously with limited resources?"],
    },
    "Embedded Systems Engineer": {
      technical: ["What is the fundamental difference between a microcontroller and a microprocessor?","Explain what an RTOS is and why you would use it over a bare-metal approach.","What is the difference between I2C, SPI, and UART? When do you use each?","Explain how interrupt handling and interrupt service routines work in embedded systems.","What is memory-mapped I/O and how does it differ from port-mapped I/O?","Explain the difference between volatile and non-volatile memory types.","How do you optimize C code for execution speed and memory on a constrained microcontroller?","What is DMA (Direct Memory Access) and when is it beneficial?","What is a watchdog timer and how do you use it to improve system reliability?","How do you debug an embedded system that has no display, serial port, or debugger?","What is endianness? Explain little-endian vs big-endian with an example.","How do you write firmware that is both correct and power-efficient?"],
      soft: ["Why are you the best fit for an Embedded Systems Engineer role?","Describe the most complex embedded system project you have worked on.","Tell me about a time a hardware-software interface bug caused a major issue. How did you find and fix it?","How do you work within tight real-time constraints in safety-critical systems?","How do you collaborate with hardware engineers to define and validate interfaces?"],
    },
    "Business Analyst": {
      technical: ["What is the difference between functional and non-functional requirements?","How do you structure a Business Requirements Document (BRD)?","Walk me through how you would create a use case diagram for an online banking system.","What is gap analysis? How do you use it to identify solution requirements?","What is the difference between waterfall and agile methodologies? When do you use each?","How do you prioritize requirements using the MoSCoW method?","How do you write good user stories with clear acceptance criteria?","What is SWOT analysis? Give an example for a fintech startup.","What techniques do you use to elicit requirements from stakeholders?","Compare process flow diagrams vs data flow diagrams (DFDs).","What is the difference between BPMN and UML diagrams?","How do you calculate and present the ROI of a proposed IT solution to management?"],
      soft: ["Why are you the best fit for a Business Analyst role?","Describe a situation where you bridged a major communication gap between technical and business teams.","Tell me about a time a key requirement changed significantly mid-project. How did you manage the impact?","How do you handle conflicting priorities from multiple stakeholders who each want their needs first?","How do you ensure the product delivered actually solves the problem the business needed to solve?"],
    },
    "System Administrator": {
      technical: ["Explain the Linux boot process from BIOS/UEFI through to the login prompt.","What is the difference between a hard link and a symbolic link in Linux?","How do you schedule automated tasks using cron? Write a cron expression for every Monday at 8 AM.","What is the difference between a process and a daemon in Linux?","How do you monitor system performance in Linux? Name 5 commands and what each measures.","Explain how iptables/nftables works for Linux firewall management.","What is LDAP and how is it used for centralized user authentication?","How do you set up and secure SSH key-based authentication?","Compare RAID 0, 1, 5, and 10 — explain the trade-offs for each.","How would you troubleshoot a Linux server that is running critically low on disk space?","What is NFS? How do you set up and mount a network file share?","How do you set up user accounts, groups, and file permissions securely in Linux?"],
      soft: ["Why are you the best fit for a System Administrator role?","Describe a critical server failure you were responsible for resolving. What was the cause and fix?","How do you ensure maximum uptime and availability for production systems?","Tell me about a time you performed a major system upgrade with minimal or zero downtime.","How do you document your system configurations and runbooks for other team members?"],
    },
    "UI/UX Designer": {
      technical: ["What is the fundamental difference between UI design and UX design?","Describe the user-centered design process and all its phases.","What is the difference between a wireframe, a mockup, and a prototype?","What user research methods do you use and when would you use each?","What is a design system and why is it valuable for a product team?","How do you ensure your designs meet WCAG accessibility guidelines?","Explain the Gestalt principles of design and give examples of each.","What is the difference between responsive design and adaptive design?","How do you measure the success of a UX redesign? What metrics do you track?","How do you set up and interpret an A/B test for a UX change?","How do you handle stakeholder feedback that conflicts with your user research findings?","Compare Figma vs Adobe XD vs Sketch — what are the trade-offs?"],
      soft: ["Why are you the best fit for a UI/UX Designer role?","Describe a design project where you completely rethought your initial approach based on user feedback.","How do you advocate for the user when business requirements conflict with good UX?","Tell me about a time your design directly improved a key product metric.","How do you collaborate with developers to ensure your design is implemented with pixel-perfect accuracy?"],
    },
    "Product Manager": {
      technical: ["What is the difference between a product roadmap and a sprint backlog?","How do you prioritize features using the RICE or ICE scoring framework?","What does a good Product Requirements Document (PRD) contain?","How do you define and measure KPIs for a new product feature?","What is a Minimum Viable Product (MVP)? How do you decide what goes into it?","How do you conduct a competitive analysis for a new product entering the market?","What is a North Star metric and how do you identify the right one for a product?","How do you use quantitative and qualitative data together to make product decisions?","What is the difference between product discovery and product delivery?","How do you run an effective sprint planning session with an engineering team?","How do you prioritize addressing technical debt vs shipping new features?","What is a go-to-market (GTM) strategy and what does it typically include?"],
      soft: ["Why are you the best fit for a Product Manager role?","Describe a product decision you made that turned out to be wrong. What did you learn from it?","How do you say no to a feature request from a C-level executive while keeping them satisfied?","Tell me about a time you had to align multiple teams with conflicting priorities and timelines.","How do you build deep empathy with users when you cannot directly interact with them regularly?"],
    },
  };

  const roleEmojis: Record<string, string> = {
    "Software Engineer": "💻", "Frontend Developer": "🎨", "Backend Developer": "⚙️",
    "Full Stack Developer": "🔗", "Data Analyst": "📊", "Machine Learning Engineer": "🤖",
    "DevOps Engineer": "🚀", "Cloud Engineer": "☁️", "Android Developer": "📱",
    "Java Developer": "☕", "Python Developer": "🐍", "QA / Test Engineer": "🧪",
    "Database Administrator": "🗄️", "Cybersecurity Analyst": "🔐", "Network Engineer": "🌐",
    "Embedded Systems Engineer": "🔌", "Business Analyst": "📋", "System Administrator": "🖥️",
    "UI/UX Designer": "✏️", "Product Manager": "📌",
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
        <PageTitle eyebrow="Interview coach" title="Choose a role to start practicing." copy="20 popular placement roles — each with 12 technical questions and 5 soft skill questions. AI evaluates your answers instantly." />
        <div className="role-card-grid">
          {Object.keys(questionBank).map((role) => (
            <button key={role} type="button" className="role-card-btn" onClick={() => { setSelectedRole(role); setSelectedQuestion(null); setEvaluations({}); setAnswers({}); setActiveTab("technical"); }}>
              <span className="role-card-emoji">{roleEmojis[role] ?? "🎯"}</span>
              <span className="role-card-name">{role}</span>
              <span className="role-card-meta">{questionBank[role].technical.length} technical · 5 soft skills</span>
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
          ← All Roles
        </button>
        <PageTitle eyebrow={`Interview coach · ${selectedRole}`} title={`${roleEmojis[selectedRole] ?? "🎯"} ${selectedRole} Interview Prep`} copy={`${questionBank[selectedRole].technical.length} technical questions + 5 soft skill questions. Click any question to practice and get AI feedback.`} />
      </div>
      <div className="interview-tab-row">
        <button type="button" className={activeTab === "technical" ? "interview-tab active" : "interview-tab"} onClick={() => { setActiveTab("technical"); setSelectedQuestion(null); }}>
          🔧 Technical ({questionBank[selectedRole].technical.length})
        </button>
        <button type="button" className={activeTab === "soft" ? "interview-tab active" : "interview-tab"} onClick={() => { setActiveTab("soft"); setSelectedQuestion(null); }}>
          💬 Soft Skills (5)
        </button>
      </div>
      <div className="insight-list">
        {currentQuestions.map((question, index) => {
          const isSelected = selectedQuestion === question;
          const evaluation = evaluations[question];
          const isSubmitting = submitting[question] || false;
          return (
            <div className={`card insight insight-row-clickable ${isSelected ? "selected-question" : ""}`} key={question} onClick={() => setSelectedQuestion(isSelected ? null : question)}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: activeTab === "soft" ? "#f59e0b" : "#8c6cff", minWidth: "28px" }}>{String(index + 1).padStart(2, "0")}</span>
              <div style={{ width: "100%" }}>
                <strong style={{ fontSize: "14px", lineHeight: "1.5" }}>{question}</strong>
                <p style={{ fontSize: "12px", marginTop: "2px" }}>{activeTab === "soft" ? "💬 Soft skill / behavioral" : "🔧 Technical"} · Click to practice</p>
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
                          <span style={{ color: evaluation.score >= 7 ? "#22c55e" : evaluation.score >= 5 ? "#f59e0b" : "#ef4444" }}>Score: {evaluation.score}/10</span>
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
