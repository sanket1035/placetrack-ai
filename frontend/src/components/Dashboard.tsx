"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ElementType, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CircleUserRound, LayoutDashboard, Loader2, LogOut, Menu,
  RotateCw, Search, X, BriefcaseBusiness, Building2, FileScan, BookOpenCheck,
  Sparkles, Gauge, Users, Target, Download, Plus, CheckCircle2, ArrowUpRight,
  Sun, Moon, Upload, Send, CalendarDays, Trophy, Share2, Trash2, ChevronDown, ClipboardList
} from "lucide-react";
import { api, ApiError, ROLE_LABEL, type LoginResponse, type Role, type SessionUser } from "@/lib/api";
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
import { StudentsManager } from "./StudentsView";
import { UsersManager } from "./UsersView";
import { DriveCreator } from "./DriveCreatorView";
import { OffCampusView } from "./OffCampusView";
import { DEPARTMENTS as AVAILABLE_DEPARTMENTS } from "@/lib/departments";


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
  Students: Users,
  Practice: Target,
  "Off-Campus": ClipboardList,
  "Export Center": Download,
};

const NAV_GROUPS: { label: string; items: View[] }[] = [
  { label: "Overview", items: ["Overview"] },
  { label: "Drives", items: ["Applications", "Off-Campus", "Opportunities", "Drive Creator"] },
  { label: "Prepare", items: ["Resume AI", "Aptitude", "Interview", "Practice"] },
  { label: "Insights", items: ["Analytics", "Users", "Students", "Export Center"] },
  { label: "Profile", items: ["Profile"] },
];

const NAV_META: Record<View, { blurb: string; tone: string }> = {
  Overview: { blurb: "Your placement status at a glance.", tone: "mint" },
  Applications: { blurb: "Track every application and its stage.", tone: "mint" },
  Opportunities: { blurb: "Open drives you are eligible for.", tone: "sun" },
  "Drive Creator": { blurb: "Create and publish a placement drive.", tone: "lilac" },
  "Resume AI": { blurb: "Upload a resume and get a real score.", tone: "aqua" },
  Aptitude: { blurb: "Timed mock tests with answer review.", tone: "sun" },
  Interview: { blurb: "Practice answers and get AI feedback.", tone: "lilac" },
  "Off-Campus": { blurb: "Privately track jobs and internships you applied for.", tone: "aqua" },
  Practice: { blurb: "Question bank to sharpen your skills.", tone: "mint" },
  Analytics: { blurb: "Placement numbers by department.", tone: "aqua" },
  Users: { blurb: "Manage students and coordinators.", tone: "lilac" },
  Students: { blurb: "Review and correct student details.", tone: "lilac" },
  "Export Center": { blurb: "Download reports and records.", tone: "sun" },
  Profile: { blurb: "Your details and account.", tone: "mint" },
};

