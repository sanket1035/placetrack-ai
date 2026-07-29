import type { Drive, FilterCondition } from "../types/dashboard";

export function applyFilterConditions(drives: Drive[], conditions: FilterCondition[]): Drive[] {
  if (conditions.length === 0) return drives;
  return drives.filter((drive) =>
    conditions.every((cond) => {
      const { field, operator, value } = cond;
      if (!value.trim()) return true;
      switch (field) {
        case "cgpa": {
          const v = Number(value);
          if (isNaN(v)) return true;
          if (operator === "gte") return drive.minCgpa <= v;
          if (operator === "lte") return drive.minCgpa >= v;
          if (operator === "eq")  return drive.minCgpa === v;
          return true;
        }
        case "package": {
          const v = Number(value);
          if (isNaN(v)) return true;
          if (operator === "gte") return drive.package >= v;
          if (operator === "lte") return drive.package <= v;
          if (operator === "eq")  return drive.package === v;
          return true;
        }
        case "graduationYear": {
          const v = Number(value);
          if (isNaN(v)) return true;
          const gy = (drive as any).graduationYear as number | undefined;
          if (gy === undefined) return true;
          if (operator === "eq")  return gy === v;
          if (operator === "gte") return gy >= v;
          if (operator === "lte") return gy <= v;
          return true;
        }
        case "branch": {
          const branches = drive.allowedBranches || [];
          const vals = value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
          if (operator === "in") return vals.some((v) => branches.some((b) => b.toLowerCase().includes(v)));
          if (operator === "eq") return branches.some((b) => b.toLowerCase() === value.trim().toLowerCase());
          return true;
        }
        case "skills": {
          const searchText = `${drive.role} ${drive.description ?? ""}`.toLowerCase();
          const vals = value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
          return vals.some((v) => searchText.includes(v));
        }
        case "company": {
          const name = drive.company.name.toLowerCase();
          if (operator === "contains") return name.includes(value.trim().toLowerCase());
          if (operator === "eq")       return name === value.trim().toLowerCase();
          return true;
        }
        default: return true;
      }
    })
  );
}

export function getCompanyBranding(companyName: string) {
  const normalized = companyName.toLowerCase();
  if (normalized.includes("nvidia")) {
    return {
      accentColor: "#76B900",
      logoBg: "rgba(118, 185, 0, 0.15)",
      bgGradient: "linear-gradient(135deg, rgba(118, 185, 0, 0.1) 0%, transparent 100%)",
      description: "GPU and AI computing platform industry leader.",
      rounds: ["Aptitude Test", "Coding Round", "System Design", "Technical & HR"]
    };
  }
  if (normalized.includes("tcs")) {
    return {
      accentColor: "#0066B3",
      logoBg: "rgba(0, 102, 179, 0.15)",
      bgGradient: "linear-gradient(135deg, rgba(0, 102, 179, 0.1) 0%, transparent 100%)",
      description: "Global consulting and technology services leader.",
      rounds: ["Cognitive Mock Test", "Technical Interview", "Managerial & HR"]
    };
  }
  if (normalized.includes("persistent")) {
    return {
      accentColor: "#E02020",
      logoBg: "rgba(224, 32, 32, 0.15)",
      bgGradient: "linear-gradient(135deg, rgba(224, 32, 32, 0.1) 0%, transparent 100%)",
      description: "Enterprise software engineering & product development specialist.",
      rounds: ["Online Aptitude", "Advanced Coding", "Technical Panel", "HR"]
    };
  }
  if (normalized.includes("ibm")) {
    return {
      accentColor: "#052FAD",
      logoBg: "rgba(5, 47, 173, 0.15)",
      bgGradient: "linear-gradient(135deg, rgba(5, 47, 173, 0.1) 0%, transparent 100%)",
      description: "Leading global hybrid cloud and enterprise AI company.",
      rounds: ["Cognitive Ability Assessment", "Coding Challenge", "Interview"]
    };
  }
  if (normalized.includes("bosch") || normalized.includes("siemens")) {
    return {
      accentColor: "#00E2C8",
      logoBg: "rgba(0, 226, 200, 0.15)",
      bgGradient: "linear-gradient(135deg, rgba(0, 226, 200, 0.1) 0%, transparent 100%)",
      description: "Advanced engineering systems and industrial IoT developer.",
      rounds: ["Offline Written Test", "Technical Evaluation", "HR Round"]
    };
  }
  const colors = ["#6A89A7", "#88BDF2", "#50d9c7", "#ffc56c", "#66a8ff"];
  const charCodeSum = companyName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = colors[charCodeSum % colors.length];
  return {
    accentColor: color,
    logoBg: `${color}25`,
    bgGradient: `linear-gradient(135deg, ${color}12 0%, transparent 100%)`,
    description: "KK Wagh Engineering premium campus hiring partner.",
    rounds: ["Online Test", "Technical Interview", "HR Discussion"]
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export function getLogoUrl(logo: string | null | undefined) {
  if (!logo) return null;
  if (logo.startsWith("http://") || logo.startsWith("https://") || logo.startsWith("data:")) return logo;
  return `${API_BASE}${logo}`;
}

export function initials(value: string) {
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "PT";
}

export function pretty(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function calculateEligibility(drive: Drive, student: any) {
  if (!student) return { eligible: true, score: 100, reasons: [] };
  const reasons: string[] = [];

  const allowed = drive.allowedBranches || [];
  if (allowed.length > 0 && !allowed.includes(student.branch)) {
    reasons.push(`${student.branch} branch is not allowed`);
  }

  if (student.cgpa < drive.minCgpa) {
    reasons.push(`CGPA ${student.cgpa} is below minimum CGPA ${drive.minCgpa}`);
  }

  const maxB = drive.maxBacklogs ?? 0;
  if (student.backlogs > maxB) {
    reasons.push(`Backlogs ${student.backlogs} exceeds max backlogs limit of ${maxB}`);
  }

  return {
    eligible: reasons.length === 0,
    score: reasons.length === 0 ? 100 : 0,
    reasons
  };
}
