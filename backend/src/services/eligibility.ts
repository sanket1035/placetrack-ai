/**
 * Represents a student's academic and skill profile used for placement drive eligibility evaluation.
 *
 * @example
 * ```typescript
 * const student: StudentProfile = {
 *   cgpa: 8.5,
 *   branch: "Computer Engineering",
 *   backlogs: 0,
 *   graduationYear: 2027,
 *   skills: ["Java", "SQL", "React"]
 * };
 * ```
 */
export interface StudentProfile {
  /** Cumulative Grade Point Average of the student (0.0 to 10.0 scale) */
  cgpa: number;
  /** Academic branch or department name (e.g. "Computer Engineering") */
  branch: string;
  /** Number of active uncleared backlogs */
  backlogs: number;
  /** Expected graduation year / target batch (e.g. 2027) */
  graduationYear: number;
  /** Optional list of technical or domain skills declared by the student */
  skills?: string[] | null;
}

/**
 * Defines the criteria set by a hiring company for a placement drive.
 *
 * @example
 * ```typescript
 * const drive: DriveCriteria = {
 *   minCgpa: 7.5,
 *   allowedBranches: ["Computer Engineering", "Information Technology"],
 *   maxBacklogs: 0,
 *   graduationYear: 2027,
 *   role: "Software Development Engineer",
 *   description: "Looking for strong Java and SQL problem solvers."
 * };
 * ```
 */
export interface DriveCriteria {
  /** Minimum CGPA threshold required to apply */
  minCgpa: number;
  /** Array of branch names eligible for the drive */
  allowedBranches: string[];
  /** Maximum number of active backlogs permitted */
  maxBacklogs: number;
  /** Target graduation year / batch for the drive */
  graduationYear: number;
  /** Job role title (e.g. "Software Engineer") used for skill keyword matching */
  role?: string | null;
  /** Detailed job description used for skill keyword matching */
  description?: string | null;
}

/**
 * Evaluates whether a student meets a placement drive's eligibility criteria and calculates a candidate match score.
 *
 * The check performs four validation steps:
 * 1. **CGPA Cutoff**: `student.cgpa >= drive.minCgpa`
 * 2. **Allowed Branch**: `drive.allowedBranches.includes(student.branch)`
 * 3. **Backlog Limit**: `student.backlogs <= drive.maxBacklogs`
 * 4. **Graduation Year**: `student.graduationYear === drive.graduationYear`
 *
 * If any check fails, returns `{ eligible: false, reasons: string[], score: 0 }`.
 *
 * If eligible, calculates a match score (50–100) based on:
 * - Base score: 50
 * - **CGPA Bonus**: Up to +15 pts (`Math.round((cgpa - minCgpa) * 10)`)
 * - **Skill Match Bonus**: Up to +30 pts (+10 pts per matching skill found in role/description)
 * - **Branch Specificity Bonus**: Up to +15 pts for targeted branch drives
 *
 * @param student - The student profile to evaluate
 * @param drive - The drive criteria to check against
 * @returns Object indicating eligibility boolean, array of failure reasons (if any), and fit score (0-100)
 *
 * @example
 * ```typescript
 * const result = checkEligibility(
 *   { cgpa: 8.2, branch: "Computer Engineering", backlogs: 0, graduationYear: 2027, skills: ["Java", "SQL"] },
 *   { minCgpa: 7.5, allowedBranches: ["Computer Engineering"], maxBacklogs: 0, graduationYear: 2027, role: "Java Developer" }
 * );
 * console.log(result.eligible); // true
 * console.log(result.score);    // 77
 * ```
 */
export function checkEligibility(student: StudentProfile, drive: DriveCriteria) {
  const reasons: string[] = [];
  if (student.cgpa < drive.minCgpa) reasons.push(`CGPA must be at least ${drive.minCgpa}`);
  if (!drive.allowedBranches.includes(student.branch)) reasons.push(`${student.branch} is not an allowed branch`);
  if (student.backlogs > drive.maxBacklogs) reasons.push(`Maximum ${drive.maxBacklogs} active backlogs allowed`);
  if (student.graduationYear !== drive.graduationYear) reasons.push(`Drive is for the ${drive.graduationYear} batch`);

  if (reasons.length > 0) {
    return { eligible: false, reasons, score: 0 };
  }

  // Base score for eligible candidates starts at 50
  let score = 50;

  // 1. CGPA performance bonus (up to 15 points)
  const cgpaDiff = student.cgpa - drive.minCgpa;
  const cgpaBonus = Math.max(0, Math.min(15, Math.round(cgpaDiff * 10)));
  score += cgpaBonus;

  // 2. Skill matching bonus (up to 30 points)
  let skillsBonus = 0;
  const studentSkills = student.skills || [];
  const textToMatch = `${drive.role || ""} ${drive.description || ""}`.toLowerCase();

  if (studentSkills.length > 0) {
    let matchedCount = 0;
    studentSkills.forEach((skill) => {
      if (skill && textToMatch.includes(skill.toLowerCase())) {
        matchedCount++;
      }
    });
    skillsBonus = Math.min(30, matchedCount * 10);
  }
  score += skillsBonus;

  // 3. Branch specificity bonus (up to 15 points)
  if (drive.allowedBranches.length <= 2 && drive.allowedBranches.includes(student.branch)) {
    score += 10;
    if (student.branch === "AI & Data Science" && (textToMatch.includes("data science") || textToMatch.includes("ai") || textToMatch.includes("analyst"))) {
      score += 5;
    }
  }

  const finalScore = Math.max(50, Math.min(100, score));

  return { eligible: true, reasons, score: finalScore };
}