/** Top-left brand: KKWagh society logo beside the PlaceTrack wordmark. */
function BrandLogo() {
  return (
    <div className="brand brand-logo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/kkw-society.png" alt="Karmaveer Kakasaheb Wagh Education Society" className="brand-society" width={68} height={40} />
      <span className="brand-divider" aria-hidden="true" />
      <span className="brand-word">Place<mark>Track</mark></span>
    </div>
  );
}

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
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const [view, setView] = useState<View>("Overview");
  const [notice, setNotice] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  // True until we know whether a saved session exists, so a refresh never flashes the sign-in screen.
  const [restoring, setRestoring] = useState(true);
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
    if (role === "STUDENT") base.push("Interview", "Practice", "Off-Campus");
    if (role === "ADMIN") base.push("Users");
    if (role === "TPC") base.push("Students");
    base.push("Export Center");
    return base;
  }, [role]);

  useEffect(() => {
    const savedToken = readStorage("placetrack-token");
    if (!savedToken) {
      setRestoring(false);
      return;
    }
    // Show the saved session immediately; the server check below only corrects it or signs out on 401.
    let storedUser: SessionUser | null = null;
    try {
      storedUser = JSON.parse(readStorage("placetrack-user") || "null");
    } catch {
      storedUser = null;
    }
    if (storedUser && storedUser.role) {
      setToken(savedToken);
      setUser(storedUser);
      setRestoring(false);
    }
    api<SessionUser>("/api/auth/me", savedToken)
      .then((freshUser) => {
        setToken(savedToken);
        setUser(freshUser);
        writeStorage("placetrack-user", JSON.stringify(freshUser));
      })
      .catch((error) => {
        // Only an explicit 401 ends the session (handled by the unauthorized listener). A slow or sleeping server must not log the user out.
        if (error instanceof ApiError && error.status === 401) {
          removeStorage("placetrack-token");
          removeStorage("placetrack-user");
        }
      })
      .finally(() => setRestoring(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    refreshAll(token).catch((error) => flash(error.message));
  }, [token]);

  // The server rejects expired tokens and deleted accounts with 401; return to the sign-in screen.
  useEffect(() => {
    const onUnauthorized = () => {
      removeStorage("placetrack-token");
      removeStorage("placetrack-user");
      setToken(null);
      setUser(null);
      setDashboard(null);
      flash("Your session has ended. Please sign in again.");
    };
    window.addEventListener("placetrack:unauthorized", onUnauthorized);
    return () => window.removeEventListener("placetrack:unauthorized", onUnauthorized);
  }, []);

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

  useEffect(() => {
    if (!openGroup) return;
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) { if (event.key === "Escape") setOpenGroup(null); return; }
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpenGroup(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", close); };
  }, [openGroup]);

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

  if (restoring && (!user || !token)) {
    return (
      <main className="app light login-app" aria-busy="true">
        <div className="auth-shell"><section className="auth-card"><p className="auth-sub"><Loader2 className="spin" size={16} /> Opening your workspace...</p></section></div>
      </main>
    );
  }

  if (!user || !token) {
    return <LoginScreen loading={loading} onGoogleCredential={handleGoogleCredential} />;
  }

  const name = user.student?.name ?? user.name ?? user.coordinator?.department ?? (role === "ADMIN" ? "Admin Console" : user.email);

  if (role === "STUDENT" && user.student && !user.student.onboarded) {
    return (
      <main className="app light">
        <AnimatePresence>{notice && <motion.div className="toast" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }}>{notice}</motion.div>}</AnimatePresence>
        <section className="workspace" style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px 60px" }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <BrandLogo />
            <button className="secondary-button" onClick={logout}><LogOut size={16} /> Logout</button>
          </header>
          <PageTitle eyebrow="Welcome" title="Complete your profile to continue." copy="Choose your department and enter your CGPA and graduation year. You can change these later only through your Training & Placement Coordinator." />
          <ProfileEditor user={user} token={token} onSaved={async () => { await refreshMe(); await refreshAll(); flash("Profile saved. Welcome aboard!"); }} flash={flash} dashboard={dashboard} />
        </section>
      </main>
    );
  }

  const navGroups = NAV_GROUPS
    .map((group) => ({ ...group, items: group.items.filter((item) => nav.includes(item)) }))
    .filter((group) => group.items.length > 0);
  const go = (item: View) => { setView(item); setMenuOpen(false); setOpenGroup(null); };

  return (
    <main className="app light">
      <AnimatePresence>{notice && <motion.div className="toast" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }}>{notice}</motion.div>}</AnimatePresence>
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <button className="mobile-close" onClick={() => setMenuOpen(false)}><X /></button>
        <BrandLogo />
        <div className="profile-card">
          <div className="avatar">{initials(name)}</div>
          <div><strong>{name}</strong><span>{role} {user.student ? `· ${user.student.branch}` : ""}</span></div>
        </div>
        <nav ref={navRef}>
          <p className="nav-label">Workspace</p>
          {navGroups.map((group) => {
            if (group.items.length === 1) {
              const item = group.items[0];
              const Icon = navIcons[item];
              return <button type="button" data-view={item} className={view === item ? "active" : ""} onClick={() => go(item)} key={group.label}><Icon size={18} /><span>{item}</span></button>;
            }
            const active = group.items.includes(view);
            const open = openGroup === group.label;
            return (
              <div className="nav-group" key={group.label} onMouseEnter={() => setOpenGroup(group.label)} onMouseLeave={() => setOpenGroup((current) => (current === group.label ? null : current))}>
                <button type="button" className={`nav-group-trigger ${active ? "active" : ""}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpenGroup(open ? null : group.label)}>
                  <span>{group.label}</span><ChevronDown size={14} className={open ? "flip" : ""} />
                </button>
                <div className={open ? "nav-panel open" : "nav-panel"} role="menu">
                  {group.items.map((item) => {
                    const Icon = navIcons[item];
                    return (
                      <button type="button" role="menuitem" data-view={item} className={`nav-card ${view === item ? "active" : ""}`} onClick={() => go(item)} key={item}>
                        <span className={`nav-card-icon tone-${NAV_META[item].tone}`}><Icon size={18} /></span>
                        <span className="nav-card-text"><strong>{item}</strong><small>{NAV_META[item].blurb}</small></span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
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
            <span className="role-badge" title={user.email}>{ROLE_LABEL[role]}{user.coordinator?.department ? ` · ${user.coordinator.department}` : ""}</span>
            <button className="user-button" onClick={() => setProfileOpen(true)} aria-label="Open profile"><CircleUserRound size={22} /></button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div className="content" key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .22 }}>
            {!dashboard && loading && (
              <section className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 24 }} role="status" aria-live="polite">
                <Loader2 className="spin" size={20} />
                <div><strong>Loading your workspace...</strong><p className="helper-text" style={{ margin: 0 }}>The server may need a few seconds to wake up after a quiet period.</p></div>
              </section>
            )}
            <div hidden={!dashboard && loading}>
            {view === "Overview" && <Overview role={role} name={name} dashboard={dashboard} applications={filteredApplications} drives={filteredDrives} onNavigate={setView} loading={loading} />}
            {view === "Applications" && <Applications role={role} token={token} applications={filteredApplications} onRefresh={() => refreshAll()} flash={flash} loading={loading} />}
            {view === "Opportunities" && <Opportunities role={role} token={token} drives={filteredDrives} onRefresh={() => refreshAll()} onNavigate={setView} flash={flash} onViewDrive={setSelectedDrive} loading={loading} filterConditions={filterConditions} setFilterConditions={setFilterConditions} allDrives={drivesWithEligibility} />}
            {view === "Resume AI" && <ResumeAI token={token} flash={flash} />}
            {view === "Aptitude" && <Aptitude token={token} role={role} tests={filteredTests} flash={flash} onChanged={() => refreshAll()} />}
            {view === "Interview" && <InterviewCoach token={token} flash={flash} />}
            {view === "Profile" && <ProfilePage user={user} token={token} onSaved={async () => { await refreshMe(); await refreshAll(); flash("Profile updated"); }} flash={flash} dashboard={dashboard} />}
            {view === "Drive Creator" && <DriveCreator token={token} flash={flash} onCreated={() => refreshAll()} drives={drives} />}
            {view === "Analytics" && <Analytics token={token} dashboard={dashboard} />}
            {view === "Users" && <UsersManager token={token} flash={flash} users={usersList} setUsers={setUsersList} />}
            {view === "Off-Campus" && role === "STUDENT" && <OffCampusView token={token} flash={flash} />}
            {view === "Practice" && <PracticeView token={token} flash={flash} />}
            {view === "Students" && <StudentsManager token={token} department={user.coordinator?.department ?? null} flash={flash} />}
            {view === "Export Center" && <ExportCenter token={token} role={role} flash={flash} />}
            </div>
          </motion.div>
        </AnimatePresence>
      </section>
      {profileOpen && <ProfileModal user={user} token={token} onClose={() => setProfileOpen(false)} onSaved={async () => { await refreshMe(); await refreshAll(); flash("Profile updated"); }} flash={flash} />}
      {selectedDrive && <DriveDetailsModal drive={selectedDrive} role={role} token={token} onClose={() => setSelectedDrive(null)} onApplied={() => { refreshAll(); setSelectedDrive(null); }} flash={flash} />}
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}
    </main>
  );
}

/** Only http(s) links are ever rendered as a clickable address. */
function safeApplyUrl(value?: string | null) {
  return value && /^https?:\/\//i.test(value) ? value : null;
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
      flash("Marked as applied. Your coordinator can now track it.");
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
            <p>{new Date(drive.deadline).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
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
            <>
              <p className="helper-text" style={{ margin: 0 }}>
                PlaceTrack only tracks applications. Apply through the college form first, then confirm below.
              </p>
              {safeApplyUrl(drive.applyUrl) ? (
                <a className="primary-button" href={safeApplyUrl(drive.applyUrl)!} target="_blank" rel="noopener noreferrer" style={{ width: "100%", padding: "12px", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                  <ArrowUpRight size={16} /> Open application form
                </a>
              ) : (
                <p className="suggestion" style={{ margin: 0 }}>No form link was added for this drive. Use the link in the placement cell's mail.</p>
              )}
              <button
                className="secondary-button"
                disabled={!isEligible || applying}
                onClick={apply}
                style={{ width: "100%", padding: "12px" }}
              >
                {applying ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} I have applied
              </button>
            </>
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
  // Core academic details are entered once during onboarding and then locked (a TPC can change them).
  const locked = user.role === "STUDENT" && Boolean(student?.onboarded);
  const lockedStyle = locked ? { opacity: 0.6, cursor: "not-allowed" } : undefined;
  const [form, setForm] = useState({
    name: student?.name ?? user.name ?? "",
    branch: student && student.branch !== "Undeclared" ? student.branch : "",
    cgpa: student && student.cgpa > 0 ? String(student.cgpa) : "",
    graduationYear: String(student?.graduationYear ?? new Date().getFullYear() + 1),
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
            <label style={{ flexDirection: "row", alignItems: "center", gap: "10px", gridColumn: "1 / -1", cursor: "pointer", textTransform: "none", letterSpacing: "normal", fontSize: "13px", color: "var(--text)", fontWeight: 500 }}>
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
      <PageTitle
        eyebrow="Profile"
        title={user.role === "STUDENT" ? "Keep your placement profile updated." : "Your account."}
        copy={user.role === "STUDENT" ? "CGPA, skills, branch, graduation year, and backlogs directly affect eligibility and readiness." : "Your sign-in details and role. Only student accounts have a placement profile."}
      />
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
  // Core academic details are entered once during onboarding and then locked (a TPC can change them).
  const locked = user.role === "STUDENT" && Boolean(student?.onboarded);
  const lockedStyle = locked ? { opacity: 0.6, cursor: "not-allowed" } : undefined;
  const [form, setForm] = useState({
    name: student?.name ?? user.name ?? "",
    branch: student && student.branch !== "Undeclared" ? student.branch : "",
    cgpa: student && student.cgpa > 0 ? String(student.cgpa) : "",
    graduationYear: String(student?.graduationYear ?? new Date().getFullYear() + 1),
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
    (student?.cgpa ?? 0) * 8 + Math.min(selectedSkills.length * 3, 24)
  );

  const save = async () => {
    if (!student) {
      flash("Only student profiles can be edited here");
      return;
    }
    setSaving(true);
    try {
      if (form.linkedinUrl && !/^https?:\/\//i.test(form.linkedinUrl)) {
        flash("LinkedIn URL must start with http:// or https://");
        setSaving(false);
        return;
      }
      const common = {
        skills: selectedSkills,
        phone: form.phone || null,
        linkedinUrl: form.linkedinUrl || null,
        projectsCount: Number(form.projectsCount) || 0,
        internshipsCount: Number(form.internshipsCount) || 0
      };
      if (user.role === "STUDENT" && locked) {
        await api("/api/auth/profile", token, { method: "PATCH", body: JSON.stringify(common) });
      } else {
        const cgpa = Number(form.cgpa);
        if (form.name.trim().length < 2) { flash("Enter your full name."); setSaving(false); return; }
        if (!form.branch) { flash("Select your department."); setSaving(false); return; }
        if (!(cgpa > 0 && cgpa <= 10)) { flash("Enter a CGPA between 0 and 10."); setSaving(false); return; }
        await api("/api/auth/me/student", token, {
          method: "PATCH",
          body: JSON.stringify({
            ...common,
            name: form.name.trim(),
            branch: form.branch,
            cgpa,
            graduationYear: Number(form.graduationYear),
            backlogs: Number(form.backlogs) || 0,
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
    return (
      <section className="card profile-page-card">
        <div className="profile-hero">
          <div className="avatar big">{initials(user.name ?? user.email)}</div>
          <div>
            <span className="card-kicker">{ROLE_LABEL[user.role]}</span>
            <h3>{user.name ?? user.email}</h3>
            <p>{user.email}</p>
            {user.coordinator?.department && <p>Department: {user.coordinator.department}</p>}
          </div>
        </div>
        {user.role === "STUDENT"
          ? <p className="suggestion">Your student profile is missing. Contact your Training &amp; Placement Coordinator.</p>
          : <p className="helper-text">This account manages placements and has no student profile. Use Applications, Drive Creator, Analytics and Export Center for your work.</p>}
      </section>
    );
  }

  return (
    <section className="card profile-page-card">
      <div className="profile-hero">
        <div className="avatar big">{initials(form.name)}</div>
        <div>
          <span className="card-kicker">Student readiness profile</span>
          <h3>{form.name || "Your name"}</h3>
          <p>{user.email} · {ROLE_LABEL[user.role]}</p>
          <p>{form.branch || "Department not set"} · {form.cgpa ? `CGPA ${form.cgpa}` : "CGPA not set"} · {selectedSkills.length} skills</p>
        </div>
      </div>
      {!student.onboarded && <p className="suggestion">Finish your profile: select your department, enter your CGPA and graduation year, then save. These cannot be changed afterwards without your coordinator.</p>}
      {locked && <p className="helper-text">Name, department, CGPA, graduation year and backlogs are locked after onboarding. Ask your Training &amp; Placement Coordinator to correct them.</p>}
      <div className="profile-form">
        <label>Name<input value={form.name} disabled={locked} style={lockedStyle} onChange={(event) => setForm((old) => ({ ...old, name: event.target.value }))} /></label>
        <label>Branch
          <select value={form.branch} disabled={locked} style={lockedStyle} onChange={(event) => setForm((old) => ({ ...old, branch: event.target.value }))}>
            <option value="" disabled>Select your department</option>
            {AVAILABLE_DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
          </select>
        </label>
        <label>CGPA<input value={form.cgpa} disabled={locked} style={lockedStyle} onChange={(event) => setForm((old) => ({ ...old, cgpa: event.target.value }))} /></label>
        <label>Graduation Year<input value={form.graduationYear} disabled={locked} style={lockedStyle} onChange={(event) => setForm((old) => ({ ...old, graduationYear: event.target.value }))} /></label>
        <label>Backlogs<input value={form.backlogs} disabled={locked} style={lockedStyle} onChange={(event) => setForm((old) => ({ ...old, backlogs: event.target.value }))} /></label>
        <label>Phone Number<input value={form.phone} onChange={(event) => setForm((old) => ({ ...old, phone: event.target.value }))} /></label>
        <label>LinkedIn URL<input value={form.linkedinUrl} onChange={(event) => setForm((old) => ({ ...old, linkedinUrl: event.target.value }))} /></label>
        <label>Projects Count<input value={form.projectsCount} type="number" onChange={(event) => setForm((old) => ({ ...old, projectsCount: event.target.value }))} /></label>
        <label>Internships Count<input value={form.internshipsCount} type="number" onChange={(event) => setForm((old) => ({ ...old, internshipsCount: event.target.value }))} /></label>
        <label style={{ flexDirection: "row", alignItems: "center", gap: "10px", gridColumn: "1 / -1", cursor: "pointer", textTransform: "none", letterSpacing: "normal", fontSize: "13px", color: "var(--text)", fontWeight: 500 }}>
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
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) {
      flash("Only PDF, DOCX or TXT resumes are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      flash("The file is larger than 5 MB.");
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
          Drop your PDF, DOCX or TXT resume below. The score is calculated from what is actually written in it: contact details, education, skills, projects, experience and measurable impact.
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
            accept=".pdf,.docx,.txt"
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

type AptitudeQuestion = { id: string; section: string; questionText: string; options: string[] };
type AptitudeReview = { questionId: string; section: string; questionText: string; options: string[]; chosen: number | null; correctAnswer: number; isCorrect: boolean; explanation: string };
type AptitudeResult = {
  score: number; accuracy: number; totalQuestions: number; attempted: number; unanswered: number;
  sectionScores: Record<string, number>; strongAreas: string[]; weakAreas: string[]; review: AptitudeReview[];
};

function Aptitude({ token, role, tests, flash, onChanged }: { token: string; role: Role; tests: TestSummary[]; flash: (message: string) => void; onChanged: () => void }) {
  const [active, setActive] = useState<{ id: string; title: string; duration?: number; questions: AptitudeQuestion[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [section, setSection] = useState("All");
  const [loadingTest, setLoadingTest] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AptitudeResult | null>(null);
  const [seeding, setSeeding] = useState(false);

  const openTest = async (id: string) => {
    setLoadingTest(true);
    setLoadError("");
    setResult(null);
    setSection("All");
    try {
      setActive(await api(`/api/tests/${id}`, token));
      setAnswers({});
    } catch (error) {
      setActive(null);
      setLoadError(error instanceof Error ? error.message : "Could not load the test questions.");
    } finally {
      setLoadingTest(false);
    }
  };

  const submit = async () => {
    if (!active) return;
    const unanswered = active.questions.length - Object.keys(answers).length;
    if (unanswered > 0 && !window.confirm(`${unanswered} question(s) are unanswered and will be marked wrong. Submit anyway?`)) return;
    setSubmitting(true);
    try {
      const data = await api<AptitudeResult>(`/api/tests/${active.id}/submit`, token, { method: "POST", body: JSON.stringify({ answers }) });
      setResult(data);
      onChanged();
      flash(`Submitted. Accuracy ${data.accuracy}%`);
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not submit the test. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const loadStarterBank = async () => {
    setSeeding(true);
    try {
      const data = await api<{ created: string[] }>("/api/tests/starter-bank", token, { method: "POST" });
      flash(data.created.length ? `Loaded ${data.created.length} starter tests.` : "Starter tests are already loaded.");
      onChanged();
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not load the starter question bank.");
    } finally {
      setSeeding(false);
    }
  };

  const questions = active?.questions ?? [];
  const sections = ["All", ...Array.from(new Set(questions.map((question) => question.section)))];
  const visible = section === "All" ? questions : questions.filter((question) => question.section === section);
  const answeredCount = Object.keys(answers).length;
  const reviewById = new Map((result?.review ?? []).map((item) => [item.questionId, item]));

  return (
    <>
      <PageTitle eyebrow="Aptitude tests" title="Practice and submit mock tests." copy={role === "STUDENT" ? "Attempt placement mock tests and review every answer." : "Monitor test inventory and participation."} />
      <div className="split-grid">
        <section className="card list-card">
          {tests.length === 0 && <EmptyState title="No aptitude tests yet" copy={role === "ADMIN" ? "Load the starter bank (2 mock tests, 60 questions) to get started." : "Your Training & Placement Coordinator has not published a test yet."} />}
          {role === "ADMIN" && <button className="primary-button" onClick={loadStarterBank} disabled={seeding}>{seeding ? <Loader2 className="spin" size={16} /> : <BookOpenCheck size={16} />} Load starter question bank</button>}
          {tests.map((test) => <button className="list-row" key={test.id} onClick={() => openTest(test.id)}><BookOpenCheck size={18} /><span><strong>{test.title}</strong><small>{test.duration} min · {test._count?.questions ?? 0} questions · {test._count?.results ?? 0} attempts</small></span></button>)}
        </section>
        <section className="card test-card">
          {loadingTest && <EmptyState title="Loading questions" copy="Please wait." />}
          {!loadingTest && loadError && <EmptyState title="Could not load this test" copy={loadError} />}
          {!loadingTest && !loadError && !active && <EmptyState title="Pick a test" copy="Questions will load here." />}
          {!loadingTest && active && <>
            <h3>{active.title}</h3>
            {questions.length === 0 && <EmptyState title="This test has no questions" copy="Ask your coordinator to add questions." />}
            {questions.length > 0 && !result && <p className="section-copy">{answeredCount} of {questions.length} answered{active.duration ? ` · suggested time ${active.duration} min` : ""}</p>}
            {result && <div className="analysis-panel">
              <div className="analysis-score"><CheckCircle2 /><div><strong>{result.score}/{result.totalQuestions}</strong><span>{result.accuracy}% accuracy · {result.unanswered} unanswered</span></div></div>
              <div className="score-breakdown">
                {Object.entries(result.sectionScores).map(([name, value]) => <div className="score-row" key={name}>
                  <div className="score-row-head"><span>{name}</span><strong>{value}%</strong></div>
                  <div className="score-bar"><i style={{ width: `${value}%` }} /></div>
                </div>)}
              </div>
              {result.strongAreas.length > 0 && <p className="suggestion success">Strong: {result.strongAreas.join(", ")}</p>}
              {result.weakAreas.length > 0 && <p className="suggestion">Needs practice: {result.weakAreas.join(", ")}</p>}
            </div>}
            {questions.length > 0 && <div className="tag-list">{sections.map((name) => <button type="button" key={name} className={name === section ? "interview-tab active" : "interview-tab"} onClick={() => setSection(name)}>{name}</button>)}</div>}
            {visible.map((question) => {
              const index = questions.indexOf(question);
              const review = reviewById.get(question.id);
              return <div className="question-card" key={question.id}>
                <strong>{index + 1}. {question.questionText}</strong>
                {question.options.map((option, optionIndex) => {
                  const mark = review ? (optionIndex === review.correctAnswer ? " ✓" : optionIndex === review.chosen ? " ✗" : "") : "";
                  return <label key={`${question.id}-${optionIndex}`}>
                    <input type="radio" name={question.id} disabled={Boolean(result)} checked={result ? review?.chosen === optionIndex : answers[question.id] === optionIndex} onChange={() => setAnswers((old) => ({ ...old, [question.id]: optionIndex }))} /> {option}{mark}
                  </label>;
                })}
                {review && <p className={review.isCorrect ? "suggestion success" : "suggestion"}>{review.isCorrect ? "Correct. " : review.chosen === null ? "Not answered. " : "Incorrect. "}{review.explanation}</p>}
              </div>;
            })}
            {role === "STUDENT" && questions.length > 0 && !result && <button className="primary-button" onClick={submit} disabled={submitting || answeredCount === 0}>{submitting ? <Loader2 className="spin" size={16} /> : <Send size={16} />} Submit test</button>}
            {result && <button className="ghost-button" onClick={() => openTest(active.id)}>Retake test</button>}
          </>}
        </section>
      </div>
    </>
  );
}

type InterviewEvaluation = {
  score: number;
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  missingConcepts?: string[];
  modelAnswer: string;
  dimensions: Array<{ key: string; label: string; score: number }>;
  source: "ai" | "heuristic";
  verified: boolean;
  note?: string;
};

function InterviewCoach({ token, flash }: { token: string; flash: (message: string) => void }) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"technical" | "soft">("technical");
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Record<string, InterviewEvaluation>>({});
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
    "Artificial Intelligence & Data Science": {
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
    "Electronics & Telecommunication Engineering": {
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
    "Robotics & Automation Engineering": {
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
    "Computer Science & Design": {
      technical: [
        "What is the difference between UX design and UI design? Where do they overlap?",
        "Explain the design thinking process and its five stages with a project example.",
        "What is a design system, and how does it keep a product consistent across teams?",
        "Explain Gestalt principles and how they influence layout decisions.",
        "What are the WCAG accessibility guidelines? Give three ways to make an interface accessible.",
        "How do you run a usability test? How many users are enough and how do you act on the findings?",
        "Explain wireframes, low-fidelity and high-fidelity prototypes, and when each is useful.",
        "What is the difference between responsive and adaptive design?",
        "Explain the CSS Box Model, Flexbox and Grid, and when you would choose Grid.",
        "What is information architecture and how do you validate it (card sorting, tree testing)?",
        "Explain colour theory basics: contrast ratio, colour harmony and use of colour for hierarchy.",
        "What is the difference between a user persona, a user journey map and an empathy map?",
        "How do you decide between a native app, a PWA and a responsive web app for a product?",
        "Explain how HTML, CSS and JavaScript render a page in the browser (critical rendering path).",
        "How would you redesign a checkout flow that has a high drop-off rate? Which metrics would you track?"
      ],
      soft: softSkillsQuestions
    },
    "MBA": {
      technical: [
        "Explain SWOT analysis and Porter's Five Forces with a real company example.",
        "What is the marketing mix (4 Ps), and how would you extend it for a service business?",
        "Explain the difference between market segmentation, targeting and positioning (STP).",
        "What is working capital management and the cash conversion cycle?",
        "Explain NPV and IRR. How do you decide between two projects when they disagree?",
        "What is the difference between a balance sheet, an income statement and a cash flow statement?",
        "Explain supply chain management and just-in-time (JIT) inventory.",
        "What is break-even analysis and how is it calculated?",
        "Explain the BCG matrix and how a company uses it to allocate resources.",
        "What are the main motivation theories (Maslow, Herzberg)? How would you apply one in a team?",
        "What is the difference between recruitment, selection and talent retention? How would you reduce attrition?",
        "Explain customer lifetime value (CLV) and customer acquisition cost (CAC).",
        "What are KPIs you would track for a product launch, and why?",
        "Explain the difference between primary and secondary market research with examples.",
        "How would you estimate the market size for a new food-delivery service in a tier-2 city?"
      ],
      soft: softSkillsQuestions
    },
    "MCA": {
      technical: [
        "Explain database normalization. What are 1NF, 2NF and 3NF?",
        "What is the difference between a stack and a queue? Give real-world uses of each.",
        "Explain the OSI model. What happens at each of the 7 layers?",
        "What is SDLC? Compare Agile and Waterfall, and say when you would choose each.",
        "Explain the four pillars of OOP with an example for each.",
        "What is the difference between a process and a thread? What causes a deadlock?",
        "Explain ACID properties and what a transaction isolation level is.",
        "What is a REST API? How does it differ from GraphQL?",
        "Explain the difference between SQL joins: INNER, LEFT, RIGHT and FULL.",
        "What is cloud computing? Explain IaaS, PaaS and SaaS with examples.",
        "Explain the time complexity of binary search, merge sort and hash table lookup.",
        "What is the difference between a primary key, a foreign key and a unique key?",
        "What is version control? Explain branching and merging in Git.",
        "Explain the difference between authentication and authorization, and how JWT works.",
        "What are design patterns? Explain Singleton and Observer with a use case."
      ],
      soft: softSkillsQuestions
    }
  };

  const submitAnswer = async (questionText: string) => {
    const answer = answers[questionText]?.trim();
    if (!answer) { flash("Please type an answer before submitting."); return; }
    setSubmitting((prev) => ({ ...prev, [questionText]: true }));
    try {
      const response = await api<InterviewEvaluation>("/api/ai/interview/feedback", token, {
        method: "POST",
        body: JSON.stringify({ question: questionText, answer, role: selectedRole, category: activeTab === "soft" ? "Behavioral" : "Technical" }),
      });
      setEvaluations((prev) => ({ ...prev, [questionText]: response }));
      flash(response.source === "ai" ? "Answer evaluated by AI." : "Answer evaluated.");
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
        <PageTitle eyebrow="Interview coach" title="Choose a department to start practicing." copy="12 departments — each with 15 specific technical questions and 5 soft skills questions (numbered 16–20). Practice and get AI feedback." />
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
                          <strong>Evaluation · {evaluation.verdict}</strong>
                          <span style={{ color: evaluation.score >= 7 ? "var(--success)" : evaluation.score >= 5 ? "var(--warning)" : "var(--error)" }}>Score: {evaluation.score}/10</span>
                        </div>
                        <div className="score-breakdown">
                          {evaluation.dimensions.map((dim) => <div className="score-row" key={dim.key}>
                            <div className="score-row-head"><span>{dim.label}</span><strong>{dim.score}/10</strong></div>
                            <div className="score-bar"><i style={{ width: `${dim.score * 10}%` }} /></div>
                          </div>)}
                        </div>
                        {evaluation.note && <p className="suggestion">{evaluation.note}</p>}
                        <div className="feedback-points-list strengths">
                          <span>✅ Strengths</span>
                          <ul>{evaluation.strengths.length ? evaluation.strengths.map((str, idx) => <li key={idx}>{str}</li>) : <li>No clear strengths yet.</li>}</ul>
                        </div>
                        <div className="feedback-points-list weaknesses">
                          <span>⚠️ Areas for Improvement</span>
                          <ul>{evaluation.weaknesses.length ? evaluation.weaknesses.map((weak, idx) => <li key={idx}>{weak}</li>) : <li>None found.</li>}</ul>
                        </div>
                        {evaluation.modelAnswer && <div className="model-answer-section">
                          <span>💡 Model Answer Suggestion</span>
                          <p>{evaluation.modelAnswer}</p>
                        </div>}
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

type ResumeCategory = { key: string; label: string; score: number; max: number; note: string };

function AnalysisPanel({ result }: { result: Record<string, unknown> | null }) {
  if (!result) return <div className="analysis-panel"><div className="empty-analysis"><div className="scan-lines"><i /><i /><i /><i /></div><h3>Waiting for resume</h3><p>Analysis score, skills, and suggestions will appear here.</p></div></div>;
  const skills = (result.skills as string[] | undefined) ?? [];
  const suggestions = (result.suggestions as string[] | undefined) ?? [];
  const categories = (result.categories as ResumeCategory[] | undefined) ?? [];
  const missing = (result.missingSkills as string[] | undefined) ?? [];
  const warnings = (result.warnings as string[] | undefined) ?? [];
  return <div className="analysis-panel">
    <div className="analysis-score"><CheckCircle2 /><div><strong>{String(result.score ?? 0)}</strong><span>resume score{result.grade ? ` · ${String(result.grade)}` : ""}</span></div></div>
    {warnings.map((item) => <p className="suggestion" key={item}>{item}</p>)}
    {categories.length > 0 && <>
      <h4>Score breakdown</h4>
      <div className="score-breakdown">
        {categories.map((item) => <div className="score-row" key={item.key}>
          <div className="score-row-head"><span>{item.label}</span><strong>{item.score}/{item.max}</strong></div>
          <div className="score-bar"><i style={{ width: `${Math.round((item.score / item.max) * 100)}%` }} /></div>
          <small>{item.note}</small>
        </div>)}
      </div>
    </>}
    <h4>Skills found</h4>
    <div className="tag-list">{skills.length ? skills.map((skill) => <span key={skill}>{skill}</span>) : <span>None detected</span>}</div>
    {missing.length > 0 && <><h4>Commonly asked, not found</h4><div className="tag-list">{missing.map((skill) => <span key={skill}>{skill}</span>)}</div></>}
    <h4>Suggestions</h4>
    {suggestions.length ? suggestions.map((item) => <p className="suggestion" key={item}>{item}</p>) : <p className="suggestion success">Well structured. Keep tailoring it per role.</p>}
  </div>;
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="empty-state"><Sparkles size={22} /><strong>{title}</strong><span>{copy}</span></div>;
}


