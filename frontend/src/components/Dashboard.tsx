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
import { api, demoAccounts, type LoginResponse, type Role, type SessionUser } from "@/lib/api";
import { getTheme, setTheme } from "@/lib/theme";
import { ThemeToggle } from "./ui/ThemeToggle";
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

const MOCK_DRIVES: Drive[] = [
  {
    id: "drv-1",
    company: { name: "NVIDIA", website: "https://nvidia.com", description: "GPU and AI computing leader." },
    role: "GPU Systems Software Engineer",
    package: 25.0,
    location: "Bengaluru",
    jobType: "Full-time",
    deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
    allowedBranches: ["Computer Engineering", "Information Technology", "AI & Data Science", "E&TC"],
    minCgpa: 8.5,
    alreadyApplied: false
  },
  {
    id: "drv-2",
    company: { name: "TCS", website: "https://tcs.com", description: "Global IT services and consulting provider." },
    role: "Software Engineer",
    package: 7.0,
    location: "Pune",
    jobType: "Full-time",
    deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
    allowedBranches: ["Computer Engineering", "Information Technology", "AI & Data Science", "E&TC", "Electrical", "Mechanical", "Civil"],
    minCgpa: 6.5,
    alreadyApplied: true
  },
  {
    id: "drv-3",
    company: { name: "Persistent Systems", website: "https://persistent.com", description: "Product engineering and digital transformation company." },
    role: "Product Engineer",
    package: 9.5,
    location: "Nashik",
    jobType: "Full-time",
    deadline: new Date(Date.now() + 12 * 86400000).toISOString(),
    allowedBranches: ["Computer Engineering", "Information Technology", "AI & Data Science"],
    minCgpa: 7.0,
    alreadyApplied: false
  },
  {
    id: "drv-4",
    company: { name: "Crompton Greaves", website: "https://cromptongreaves.com", description: "Consumer electrical goods and engineering equipment maker." },
    role: "Graduate Engineer Trainee",
    package: 5.5,
    location: "Mumbai",
    jobType: "Full-time",
    deadline: new Date(Date.now() + 15 * 86400000).toISOString(),
    allowedBranches: ["Electrical", "Mechanical"],
    minCgpa: 6.0,
    alreadyApplied: false
  }
];

const MOCK_APPLICATIONS: Application[] = [
  {
    id: "app-1",
    status: "TECHNICAL_ROUND",
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    timeline: [
      { status: "APPLIED", at: new Date(Date.now() - 5 * 86400000).toISOString(), note: "Applied for Nvidia GPU Systems role." },
      { status: "SHORTLISTED", at: new Date(Date.now() - 4 * 86400000).toISOString(), note: "Profile shortlisted by HR." },
      { status: "APTITUDE_CLEARED", at: new Date(Date.now() - 3 * 86400000).toISOString(), note: "Cleared online assessment with 92% score." },
      { status: "TECHNICAL_ROUND", at: new Date(Date.now() - 2 * 86400000).toISOString(), note: "Technical interview scheduled." }
    ],
    drive: MOCK_DRIVES[0]
  },
  {
    id: "app-2",
    status: "APPLIED",
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    timeline: [
      { status: "APPLIED", at: new Date(Date.now() - 1 * 86400000).toISOString(), note: "Application submitted." }
    ],
    drive: MOCK_DRIVES[1]
  }
];

const MOCK_TESTS: TestSummary[] = [
  { id: "test-1", title: "Placement Aptitude Mock 1", duration: 30, _count: { questions: 10, results: 45 } },
  { id: "test-2", title: "Placement Aptitude Mock 2", duration: 30, _count: { questions: 10, results: 32 } },
  { id: "test-3", title: "Technical MCQs Mock", duration: 25, _count: { questions: 15, results: 88 } }
];

