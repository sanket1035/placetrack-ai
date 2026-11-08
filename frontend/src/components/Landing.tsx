"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Bell, BookOpenCheck, Building2, FileScan, GraduationCap, Loader2, Mic, ShieldCheck, Users } from "lucide-react";
import "./landing.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type PublicStats = {
  enabled: boolean;
  students?: number; placed?: number; placementRate?: number; companies?: number; drives?: number;
  highestPackage?: number; averagePackage?: number;
};

const FEATURES = [
  { icon: FileScan, title: "AI resume scorer", text: "Upload a resume, paste a job description and see the real match, missing keywords and fixes." },
  { icon: Mic, title: "AI mock interviews", text: "Practice department-specific questions and get a score, strengths and a model answer." },
  { icon: BookOpenCheck, title: "Aptitude mock tests", text: "Timed tests with answer review. Coordinators add new tests from an Excel sheet." },
  { icon: Bell, title: "Drive alerts", text: "Eligible students get an email the moment a drive opens, with the deadline and apply link." },
  { icon: BarChart3, title: "Department dashboard", text: "Coordinators see placement progress, readiness and students who need attention." },
  { icon: ShieldCheck, title: "Role based access", text: "Students, coordinators and admins each see only what they should. Google sign-in only." }
];

const STEPS = [
  { n: "01", title: "Sign in with Google", text: "Use your college Google account. No passwords to remember." },
  { n: "02", title: "Complete your profile", text: "Add your CGPA, skills, projects and internships once. Your readiness score is worked out from real data." },
  { n: "03", title: "Apply and track", text: "See drives you are eligible for, apply through the college form and follow every stage." }
];

const FAQ = [
  ["Who can sign in?", "Students sign in with their college Google account. Coordinators are invited by the admin for their department."],
  ["How is the readiness score worked out?", "Only from real data: CGPA, aptitude test accuracy, mock tests taken, projects, internships, skills and active backlogs. The breakdown is shown on your dashboard."],
  ["Do I apply inside PlaceTrack?", "You apply through the college application form linked on each drive, then press \"I have applied\" so your coordinator can track it."],
  ["Who sees my data?", "You and your department coordinator. Your resume and profile are never shown publicly. See the Privacy page for details."]
];

