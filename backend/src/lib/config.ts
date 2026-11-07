/** Central, validated runtime configuration. */
const isProd = process.env.NODE_ENV === "production";

function list(value: string | undefined): string[] {
  return (value ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (isProd) throw new Error("JWT_SECRET must be set (16+ characters) in production");
  return "development-secret-change-me";
}

export const config = {
  isProd,
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  /** Emails that become ADMIN on first Google sign-in. */
  adminEmails: list(process.env.ADMIN_EMAILS),
  /** Domains whose Google accounts may self-register as students, e.g. "kkwagh.edu.in". */
  studentDomains: list(process.env.ALLOWED_STUDENT_EMAIL_DOMAINS)
};
