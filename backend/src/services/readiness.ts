/**
 * Input features required to compute a student's placement readiness score.
 *
 * @example
 * ```typescript
 * const features: ReadinessFeatures = {
 *   cgpa: 8.5,
 *   aptitudeAccuracy: 80,
 *   codingScore: 75,
 *   communicationScore: 85,
 *   projects: 3,
 *   internships: 1,
 *   mockTests: 5,
 *   backlogs: 0
 * };
 * ```
 */
export interface ReadinessFeatures {
  /** Cumulative Grade Point Average (0.0 to 10.0 scale). Contributes 22% to total score. */
  cgpa: number;
  /** Percentage accuracy score achieved across aptitude tests (0 to 100). Contributes 18% to total score. */
  aptitudeAccuracy: number;
  /** Algorithmic problem solving and coding assessment score (0 to 100). Contributes 22% to total score. */
  codingScore: number;
  /** Soft skills and interview communication score (0 to 100). Contributes 15% to total score. */
  communicationScore: number;
  /** Number of completed software / engineering projects (capped at 4). Adds 4 pts per project (max 16 pts). */
  projects: number;
  /** Number of completed industry internships (capped at 2). Adds 5 pts per internship (max 10 pts). */
  internships: number;
  /** Number of completed practice mock tests (capped at 10). Adds 1.2 pts per test (max 12 pts). */
  mockTests: number;
  /** Count of active uncleared backlogs. Deducts 7 pts per active backlog. */
  backlogs: number;
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

/**
 * Calculates a student's composite Placement Readiness Score (0–100), categorizes readiness level,
 * identifies strengths & weaknesses, and generates targeted improvement recommendations.
 *
 * ### Scoring Formula Breakdown:
 * - **CGPA**: `(cgpa / 10) * 22` (Max 22 pts)
 * - **Aptitude Accuracy**: `aptitudeAccuracy * 0.18` (Max 18 pts)
 * - **Coding Score**: `codingScore * 0.22` (Max 22 pts)
 * - **Communication**: `communicationScore * 0.15` (Max 15 pts)
 * - **Projects**: `Math.min(projects, 4) * 4` (Max 16 pts)
 * - **Internships**: `Math.min(internships, 2) * 5` (Max 10 pts)
 * - **Mock Tests**: `Math.min(mockTests, 10) * 1.2` (Max 12 pts)
 * - **Backlogs Penalty**: `- (backlogs * 7)`
 *
 * ### Score Categories:
 * - `80+`: **"Placement ready"**
 * - `65 - 79`: **"Nearly ready"**
 * - `< 65`: **"Needs focused preparation"**
 *
 * @param features - Student performance metrics and experience counts
 * @returns Object containing numerical score, category label, strengths, weaknesses, and tailored recommendation string
 *
 * @example
 * ```typescript
 * const readiness = predictReadiness({
 *   cgpa: 8.2,
 *   aptitudeAccuracy: 78,
 *   codingScore: 85,
 *   communicationScore: 60,
 *   projects: 2,
 *   internships: 1,
 *   mockTests: 4,
 *   backlogs: 0
 * });
 * console.log(readiness.score);          // 78
 * console.log(readiness.category);       // "Nearly ready"
 * console.log(readiness.recommendation); // "Prioritize Communication for the next two weeks."
 * ```
 */
export function predictReadiness(features: ReadinessFeatures) {
  const score = clamp(
    (features.cgpa / 10) * 22 +
    features.aptitudeAccuracy * 0.18 +
    features.codingScore * 0.22 +
    features.communicationScore * 0.15 +
    Math.min(features.projects, 4) * 4 +
    Math.min(features.internships, 2) * 5 +
    Math.min(features.mockTests, 10) * 1.2 -
    features.backlogs * 7
  );

  const metrics = [
    ["CGPA", features.cgpa * 10],
    ["Aptitude", features.aptitudeAccuracy],
    ["Coding", features.codingScore],
    ["Communication", features.communicationScore]
  ] as const;
  const strengths = metrics.filter(([, value]) => value >= 75).map(([name]) => name);
  const weaknesses = metrics.filter(([, value]) => value < 65).map(([name]) => name);

  return {
    score,
    category: score >= 80 ? "Placement ready" : score >= 65 ? "Nearly ready" : "Needs focused preparation",
    strengths,
    weaknesses,
    recommendation: weaknesses.length
      ? `Prioritize ${weaknesses.slice(0, 2).join(" and ")} for the next two weeks.`
      : "Keep momentum with timed mocks and company-specific interview practice."
  };
}
