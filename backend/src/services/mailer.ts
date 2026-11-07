import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT ?? 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.EMAIL_FROM ?? "PlaceTrack AI <no-reply@placetrack.ai>";

const transporter = host
  ? nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    })
  : null;

let warnedNoSmtp = false;

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!transporter) {
    if (!warnedNoSmtp) console.warn("[Mailer] SMTP not configured. Emails are skipped until SMTP_HOST is set.");
    warnedNoSmtp = true;
    return;
  }
  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    console.log(`[Mailer] Email sent successfully to ${to}: ${subject}`);
  } catch (error) {
    console.error(`[Mailer] Failed to send email to ${to}:`, error);
  }
}

// Brand email layout wrapper
export function getEmailTemplate(title: string, bodyContent: string): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #fcf9f4; color: #1c1c19;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #bfc8c8; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 76, 76, 0.05);">
      <!-- Header -->
      <tr>
        <td style="background-color: #003434; padding: 32px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">PlaceTrack <span style="color: #ff734c;">AI</span></h1>
          <p style="margin: 4px 0 0; color: #85bbbb; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Campus Placement Portal</p>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="padding: 40px 32px;">
          <h2 style="margin: 0 0 16px; color: #003434; font-size: 20px; font-weight: 700; line-height: 1.4;">${title}</h2>
          <div style="font-size: 15px; line-height: 1.6; color: #404848;">
            ${bodyContent}
          </div>
          <table border="0" cellpadding="0" cellspacing="0" style="margin-top: 32px; width: 100%;">
            <tr>
              <td style="text-align: center;">
                <a href="${process.env.FRONTEND_URL ?? "http://localhost:3000"}" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #ffffff; background-color: #aa3614; text-decoration: none; border-radius: 8px;">Go to Dashboard</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="background-color: #f6f3ee; padding: 24px 32px; text-align: center; font-size: 12px; color: #707978; border-top: 1px solid #bfc8c8;">
          <p style="margin: 0;">This is an automated email from PlaceTrack AI. Please do not reply directly.</p>
          <p style="margin: 8px 0 0;">Manage your notification preferences under Profile Settings in your dashboard.</p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}
