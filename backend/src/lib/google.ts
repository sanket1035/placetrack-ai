import { OAuth2Client } from "google-auth-library";
import { config } from "./config.js";

export type GoogleProfile = { sub: string; email: string; name: string; picture?: string };

let client: OAuth2Client | null = null;

type Verifier = (credential: string) => Promise<GoogleProfile>;

/** Test seam: lets tests supply a fake verifier instead of calling Google. */
export function setGoogleVerifier(fn: Verifier | null) {
  override = fn;
}
let override: Verifier | null = null;

/** Verifies a Google Identity Services ID token and returns the verified profile. */
export async function verifyGoogleCredential(credential: string): Promise<GoogleProfile> {
  if (override) return override(credential);
  if (!config.googleClientId) throw new Error("Google sign-in is not configured (GOOGLE_CLIENT_ID missing)");
  client ??= new OAuth2Client(config.googleClientId);
  const ticket = await client.verifyIdToken({ idToken: credential, audience: config.googleClientId });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) throw new Error("Google token has no email");
  if (!payload.email_verified) throw new Error("Google email is not verified");
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name ?? payload.email.split("@")[0],
    picture: payload.picture
  };
}
