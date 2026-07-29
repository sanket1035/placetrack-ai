export type Role = "STUDENT" | "COORDINATOR" | "ADMIN";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  notifications?: NotificationItem[];
  student?: {
    id: string;
    name: string;
    branch: string;
    cgpa: number;
    backlogs: number;
    graduationYear: number;
    skills: string[];
    phone?: string | null;
    linkedinUrl?: string | null;
    projectsCount?: number;
    internshipsCount?: number;
    resumeUrl?: string | null;
    mockTestCount?: number;
    emailEnabled?: boolean;
  } | null;
  coordinator?: { id: string; department: string; phone?: string | null } | null;
};

export type LoginResponse = { token: string; user: SessionUser };

export class ApiError extends Error {
  status?: number;
  reasons?: string[];
  code?: string;
  data?: any;

  constructor(message: string, status?: number, reasons?: string[], code?: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.reasons = reasons;
    this.code = code;
    this.data = data;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || response.statusText || "Request failed" };
  }
  if (!response.ok) {
    const reasons = Array.isArray(data.reasons) ? data.reasons : undefined;
    const msg = data.error ?? data.message ?? "Request failed";
    throw new ApiError(msg, response.status, reasons, data.code, data);
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

// ─── Export Center helpers ─────────────────────────────────────────────────────

export type ExportReportType = "applications" | "students" | "drives" | "summary";
export type ExportFormat = "csv" | "json" | "pdf";

/**
 * Download a CSV or JSON report directly from the backend.
 * Triggers a browser file download.
 */
export async function downloadExport(
  reportType: ExportReportType,
  format: "csv" | "json",
  token: string
): Promise<void> {
  const path = `/api/reports/${reportType}.${format}`;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    let msg = "Export failed";
    try { msg = JSON.parse(text).error ?? msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  a.href = url;
  a.download = match?.[1] ?? `placetrack-${reportType}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Fetch export data as parsed JSON — used for client-side PDF generation.
 */
export async function fetchExportData(
  reportType: ExportReportType,
  token: string
): Promise<{ generatedAt: string; count?: number; data?: unknown[]; [key: string]: unknown }> {
  const path = reportType === "summary"
    ? "/api/reports/summary.json"
    : `/api/reports/${reportType}.json`;
  return api(path, token);
}
