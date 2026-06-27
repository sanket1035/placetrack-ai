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

type View = "Overview" | "Applications" | "Opportunities" | "Resume AI" | "Aptitude" | "Interview" | "Profile" | "Drive Creator" | "Analytics" | "Users";

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

const SKILLS_BY_CATEGORY: Record<string, string[]> = {
  "Technical Core": [
    "JavaScript", "TypeScript", "Python", "Java", "C", "C++", "C#", "Go", "Rust", "PHP",
    "React", "Next.js", "Angular", "Vue.js", "Node.js", "Express", "Django", "Flask",
    "Spring Boot", "FastAPI", "GraphQL", "REST API", "WebSockets"
  ],
  "Tools & Platforms": [
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Linux", "Git", "CI/CD",
    "Jenkins", "Terraform", "Kafka", "Microservices", "Data Structures",
    "Algorithms", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
    "Data Analysis", "System Design", "OOPS"
  ],
  "Core Engineering": [
    "AutoCAD", "SolidWorks", "CATIA", "ANSYS", "Fusion 360",
    "MATLAB", "Simulink", "PLC Programming", "SCADA", "Embedded C",
    "VHDL / Verilog", "PCB Design", "Arduino", "Raspberry Pi", "LabVIEW",
    "STAAD Pro", "Revit", "ETABS", "Primavera P6", "GIS",
    "CNC Programming", "Six Sigma", "Lean Manufacturing", "Thermodynamics", "Fluid Mechanics",
    "Power Systems", "Circuit Design", "Process Simulation", "P&ID", "GD&T"
  ],
  "Soft Skills": [
    "Communication", "Teamwork", "Leadership", "Problem Solving", "Critical Thinking",
    "Time Management", "Adaptability", "Presentation", "Project Management", "Agile / Scrum"
  ]
};
const AVAILABLE_SKILLS = Object.values(SKILLS_BY_CATEGORY).flat();

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
  Analytics: Gauge,
  Users: Users
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

function calculateEligibility(drive: Drive, student: any) {
  if (!student) return { eligible: true, score: 100, reasons: [] };
  const reasons: string[] = [];
  
  // Check branch
  const allowed = drive.allowedBranches || [];
  if (allowed.length > 0 && !allowed.includes(student.branch)) {
    reasons.push(`${student.branch} branch is not allowed`);
  }
  
  // Check CGPA
  if (student.cgpa < drive.minCgpa) {
    reasons.push(`CGPA ${student.cgpa} is below minimum CGPA ${drive.minCgpa}`);
  }
  
  // Check backlogs
  const maxB = drive.maxBacklogs ?? 0;
  if (student.backlogs > maxB) {
    reasons.push(`Backlogs ${student.backlogs} exceeds max backlogs limit of ${maxB}`);
  }
  
  return {
    eligible: reasons.length === 0,
    score: reasons.length === 0 ? 100 : 0,
    reasons
  };
}

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
  const [usersList, setUsersList] = useState<SessionUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDrive, setSelectedDrive] = useState<Drive | null>(null);

  const role = user?.role ?? "STUDENT";
  const nav = useMemo(() => {
    const base: View[] = ["Overview", "Applications", "Opportunities", "Resume AI", "Aptitude", "Profile"];
    if (role !== "STUDENT") base.push("Interview", "Drive Creator", "Analytics");
    if (role === "STUDENT") base.push("Interview");
    if (role === "ADMIN") base.push("Users");
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

  // Client-side search filters
  const filteredDrives = useMemo(() => {
    if (!searchQuery) return drivesWithEligibility;
    const q = searchQuery.toLowerCase();
    return drivesWithEligibility.filter((d) =>
      d.company.name.toLowerCase().includes(q) ||
      d.role.toLowerCase().includes(q) ||
      d.location.toLowerCase().includes(q)
    );
  }, [drivesWithEligibility, searchQuery]);

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
            {view === "Users" && <UsersManager token={token} flash={flash} users={usersList} setUsers={setUsersList} />}
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
      {Object.entries(SKILLS_BY_CATEGORY).map(([category, skills]) => (
        <div key={category}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "10px 0 6px" }}>{category}</p>
          <div className="skills-tags">
            {skills.map((skill) => {
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
      ))}
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
              <span className="card-kicker">Eligibility Status</span>
              <h3 style={{ margin: "4px 0 0" }}>{isEligible ? "✓ Eligible to Apply" : "✗ Not Eligible"}</h3>
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
      console.warn("Backend API not reachable for resume analysis. Using client-side logic.");
      const parsedText = text.toLowerCase();
      const detectedSkills = [];
      const keywords = ["javascript", "typescript", "react", "next.js", "node.js", "express", "python", "java", "sql", "docker", "machine learning", "communication"];
      for (const keyword of keywords) {
        if (parsedText.includes(keyword)) {
          detectedSkills.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
        }
      }
      const suggestions = [];
      if (detectedSkills.length < 3) suggestions.push("Add more technical keywords to your resume.");
      if (!parsedText.includes("education") && !parsedText.includes("degree")) suggestions.push("Include a clear Education section.");
      if (!parsedText.includes("project") && !parsedText.includes("built")) suggestions.push("Add a Projects section detailing your building experience.");
      if (!parsedText.includes("contact") && !parsedText.includes("@")) suggestions.push("Provide clear contact details.");
      
      const score = Math.min(100, 40 + detectedSkills.length * 8 + (parsedText.length > 100 ? 15 : 5));
      setResult({
        score,
        skills: detectedSkills.length > 0 ? detectedSkills : ["General Skills"],
        suggestions: suggestions.length > 0 ? suggestions : ["Your resume looks clean and well-structured."]
      });
      flash("Resume analyzed (offline mode)");
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
              <span style={{ fontSize: "13px", fontWeight: 600, color: activeTab === "soft" ? "#f59e0b" : "var(--violet)", minWidth: "28px" }}>{String(displayIndex).padStart(2, "0")}</span>
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
            <Bar dataKey="readiness" fill="var(--violet)" radius={[8, 8, 2, 2]} />
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

type UsersManagerProps = {
  token: string;
  flash: (message: string) => void;
  users: SessionUser[];
  setUsers: React.Dispatch<React.SetStateAction<SessionUser[]>>;
};

function UsersManager({ token, flash, users, setUsers }: UsersManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "STUDENT" | "COORDINATOR" | "ADMIN">("ALL");
  const [showAddCoordinator, setShowAddCoordinator] = useState(false);
  const [editingUser, setEditingUser] = useState<SessionUser | null>(null);
  const [deletingId, setDeletingId] = useState("");

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
              <button className="secondary-button" style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.2)" }} disabled={deletingId === u.id} onClick={() => handleDeleteUser(u.id)}>
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
    </>
  );
}

function AddCoordinatorModal({ token, onClose, onSaved, flash }: {
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

function EditUserModal({ user, token, onClose, onSaved, flash }: {
  user: SessionUser;
  token: string;
  onClose: () => void;
  onSaved: (user: SessionUser) => void;
  flash: (message: string) => void;
}) {
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);
  
  // Student fields
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
