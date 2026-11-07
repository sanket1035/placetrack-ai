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
  it("produces a bounded, explainable score", () => {
    const result = predictReadiness({ cgpa: 8.4, aptitudeAccuracy: 76, codingScore: 82, communicationScore: 70, projects: 3, internships: 1, mockTests: 6, backlogs: 0 });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.category).toBeTruthy();
  });
});

describe("resume analyzer", () => {
  it("refuses a one-line keyword dump instead of scoring it highly", () => {
    expect(() => analyzeResumeText("Aarav aarav@example.com +91 9876543210 Education Skills JavaScript TypeScript React Node.js SQL Projects Experience Improved API speed by 35% for 1000 users Achievements")).toThrow(/readable words/);
  });
});
