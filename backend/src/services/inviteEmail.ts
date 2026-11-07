import { getEmailTemplate, sendEmail } from "./mailer.js";
import { escapeHtml } from "./driveNotifications.js";

/** Swappable in tests so no real email is sent. */
export const inviteMail = { send: sendEmail };

/** Email sent to a Training & Placement Coordinator when an admin adds them, so they know to sign in with Google. */
export function buildTpcInviteEmail({ name, email, department }: { name: string; email: string; department: string }) {
  const site = (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const body = `
    <p>Hello ${escapeHtml(name)},</p>
    <p>You have been added as the <strong>Training &amp; Placement Coordinator</strong> for <strong>${escapeHtml(department)}</strong> on PlaceTrack.</p>
    <p>As coordinator you can publish placement drives for your department, review your students' details and track their applications.</p>
    <p><strong>How to start:</strong> open PlaceTrack and choose <em>Continue with Google</em>. Sign in with this email address: <strong>${escapeHtml(email)}</strong>. There is no password.</p>
    <p style="font-size:13px;color:#707978;">If you were not expecting this, you can ignore this email.</p>`;
  return {
    subject: "You have been added as Placement Coordinator on PlaceTrack",
    html: getEmailTemplate("Welcome, Placement Coordinator", body).replace("http://localhost:3000", site)
  };
}
