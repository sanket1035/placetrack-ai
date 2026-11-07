import type { PlacementDrive, Company } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { emitToUser } from "../lib/socket.js";
import { checkEligibility } from "./eligibility.js";
import { sendEmail, getEmailTemplate } from "./mailer.js";
import { formatPackage } from "../lib/package.js";

/** Swappable in tests so no real SMTP connection is needed. */
export const driveMail = { send: sendEmail };

export const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function formatDeadline(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date) + " IST";
}

/** Email sent to every eligible student when a drive is published. */
export function buildDriveEmail(drive: PlacementDrive & { company: Company }) {
  const company = escapeHtml(drive.company.name);
  const role = escapeHtml(drive.role);
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#707978;">${label}</td><td style="padding:4px 0;"><strong>${value}</strong></td></tr>`;
  const description = drive.description ? `<p style="white-space:pre-line;">${escapeHtml(drive.description.slice(0, 1500))}</p>` : "";
  const form = drive.applyUrl
    ? `<p><a href="${escapeHtml(drive.applyUrl)}" style="display:inline-block;padding:10px 18px;background:#1B3A0A;color:#fff;text-decoration:none;border-radius:8px;">Open the application form</a></p>
       <p>After you submit the form, open PlaceTrack and press <strong>I have applied</strong> on this drive so your coordinator can track your application.</p>`
    : `<p>Apply through the form shared by the Training &amp; Placement Cell, then press <strong>I have applied</strong> on this drive in PlaceTrack.</p>`;
  const body = `
    <p>${company} is hiring for <strong>${role}</strong> and your profile is eligible.</p>
    <table style="font-size:14px;">
      ${row("Package (CTC)", formatPackage(drive.package, drive.packageMax))}
      ${row("Location", escapeHtml(drive.location))}
      ${row("Eligible branches", escapeHtml(drive.allowedBranches.join(", ")))}
      ${row("Apply before", formatDeadline(drive.deadline))}
    </table>
    ${description}
    ${form}`;
  return {
    subject: `New drive: ${drive.company.name} - ${drive.role} (apply before ${formatDeadline(drive.deadline)})`,
    html: getEmailTemplate(`${drive.company.name} is hiring: ${drive.role}`, body)
  };
}

/**
 * Creates an in-app notification, pushes it live and emails each eligible student of the departments the drive allows.
 * Runs after the HTTP response so publishing a drive stays fast for a large department.
 */
export async function notifyEligibleStudents(drive: PlacementDrive & { company: Company }, department: string | null) {
  const students = await prisma.student.findMany({
    where: department ? { branch: department } : { branch: { in: drive.allowedBranches } },
    include: { user: { select: { email: true } } }
  });
  const eligible = students.filter((student) => checkEligibility(student, drive).eligible);
  const mail = buildDriveEmail(drive);
  let emailed = 0;
  for (let index = 0; index < eligible.length; index += 5) {
    await Promise.all(eligible.slice(index, index + 5).map(async (student) => {
      try {
        const notification = await prisma.notification.create({
          data: { userId: student.userId, title: "New Eligible Drive", message: `${drive.company.name} is hiring for ${drive.role}` }
        });
        emitToUser(student.userId, "drive:new", notification);
        if (student.emailEnabled && student.user.email) {
          await driveMail.send({ to: student.user.email, subject: mail.subject, html: mail.html });
          emailed++;
        }
      } catch (error) {
        console.error("Failed to notify student about new drive:", error);
      }
    }));
  }
  return { eligible: eligible.length, emailed };
}