export function Landing() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [recruiters, setRecruiters] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", website: "" });
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/public/stats`).then((r) => (r.ok ? r.json() : null)).then(setStats).catch(() => setStats(null));
    fetch(`${API_BASE}/api/public/recruiters`).then((r) => (r.ok ? r.json() : [])).then((list) => setRecruiters(Array.isArray(list) ? list : [])).catch(() => setRecruiters([]));
  }, []);

  const showNumbers = Boolean(stats?.enabled && (stats.students ?? 0) > 0);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setNote(null);
    try {
      const response = await fetch(`${API_BASE}/api/public/inquiry`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not send your message.");
      setNote({ ok: true, text: "Thanks. The placement cell will get back to you by email." });
      setForm({ name: "", email: "", phone: "", message: "", website: "" });
    } catch (error) {
      setNote({ ok: false, text: error instanceof Error ? error.message : "Could not send your message." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="lp">
      <header className="lp-nav">
        <Link href="/" className="lp-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/kkw-society.png" alt="Karmaveer Kakasaheb Wagh Education Society" width={60} height={36} />
          <span>Place<mark>Track</mark></span>
        </Link>
        <nav aria-label="Sections">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          {showNumbers && <a href="#numbers">Numbers</a>}
          {recruiters.length > 0 && <a href="#recruiters">Recruiters</a>}
          <a href="#faq">FAQ</a>
          <a href="#inquiry">Inquiry</a>
        </nav>
        <Link href="/login" className="lp-btn lp-btn-dark">Login</Link>
      </header>

      <section className="lp-hero">
        <span className="lp-chip"><GraduationCap size={14} /> Training &amp; Placement Portal</span>
        <h1>Campus placements, <mark>tracked end to end.</mark></h1>
        <p>One place for drives, applications, resume checks, mock tests and interview practice. Built for KKWagh students, coordinators and the placement cell.</p>
        <div className="lp-cta">
          <Link href="/login" className="lp-btn lp-btn-dark">Login with Google <ArrowRight size={16} /></Link>
          <a href="#features" className="lp-btn lp-btn-line">See what is inside</a>
        </div>
      </section>

      <section className="lp-roles">
        {[
          { icon: GraduationCap, title: "For students", text: "Know your readiness, find eligible drives, practise and track every application." },
          { icon: Users, title: "For coordinators", text: "Run your department: create drives, update stages, see who needs help." },
          { icon: Building2, title: "For the placement cell", text: "One clean record of companies, drives and outcomes, with CSV and PDF reports." }
        ].map(({ icon: Icon, title, text }, index) => (
          <article key={title} className={`lp-card lp-tone-${index}`}>
            <Icon size={22} />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section id="features" className="lp-section">
        <span className="lp-eyebrow">Features</span>
        <h2>Everything for the placement season, <mark>in one place.</mark></h2>
        <div className="lp-grid">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="lp-feature">
              <span className="lp-icon"><Icon size={20} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="lp-section lp-alt">
        <span className="lp-eyebrow">How it works</span>
        <h2>Three steps to get started.</h2>
        <div className="lp-steps">
          {STEPS.map((step) => (
            <article key={step.n} className="lp-step">
              <span className="lp-num">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      {showNumbers && stats && (
        <section id="numbers" className="lp-section">
          <span className="lp-eyebrow">Placement numbers</span>
          <h2>Live from the portal.</h2>
          <div className="lp-stats">
            {[
              [String(stats.students), "Students"],
              [String(stats.placed), "Placed"],
              [`${stats.placementRate}%`, "Placement rate"],
              [String(stats.companies), "Companies"],
              ...(stats.highestPackage ? [[`${stats.highestPackage} LPA`, "Highest package"]] : []),
              ...(stats.averagePackage ? [[`${stats.averagePackage} LPA`, "Average package"]] : [])
            ].map(([value, label]) => (
              <div key={label} className="lp-stat"><strong>{value}</strong><span>{label}</span></div>
            ))}
          </div>
        </section>
      )}

      {recruiters.length > 0 && (
        <section id="recruiters" className="lp-section">
          <span className="lp-eyebrow">Our recruiters</span>
          <h2>Companies that have hired from us.</h2>
          <ul className="lp-recruiters-list">{recruiters.map((name) => <li key={name}>{name}</li>)}</ul>
        </section>
      )}

      <section id="faq" className="lp-section lp-alt">
        <span className="lp-eyebrow">FAQ</span>
        <h2>Questions, answered.</h2>
        <div className="lp-faq">
          {FAQ.map(([q, a]) => (
            <details key={q}><summary>{q}</summary><p>{a}</p></details>
          ))}
        </div>
      </section>

      <section className="lp-banner">
        <h2>Ready to track your placement?</h2>
        <p>Sign in with your college Google account and start in a minute.</p>
        <Link href="/login" className="lp-btn lp-btn-yellow">Login with Google <ArrowRight size={16} /></Link>
      </section>

      <section id="inquiry" className="lp-section">
        <span className="lp-eyebrow">Placement inquiry</span>
        <h2>Talk to the placement cell.</h2>
        <form className="lp-form" onSubmit={send}>
          <label>Name<input required minLength={2} maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Phone (optional)<input inputMode="tel" maxLength={20} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label className="lp-wide">Message<textarea required minLength={10} maxLength={1500} rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>
          <input className="lp-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          <div className="lp-wide">
            <button className="lp-btn lp-btn-dark" disabled={sending}>{sending ? <Loader2 className="spin" size={16} /> : null} Send inquiry</button>
            {note && <p className={note.ok ? "lp-ok" : "lp-bad"}>{note.text}</p>}
          </div>
        </form>
      </section>

      <footer className="lp-foot">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/kkw-society.png" alt="Karmaveer Kakasaheb Wagh Education Society" width={68} height={40} />
          <p>PlaceTrack · Karmaveer Kakasaheb Wagh Education Society</p>
        </div>
        <nav aria-label="Footer">
          <Link href="/login">Login</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href="#inquiry">Inquiry</a>
        </nav>
        <small>© {new Date().getFullYear()} PlaceTrack</small>
      </footer>
    </div>
  );
}
