import { analyzeResumeText } from "../src/services/ai.js";
import { checkEligibility } from "../src/services/eligibility.js";
import { predictReadiness } from "../src/services/readiness.js";

describe("eligibility engine", () => {
  const drive = { minCgpa: 7.5, allowedBranches: ["CSE", "IT"], maxBacklogs: 0, graduationYear: 2027 };
  it("accepts a matching student", () => {
    expect(checkEligibility({ cgpa: 8.2, branch: "CSE", backlogs: 0, graduationYear: 2027 }, drive).eligible).toBe(true);
  });
  it("explains all failed criteria", () => {
    const result = checkEligibility({ cgpa: 6, branch: "ME", backlogs: 2, graduationYear: 2026 }, drive);
    expect(result.eligible).toBe(false);
    expect(result.reasons).toHaveLength(4);
  });
});

describe("readiness predictor", () => {
  it("adds up to the documented parts and stays between 0 and 100", () => {
    const result = predictReadiness({ cgpa: 8, aptitudeAccuracy: 80, testsTaken: 5, skills: 8, projects: 3, internships: 2, backlogs: 0 });
    // 24 (CGPA) + 20 (aptitude) + 5 (practice) + 15 (projects) + 15 (internships) + 10 (skills)
    expect(result.score).toBe(89);
    expect(result.breakdown.reduce((sum, part) => sum + part.max, 0)).toBe(100);
    expect(result.category).toBe("Placement ready");
  });

  it("scores only what the student has actually done and penalises backlogs", () => {
    const empty = predictReadiness({ cgpa: 8, aptitudeAccuracy: 0, testsTaken: 0, skills: 0, projects: 0, internships: 0, backlogs: 0 });
    expect(empty.score).toBe(24);
    const withBacklogs = predictReadiness({ cgpa: 8, aptitudeAccuracy: 0, testsTaken: 0, skills: 0, projects: 0, internships: 0, backlogs: 2 });
    expect(withBacklogs.score).toBe(14);
    expect(predictReadiness({ cgpa: 0, aptitudeAccuracy: 0, testsTaken: 0, skills: 0, projects: 0, internships: 0, backlogs: 9 }).score).toBe(0);
  });
});

describe("resume analyzer", () => {
  it("refuses a one-line keyword dump instead of scoring it highly", () => {
    expect(() => analyzeResumeText("Aarav aarav@example.com +91 9876543210 Education Skills JavaScript TypeScript React Node.js SQL Projects Experience Improved API speed by 35% for 1000 users Achievements")).toThrow(/readable words/);
  });
});
