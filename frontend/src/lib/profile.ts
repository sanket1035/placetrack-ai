/** A LinkedIn profile link must be https and on linkedin.com (any country subdomain). */
export const LINKEDIN_RE = /^https:\/\/([a-z0-9-]+\.)?linkedin\.com\/\S+/i;
export const LINKEDIN_HINT = "Enter your LinkedIn profile link, like https://www.linkedin.com/in/your-name";

export function isLinkedinUrl(value: string): boolean {
  return LINKEDIN_RE.test(value.trim());
}

/** One project or internship name per line. Blank lines are ignored. */
export function parseNames(text: string): string[] {
  return text.split("\n").map((line) => line.trim()).filter(Boolean);
}

/** Returns an error message, or null when the lists are fine. */
export function checkNames(label: string, names: string[]): string | null {
  if (names.length > 10) return `You can list at most 10 ${label}.`;
  if (names.some((name) => name.length < 2 || name.length > 80)) return `Each ${label.replace(/s$/, "")} name must be 2 to 80 characters.`;
  return null;
}
