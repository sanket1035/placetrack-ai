"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Bell, BookOpenCheck, Building2, FileScan, GraduationCap, Mic, ShieldCheck, Users } from "lucide-react";
import { PUBLISHED_RECRUITERS, TOP_RECRUITERS } from "../data/recruiters";
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

// Published by the college on kkwagh.edu.in (placement page and placement brochure 2025-26).
const FIGURES = [
  ["600+", "Students placed", "A.Y. 2025-26"],
  ["200+", "Recruiters", "A.Y. 2025-26"],
  ["25 LPA", "Highest package", "A.Y. 2025-26"],
  ["5.5 LPA", "Average package", "A.Y. 2025-26"],
  ["1200+", "Internships", "A.Y. 2025-26"],
  ["15+", "Global internships", "A.Y. 2025-26"]
];
const TREND: Array<[string, number]> = [["2017-18", 461], ["2018-19", 447], ["2019-20", 446], ["2020-21", 555], ["2021-22", 739], ["2022-23", 614], ["2023-24", 642], ["2024-25", 700]];
const ACCREDITATIONS = ["Autonomous since A.Y. 2022-23", "Affiliated to SPPU, Pune", "AICTE approved", "8 programs accredited by NBA", "NAAC Grade A", "UGC 2(f) and 12(B)"];

const ACHIEVERS = [
  ["overall", "Placements in academic year 2025-26: 600 students placed, 25 LPA highest and 5.5 LPA average package, 200+ recruiters"],
  ["electrical-1", "Department of Electrical Engineering placement achievers 2025-26"],
  ["electrical-2", "Department of Electrical Engineering placement achievers 2025-26"],
  ["mechanical", "Department of Mechanical Engineering placement achievers 2025-26"],
  ["chemical", "Department of Chemical Engineering placement achievers 2025-26"]
];

const FAQ = [
  ["Who can sign in?", "Students sign in with their college Google account. Coordinators are invited by the admin for their department."],
  ["How is the readiness score worked out?", "Only from real data: CGPA, aptitude test accuracy, mock tests taken, projects, internships, skills and active backlogs. The breakdown is shown on your dashboard."],
  ["Do I apply inside PlaceTrack?", "You apply through the college application form linked on each drive, then press \"I have applied\" so your coordinator can track it."],
  ["Who sees my data?", "You and your department coordinator. Your resume and profile are never shown publicly. See the Privacy page for details."]
];

