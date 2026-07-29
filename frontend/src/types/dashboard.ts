import type { Role, SessionUser } from "@/lib/api";
export type { Role, SessionUser };

export type View =
  | "Overview"
  | "Applications"
  | "Opportunities"
  | "Resume AI"
  | "Aptitude"
  | "Interview"
  | "Profile"
  | "Drive Creator"
  | "Analytics"
  | "Users"
  | "Practice"
  | "Export Center";

export interface Drive {
  id: string;
  company: {
    name: string;
    website?: string | null;
    description?: string | null;
    logo?: string | null;
  };
  role: string;
  package: number;
  location: string;
  jobType: string;
  deadline: string;
  allowedBranches: string[];
  minCgpa: number;
  eligibility?: {
    eligible: boolean;
    score: number;
    reasons: string[];
  } | null;
  alreadyApplied?: boolean;
  _count?: {
    applications: number;
  };
  description?: string;
  maxBacklogs?: number;
}

export interface Application {
  id: string;
  status: string;
  updatedAt: string;
  timeline: unknown;
  drive: Drive;
  interview?: {
    dateTime: string;
    mode: string;
    locationOrLink: string;
    status: string;
  } | null;
  student?: {
    name: string;
    branch: string;
    cgpa: number;
    user?: {
      email: string;
    };
  };
}

export interface TestSummary {
  id: string;
  title: string;
  duration: number;
  _count?: {
    questions: number;
    results: number;
  };
}

export type DashboardData = Record<string, unknown>;

export type FilterField = "cgpa" | "branch" | "skills" | "company" | "package" | "graduationYear";
export type FilterOperator = "gte" | "lte" | "eq" | "contains" | "in";

export interface FilterCondition {
  id: string;
  field: FilterField;
  operator: FilterOperator;
  value: string;
}

export interface FilterPreset {
  name: string;
  conditions: FilterCondition[];
}
