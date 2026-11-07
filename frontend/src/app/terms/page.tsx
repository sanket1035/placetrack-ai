import type { Metadata } from "next";
import { LegalPage } from "../legal/LegalPage";

export const metadata: Metadata = { title: "Terms of Service — PlaceTrack AI" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="7 November 2026">
      <p>By signing in to PlaceTrack AI you agree to these terms.</p>
      <h2>Use of the service</h2>
      <ul>
        <li>Sign in only with your own Google account and keep your information accurate.</li>
        <li>Do not misuse the platform, attempt to access other people's data, or disrupt the service.</li>
        <li>Resumes and profile details you submit must be your own and truthful.</li>
      </ul>
      <h2>Accounts and roles</h2>
      <p>
        Access depends on your role (student, TPC or admin). We may suspend accounts that break these terms or are
        no longer part of the college.
      </p>
      <h2>Placement outcomes</h2>
      <p>
        Readiness scores and AI feedback are guidance only. PlaceTrack AI does not guarantee selection or placement.
      </p>
      <h2>Changes</h2>
      <p>We may update these terms; continued use means you accept the updated version.</p>
    </LegalPage>
  );
}
