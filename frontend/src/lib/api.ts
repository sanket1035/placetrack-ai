export type Role = "STUDENT" | "COORDINATOR" | "ADMIN";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  student?: {
    id: string;
    name: string;
    branch: string;
    cgpa: number;
    backlogs: number;
    graduationYear: number;
    skills: string[];
  } | null;
  coordinator?: { id: string; department: string; phone?: string | null } | null;
};

export type LoginResponse = { token: string; user: SessionUser };

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || response.statusText || "Request failed" };
  }
  if (!response.ok) {
    throw new Error(data.error ?? data.message ?? "Request failed");
  }
  return data as T;
}

export async function api<T>(path: string, token?: string | null, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });
  } catch (networkError: any) {
    // Network error - server unreachable, CORS preflight blocked, no internet, etc.
    const msg = networkError?.message ?? "Cannot reach server. Check your connection.";
    throw new Error(msg);
  }
  return parseResponse<T>(response);
}

export const demoAccounts = [
  { label: "Student", email: "student@placetrack.ai", password: "Demo@123" },
  { label: "Coordinator", email: "coordinator@placetrack.ai", password: "Demo@123" },
  { label: "Admin", email: "admin@placetrack.ai", password: "Demo@123" }
];