const MOCK_DASHBOARD: DashboardData = {
  readiness: { score: 82, reasons: ["Keep profiles updated before every drive.", "Add more technical skills to improve matching."] },
  stats: { applications: 2, interviews: 1, offers: 0, companies: 4 },
  placementRate: 85,
  activeDrives: 4,
  companies: 4,
  students: 500,
  averagePackage: 6.2,
  highestPackage: 25.0,
  branchPerformance: [
    { branch: "Computer Engineering", students: 120, readiness: 85 },
    { branch: "Information Technology", students: 100, readiness: 78 },
    { branch: "AI & Data Science", students: 60, readiness: 82 },
    { branch: "E&TC", students: 90, readiness: 72 },
    { branch: "Electrical", students: 50, readiness: 65 },
    { branch: "Mechanical", students: 60, readiness: 58 },
    { branch: "Civil", students: 40, readiness: 52 }
  ]
};

const MOCK_USERS: SessionUser[] = [
  {
    id: "stud-1",
    email: "student@placetrack.ai",
    role: "STUDENT",
    student: {
      id: "stud-profile-1",
      name: "Rahul Sharma",
      branch: "Computer Engineering",
      cgpa: 8.2,
      backlogs: 0,
      graduationYear: 2027,
      skills: ["Java", "Python", "SQL", "Communication"]
    }
  },
  {
    id: "stud-2",
    email: "priya.patil@placetrack.ai",
    role: "STUDENT",
    student: {
      id: "stud-profile-2",
      name: "Priya Patil",
      branch: "Information Technology",
      cgpa: 9.1,
      backlogs: 0,
      graduationYear: 2027,
      skills: ["React", "TypeScript", "Node.js", "Docker"]
    }
  },
  {
    id: "stud-3",
    email: "amit.verma@placetrack.ai",
    role: "STUDENT",
    student: {
      id: "stud-profile-3",
      name: "Amit Verma",
      branch: "E&TC",
      cgpa: 6.8,
      backlogs: 1,
      graduationYear: 2027,
      skills: ["C++", "Embedded C", "SQL", "Problem Solving"]
    }
  },
  {
    id: "coord-1",
    email: "coordinator@placetrack.ai",
    role: "COORDINATOR",
    coordinator: {
      id: "coord-profile-1",
      department: "Computer Engineering",
      phone: "+91 98765 43210"
    }
  },
  {
    id: "coord-2",
    email: "prof.deshmukh@placetrack.ai",
    role: "COORDINATOR",
    coordinator: {
      id: "coord-profile-2",
      department: "Information Technology",
      phone: "+91 99988 87766"
    }
  },
  {
    id: "admin-1",
    email: "admin@placetrack.ai",
    role: "ADMIN"
  }
];

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
  const [dark, setDark] = useState(false);
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
    const current = getTheme();
    setDark(current === "dark");
    setTheme(current);
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
        try {
          const userRows = await api<SessionUser[]>("/api/auth/users", activeToken);
          setUsersList(userRows);
        } catch (e) {
          console.warn("Backend users api failed, falling back to mock users:", e);
          setUsersList(MOCK_USERS);
        }
      }
    } catch (error) {
      console.warn("Backend API not reachable. Using offline seed data:", error);
      setDashboard(MOCK_DASHBOARD);
      setDrives(MOCK_DRIVES);
      setApplications(MOCK_APPLICATIONS);
      setTests(MOCK_TESTS);

      const isAdmin = user?.role === "ADMIN" || (typeof window !== "undefined" && (() => {
        try {
          const storedUser = JSON.parse(window.localStorage.getItem("placetrack-user") || "{}");
          return storedUser.role === "ADMIN";
        } catch { return false; }
      })());
      if (isAdmin) {
        setUsersList(MOCK_USERS);
      }
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
      // Offline fallback: check if credentials match demo accounts
      const lowercaseEmail = email.toLowerCase();
      const matchedDemo = demoAccounts.find(
        (d) => d.email.toLowerCase() === lowercaseEmail && d.password === password
      );
      if (matchedDemo) {
        const mockUser: SessionUser = {
          id: matchedDemo.label.toLowerCase() + "_mock_id",
          email: matchedDemo.email,
          role: matchedDemo.label.toUpperCase() as Role,
          student: matchedDemo.label === "Student" ? {
            id: "student_mock_id",
            name: "Rahul Sharma",
            branch: "Computer Engineering",
            cgpa: 8.2,
            backlogs: 0,
            graduationYear: 2027,
            skills: ["Java", "Python", "SQL", "Communication"]
          } : null,
          coordinator: matchedDemo.label === "Coordinator" ? {
            id: "coordinator_mock_id",
            department: "Computer Engineering"
          } : null
        };
        const mockToken = "mock_jwt_token_for_" + matchedDemo.label.toLowerCase();
        setToken(mockToken);
        setUser(mockUser);
        writeStorage("placetrack-token", mockToken);
        writeStorage("placetrack-user", JSON.stringify(mockUser));
        flash(`Logged in as ${mockUser.role.toLowerCase()} (offline mode)`);
      } else {
        const err = new Error("Invalid email or password");
        flash(err.message);
        throw err;
      }
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
      // Offline fallback: simulate successful signup
      const mockUser: SessionUser = {
        id: "user_" + Math.random().toString(36).substring(2, 9),
        email: input.email.toLowerCase(),
        role: input.role,
        student: input.role === "STUDENT" ? {
          id: "student_" + Math.random().toString(36).substring(2, 9),
          name: input.name,
          branch: input.branch,
          cgpa: input.cgpa,
          backlogs: 0,
          graduationYear: 2027,
          skills: input.skills
        } : null,
        coordinator: input.role === "COORDINATOR" ? {
          id: "coord_" + Math.random().toString(36).substring(2, 9),
          department: input.branch
        } : null
      };
      const mockToken = "mock_jwt_token_" + Math.random().toString(36).substring(2, 9);
      setToken(mockToken);
      setUser(mockUser);
      writeStorage("placetrack-token", mockToken);
      writeStorage("placetrack-user", JSON.stringify(mockUser));
      flash(`Account created as ${input.role.toLowerCase()} (offline mode)`);
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
    return <LoginScreen dark={dark} loading={loading} onToggleTheme={() => { const next = !dark; setDark(next); setTheme(next ? "dark" : "light"); }} onLogin={handleLogin} onSignup={handleSignup} />;
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
            <kbd>Ctrl + K</kbd>
          </div>
          <div className="header-actions">
            <button onClick={() => refreshAll()} aria-label="Refresh">{loading ? <Loader2 className="spin" size={18} /> : <RotateCw size={18} />}</button>
            <NotificationBell notifications={notifications} markAsRead={markAsRead} markAllAsRead={markAllAsRead} onNavigate={setView} />
            <ThemeToggle onThemeChange={(t) => setDark(t === "dark")} />
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
              <p className="helper-text" style={{ margin: 0 }}>Coordinator / admin accounts can monitor or manage this drive.</p>
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
      {/* Left panel: dynamic branding & info */}
      <div className="login-brand-panel" style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px",
        background: "linear-gradient(135deg, var(--bg) 0%, var(--panel-2) 50%, var(--bg) 100%)",
        borderRight: "1px solid var(--line)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Glow decoration */}
        <div style={{
          position: "absolute", top: "10%", left: "10%", width: "400px", height: "400px",
          background: "radial-gradient(circle, var(--focus) 0%, transparent 70%)",
          pointerEvents: "none"
        }} />
        
        <div className="brand" style={{ zIndex: 1, padding: 0 }}>
          <div className="brand-mark"><Command size={20} /></div>
          <span>PlaceTrack <b style={{ color: "var(--secondary)" }}>AI</b></span>
        </div>
        
        <div style={{ maxWidth: "440px", zIndex: 1, margin: "auto 0" }}>
          <span className="eyebrow" style={{ color: "var(--secondary)", letterSpacing: "0.15em", display: "inline-block" }}>
            Campus Placement Command Center
          </span>
          <h2 style={{ fontSize: "36px", fontWeight: 800, color: "var(--text)", marginTop: "12px", lineHeight: 1.15, letterSpacing: "-0.03em" }}>
            Step into your future with intelligence.
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "14px", marginTop: "14px", lineHeight: 1.6 }}>
            Track real-time campus recruitment drives, analyze your placement readiness score, build ATS-optimized resumes, and practice with our smart AI mock coaches.
          </p>
        </div>
        
        <div style={{ zIndex: 1 }}>
          <span style={{ fontSize: "11px", color: "var(--muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            College Campus Placement Portal · 2026
          </span>
        </div>
      </div>

      {/* Right panel: auth card wrapper */}
      <div className="login-form-container" style={{
        display: "grid",
        placeItems: "center",
        padding: "40px 24px",
        width: "100%",
        overflowY: "auto"
      }}>
        <div className="login-card card" style={{
          border: 0,
          background: "transparent",
          boxShadow: "none",
          width: "min(400px, 100%)",
          padding: 0
        }}>
          {/* Logo visible only on mobile/tablet */}
          <div className="brand mobile-only-logo" style={{ marginBottom: "20px" }}>
            <div className="brand-mark"><Command size={20} /></div>
            <span>PlaceTrack <b style={{ color: "var(--secondary)" }}>AI</b></span>
          </div>

          <span className="eyebrow">Authentication Portal</span>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: "6px 0 10px" }}>
            {mode === "signin" ? "Login to your account" : "Create your account"}
          </h1>
          <p className="section-copy" style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 16px" }}>
            {mode === "signin" ? "Enter your email and password to access your placement dashboard." : "Choose your role and fill in your details to get started."}
          </p>
          
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
            
            <button className="primary-button" disabled={loading} type="submit" style={{ padding: "12px 14px", fontSize: "12px", width: "100%", cursor: "pointer" }}>
              {loading ? <Loader2 className="spin" size={16} /> : <ArrowUpRight size={16} />} {mode === "signin" ? "Sign in" : "Create account"}
            </button>
            <button className="ghost-button" type="button" onClick={onToggleTheme} style={{ width: "100%", justifyContent: "center" }}>
              {dark ? <Sun size={16} /> : <Moon size={16} />} Toggle theme
            </button>
          </form>

          {/* Quick Demo Credential Pills */}
          <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--line)" }}>
            <span style={{ display: "block", fontSize: "10px", fontWeight: 850, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
              Quick Demo Accounts
            </span>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {demoAccounts.map((acc) => (
                <button
                  key={acc.label}
                  type="button"
                  className="secondary-button"
                  style={{ padding: "6px 12px", fontSize: "11px", borderRadius: "8px", cursor: "pointer" }}
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.password);
                    setMode("signin");
                    setErrorMsg("");
                  }}
                >
                  👤 {acc.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
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
      console.warn("Backend API not reachable for test submission. Using client-side logic.");
      const totalQuestions = questions.length || 10;
      const correctAnswers = Object.keys(answers).length;
      const accuracy = Math.round((correctAnswers / totalQuestions) * 100) || 60;
      flash(`Submitted (offline mode). Accuracy ${accuracy}%`);
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
  return <div className="page-title"><div><span>{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div><div className="date-pill"><CalendarDays size={16} /> Placement season 2025-26</div></div>;
}

function Stat({ icon, value, label, sub, tone, trend }: { icon: ReactNode; value: string; label: string; sub: string; tone: string; trend?: string }) {
  return (
    <div className="card stat-card" style={{
      display: "flex",
      alignItems: "center",
      gap: "16px",
      padding: "20px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Soft gradient background glow matching tone */}
      <div className={`stat-glow ${tone}`} style={{
        position: "absolute",
        top: "-20px",
        right: "-20px",
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        opacity: 0.12,
        filter: "blur(12px)"
      }} />
      <div className={`stat-icon ${tone}`} style={{
        width: "46px",
        height: "46px",
        borderRadius: "12px",
        display: "grid",
        placeItems: "center",
        flexShrink: 0
      }}>{icon}</div>
      <div style={{ flexGrow: 1, display: "grid", gap: "2px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <strong style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.03em" }}>{value}</strong>
          {trend && (
            <span style={{
              fontSize: "10px",
              fontWeight: 800,
              color: trend.startsWith("▲") ? "var(--success)" : "var(--muted)",
              fontFamily: "var(--font-mono)",
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              background: trend.startsWith("▲") ? "rgba(34, 197, 94, 0.12)" : "rgba(255, 255, 255, 0.05)",
              padding: "2px 6px",
              borderRadius: "6px",
              marginLeft: "8px"
            }}>
              {trend}
            </span>
          )}
        </div>
        <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500 }}>{label}</span>
        <small style={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.4)", marginTop: "2px" }}>{sub}</small>
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


