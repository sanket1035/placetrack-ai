import type { Metadata } from "next";
import { LegalPage } from "../legal/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy — PlaceTrack AI" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="7 November 2026">
      <p>
        PlaceTrack AI is a placement management platform for engineering colleges. This policy explains what
        information we handle and why.
      </p>
      <h2>Information we collect</h2>
      <ul>
        <li>From Google sign-in: your name, email address and profile picture. We never receive your Google password.</li>
        <li>
          From students: branch, CGPA, graduation year, skills, resume and placement applications that you add or
          submit.
        </li>
        <li>Practice and readiness results (aptitude and interview practice) and basic activity logs for security.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To sign you in and keep your account secure.</li>
        <li>To let your Training &amp; Placement Coordinator (TPC) and the placement admin manage drives and applications.</li>
        <li>To show readiness insights and send placement-related notifications.</li>
      </ul>
      <h2>Who can see your data</h2>
      <p>
        Students see their own data. A TPC sees students and applications of their own department only. Admins see
        the whole college. We do not sell your data or use it for advertising.
      </p>
      <h2>Third-party services</h2>
      <p>
        We use Google Identity for sign-in and hosting, database and email providers to run the service. If AI
        feedback features are enabled, the text you submit for feedback is sent to an AI provider to generate a
        response.
      </p>
      <h2>Retention and deletion</h2>
      <p>
        Data is kept while your account is active. You can ask your TPC or the admin to correct or delete your
        account and data.
      </p>
    </LegalPage>
  );
}
