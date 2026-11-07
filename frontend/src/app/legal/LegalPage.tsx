import Link from "next/link";
import type { ReactNode } from "react";

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main
      className="app light"
      style={{ minHeight: "100vh", background: "var(--bg, #FBFAF4)", color: "var(--ink, #1B3A0A)", padding: "48px 20px" }}
    >
      <article style={{ maxWidth: 760, margin: "0 auto", lineHeight: 1.65 }}>
        <Link href="/" style={{ color: "inherit", fontWeight: 600, textDecoration: "none" }}>
          ← PlaceTrack AI
        </Link>
        <h1 style={{ fontFamily: "var(--font-display, inherit)", fontSize: 40, margin: "24px 0 4px" }}>
          <mark className="hl">{title}</mark>
        </h1>
        <p style={{ opacity: 0.7, marginTop: 0 }}>Last updated: {updated}</p>
        {children}
        <h2>Contact</h2>
        <p>
          {CONTACT ? (
            <>
              Questions or requests: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
            </>
          ) : (
            <>Questions or requests: contact your college Training &amp; Placement Coordinator.</>
          )}
        </p>
      </article>
    </main>
  );
}
