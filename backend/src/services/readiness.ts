/**
 * Inputs for the placement readiness score. Every value comes from something the student actually
 * did or entered in PlaceTrack. Nothing is guessed.
 */
export interface ReadinessFeatures {
  /** Cumulative Grade Point Average (0.0 to 10.0). */
  cgpa: number;
  /** Average accuracy (0 to 100) across the student's aptitude mock tests. 0 when none were taken. */
  aptitudeAccuracy: number;
  /** Number of aptitude mock tests the student has completed. */
  testsTaken: number;
  /** Number of skills on the profile. */
  skills: number;
  /** Number of projects the student has listed. */
  projects: number;
  /** Number of internships the student has listed. */
  internships: number;
  /** Active uncleared backlogs. */
  backlogs: number;
}

export interface ReadinessPart {
  key: string;
  label: string;
  points: number;
  max: number;
  detail: string;
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Placement readiness score, 0 to 100, out of these parts (maximum in brackets):
 * - Academics: CGPA / 10 x 30 (30)
 * - Aptitude: average accuracy of aptitude mock tests x 0.25 (25)
 * - Practice: 1 point per mock test taken, up to 5 tests (5)
 * - Projects: 5 points per project, up to 3 projects (15)
 * - Internships: 7.5 points per internship, up to 2 internships (15)
 * - Skills: 1.25 points per skill, up to 8 skills (10)
 * - Backlogs: minus 5 per active backlog, at most minus 20
 */
export function predictReadiness(features: ReadinessFeatures) {
  const f = {
    cgpa: Math.max(0, Math.min(10, Number(features.cgpa) || 0)),
    aptitudeAccuracy: Math.max(0, Math.min(100, Number(features.aptitudeAccuracy) || 0)),
    testsTaken: Math.max(0, Number(features.testsTaken) || 0),
    skills: Math.max(0, Number(features.skills) || 0),
    projects: Math.max(0, Number(features.projects) || 0),
    internships: Math.max(0, Number(features.internships) || 0),
    backlogs: Math.max(0, Number(features.backlogs) || 0)
  };

  const parts: ReadinessPart[] = [
    { key: "academics", label: "Academics", points: (f.cgpa / 10) * 30, max: 30, detail: `CGPA ${f.cgpa}` },
    {
      key: "aptitude", label: "Aptitude tests", points: f.aptitudeAccuracy * 0.25, max: 25,
      detail: f.testsTaken ? `${Math.round(f.aptitudeAccuracy)}% average accuracy` : "No test taken yet"
    },
    { key: "practice", label: "Practice", points: Math.min(f.testsTaken, 5), max: 5, detail: `${f.testsTaken} of 5 mock tests` },
    { key: "projects", label: "Projects", points: Math.min(f.projects, 3) * 5, max: 15, detail: `${f.projects} of 3 projects` },
    { key: "internships", label: "Internships", points: Math.min(f.internships, 2) * 7.5, max: 15, detail: `${f.internships} of 2 internships` },
    { key: "skills", label: "Skills", points: Math.min(f.skills, 8) * 1.25, max: 10, detail: `${f.skills} of 8 skills` }
  ].map((part) => ({ ...part, points: round1(part.points) }));

  const penalty = Math.min(f.backlogs * 5, 20);
  const score = clamp(parts.reduce((sum, part) => sum + part.points, 0) - penalty);

  const weak = parts.filter((part) => part.points < part.max * 0.5).sort((a, b) => (b.max - b.points) - (a.max - a.points));
  const strong = parts.filter((part) => part.points >= part.max * 0.75).map((part) => part.label);

  return {
    score,
    category: score >= 75 ? "Placement ready" : score >= 55 ? "Nearly ready" : "Needs focused preparation",
    breakdown: parts,
    backlogPenalty: penalty,
    strengths: strong,
    weaknesses: weak.map((part) => part.label),
    recommendation: weak.length
      ? `Biggest gains: ${weak.slice(0, 2).map((part) => part.label.toLowerCase()).join(" and ")}.`
      : "Keep momentum with timed mock tests and company-specific interview practice."
  };
}