export function Landing() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/public/stats`).then((r) => (r.ok ? r.json() : null)).then(setStats).catch(() => setStats(null));
  }, []);

  const recruiterGroups = Object.entries(PUBLISHED_RECRUITERS).filter(([, names]) => names.length > 0);
  const recruiterCount = recruiterGroups.reduce((sum, [, names]) => sum + names.length, 0);
  const showNumbers = Boolean(stats?.enabled && (stats.students ?? 0) > 0);


  return (
    <div className="lp">
      <header className="lp-nav">
        <Link href="/" className="lp-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/kkw-society.png" alt="Karmaveer Kakasaheb Wagh Education Society" width={60} height={36} />
          <span>Place<mark>Track</mark></span>
        </Link>
        <nav aria-label="Sections">
          <a href="#achievers">Achievers</a>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          {showNumbers && <a href="#numbers">Numbers</a>}
          <a href="#recruiters">Recruiters</a>
          <a href="#faq">FAQ</a>
          <a href="#contact">Contact</a>
        </nav>
        <Link href="/login" className="lp-btn lp-btn-dark">Login</Link>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-img" aria-hidden="true" />
        <span className="lp-chip"><GraduationCap size={14} /> Training &amp; Placement Portal</span>
        <h1>Campus placements, <mark>tracked end to end.</mark></h1>
        <p>One place for drives, applications, resume checks, mock tests and interview practice. Built for the students, coordinators and Training &amp; Placement Cell of K K Wagh Institute of Engineering Education &amp; Research, Nashik.</p>
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

      <section id="figures" className="lp-section">
        <span className="lp-eyebrow">Placements at K K Wagh</span>
        <h2>The college&apos;s placement record, <mark>year after year.</mark></h2>
        <div className="lp-stats">
          {FIGURES.map(([value, label, sub]) => (
            <div key={label} className="lp-stat"><strong>{value}</strong><span>{label}</span><small>{sub}</small></div>
          ))}
        </div>
        <div className="lp-trend" role="img" aria-label="Total placements per year, 2017-18 to 2024-25">
          <h3>Total placements by year</h3>
          <div className="lp-bars">
            {TREND.map(([year, count]) => (
              <div key={year} className="lp-bar"><span style={{ height: `${(count / 739) * 100}%` }}><b>{count}</b></span><small>{year}</small></div>
            ))}
          </div>
        </div>
        <ul className="lp-accred">{ACCREDITATIONS.map((item) => <li key={item}>{item}</li>)}</ul>
        <p className="lp-source">Source: kkwagh.edu.in, placement page and placement brochure 2025-26. 2024-25 is as on December 2025.</p>
      </section>

      <section id="achievers" className="lp-section lp-alt">
        <span className="lp-eyebrow">Placement achievers 2025-26</span>
        <h2>Our students, going places.</h2>
        <div className="lp-gallery">
          {ACHIEVERS.map(([file, alt]) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={file} src={`/landing/achievers-${file}.jpg`} alt={alt} loading="lazy" />
          ))}
        </div>
        <p className="lp-source">Images published by the Training &amp; Placement Cell, K K Wagh IEER.</p>
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

      <section id="recruiters" className="lp-section">
        <span className="lp-eyebrow">Our recruiters</span>
        <h2>Companies that hire from KKWagh.</h2>
        <div className="lp-top-recruiters">
          {TOP_RECRUITERS.map((name) => (
            <div key={name} className="lp-recruiter-tile">
              <span className="lp-mono">{name.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span>
              <b>{name.replace(/ (Ltd\.?|Pvt Ltd|Limited|India)$/i, "")}</b>
            </div>
          ))}
        </div>
        <button type="button" className="lp-btn lp-btn-dark lp-more" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
          {showAll ? "− Show fewer" : `+ Show all ${recruiterCount} recruiters`}
        </button>
        {showAll && recruiterGroups.map(([group, names]) => (
          <div key={group} className="lp-recruiters-group">
            <h3>{group}</h3>
            <ul className="lp-recruiters-list">{names.map((name) => <li key={name}>{name}</li>)}</ul>
          </div>
        ))}
      </section>

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

      <section id="contact" className="lp-section">
        <span className="lp-eyebrow">Contact</span>
        <h2>Reach the placement cell.</h2>
        <div className="lp-contact-grid">
          <div className="lp-contact-card">
            <h3>Training &amp; Placement Cell</h3>
            <p>K K Wagh Institute of Engineering Education &amp; Research, Hirabai Haridas Vidyanagari, Amrutdham, Panchavati, Nashik</p>
            <p><a href="mailto:tpo-engg@kkwagh.edu.in">tpo-engg@kkwagh.edu.in</a></p>
            <p><a href="tel:02532517504">0253-2517504</a> · <a href="tel:02532512876">0253-2512876</a></p>
          </div>
          <iframe
            className="lp-map"
            title="K K Wagh Institute of Engineering Education and Research on the map"
            src="https://maps.google.com/maps?q=K+K+Wagh+Institute+of+Engineering+Education+and+Research+Nashik&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <footer className="lp-foot">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/kkw-society.png" alt="Karmaveer Kakasaheb Wagh Education Society" width={68} height={40} />
          <p>PlaceTrack · K K Wagh Institute of Engineering Education &amp; Research, Nashik</p>
          <p className="lp-contact">
            Training &amp; Placement Cell<br />
            <a href="mailto:tpo-engg@kkwagh.edu.in">tpo-engg@kkwagh.edu.in</a><br />
            <a href="tel:02532517504">0253-2517504</a> · <a href="tel:02532512876">0253-2512876</a>
          </p>
        </div>
        <nav aria-label="Footer">
          <Link href="/login">Login</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href="#contact">Contact</a>
        </nav>
        <small>© {new Date().getFullYear()} PlaceTrack</small>
      </footer>
    </div>
  );
}
