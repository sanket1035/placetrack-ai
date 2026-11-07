/**
 * Deterministic, explainable resume scoring.
 *
 * The score is the sum of seven categories, each measured from what is actually in the text.
 * Nothing here is random and nothing defaults to a high value: an empty or irrelevant document
 * scores near zero, and a score of 100 is not reachable by keyword stuffing.
 */

export type ResumeCategory = {
  key: string;
  label: string;
  score: number;
  max: number;
  note: string;
};

export type ResumeAnalysis = {
  score: number;
  grade: "Strong" | "Good" | "Needs work" | "Weak";
  categories: ResumeCategory[];
  skills: string[];
  missingSkills: string[];
  sectionHits: string[];
  weakSections: string[];
  suggestions: string[];
  contactComplete: boolean;
  wordCount: number;
  warnings: string[];
};

export class ResumeTextError extends Error {}

const SKILLS: Record<string, string[]> = {
  Languages: ["javascript", "typescript", "python", "java", "c++", "c#", "c", "go", "rust", "kotlin", "swift", "php", "ruby", "r", "dart", "scala", "bash"],
  Web: ["html", "css", "react", "next.js", "angular", "vue", "node.js", "express", "django", "flask", "spring boot", "tailwind", "bootstrap", "redux", "rest api", "graphql", "flutter"],
  Data: ["sql", "mysql", "postgresql", "mongodb", "redis", "firebase", "pandas", "numpy", "power bi", "tableau", "excel", "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "nlp"],
  Tools: ["git", "github", "docker", "kubernetes", "aws", "azure", "gcp", "linux", "jenkins", "ci/cd", "postman", "figma", "jira"],
  CS: ["data structures", "algorithms", "oop", "dbms", "operating systems", "computer networks", "system design"],
  Soft: ["communication", "teamwork", "leadership", "problem solving"]
};

const ALL_SKILLS = Object.values(SKILLS).flat();

const SECTION_PATTERNS: Record<string, RegExp> = {
  education: /\b(education|academic|qualification)s?\b/i,
  experience: /\b(experience|internship|work history|employment)s?\b/i,
  projects: /\b(projects?|personal projects?|academic projects?)\b/i,
  skills: /\b(skills?|technical skills?|technologies|tech stack)\b/i,
  certifications: /\b(certifications?|certificates?|courses?|licen[cs]es?)\b/i,
  achievements: /\b(achievements?|awards?|honou?rs?|accomplishments?|extracurricular|positions? of responsibility)\b/i
};

const ACTION_VERBS = [
  "built", "developed", "designed", "implemented", "created", "led", "optimi[sz]ed", "deployed", "integrated",
  "automated", "improved", "reduced", "increased", "launched", "architected", "analy[sz]ed", "managed", "organi[sz]ed", "engineered"
];

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasTerm(text: string, term: string) {
  // Word-boundary match so "java" does not match "javascript" and "c" does not match every word.
  const pattern = term.length === 1 || /[+#]/.test(term)
    ? new RegExp(`(?<![a-z0-9+#])${escapeRegex(term)}(?![a-z0-9+#])`, "i")
    : new RegExp(`(?<![a-z0-9])${escapeRegex(term)}(?![a-z0-9])`, "i");
  return pattern.test(text);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function words(text: string) {
  return text.split(/\s+/).filter((word) => /[a-z0-9]/i.test(word));
}

/** Returns the text that follows a section heading, up to the next heading. */
function sectionBody(text: string, key: string): string {
  const lines = text.split(/\r?\n/);
  const headingPattern = SECTION_PATTERNS[key];
  const anyHeading = Object.values(SECTION_PATTERNS);
  let start = -1;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (line.length > 0 && line.length <= 40 && headingPattern.test(line)) { start = index + 1; break; }
  }
  if (start === -1) return "";
  const body: string[] = [];
  for (let index = start; index < lines.length; index++) {
    const line = lines[index].trim();
    if (line.length > 0 && line.length <= 40 && anyHeading.some((pattern) => pattern.test(line)) && !headingPattern.test(line)) break;
    body.push(lines[index]);
  }
  return body.join("\n");
}

export function analyzeResume(rawText: string, options: { targetSkills?: string[] } = {}): ResumeAnalysis {
  const text = rawText.replace(/\u0000/g, " ").trim();
  const wordCount = words(text).length;
  if (wordCount < 40) {
    throw new ResumeTextError(`The resume has only ${wordCount} readable words. Upload a text-based PDF, DOCX or TXT with your full resume.`);
  }

  const warnings: string[] = [];
  const lower = text.toLowerCase();
  const hasEmail = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text);
  const hasPhone = /(?<!\d)(?:\+?\d{1,3}[\s-]?)?(?:\d{10}|\d{5}[\s-]\d{5}|\d{3}[\s-]\d{3}[\s-]\d{4})(?!\d)/.test(text);
  const hasLink = /(github\.com|linkedin\.com|portfolio|gitlab\.com)/i.test(text);

  const sectionHits = Object.keys(SECTION_PATTERNS).filter((key) => SECTION_PATTERNS[key].test(text));
  const skills = ALL_SKILLS.filter((skill) => hasTerm(lower, skill));
  const techSkills = skills.filter((skill) => !SKILLS.Soft.includes(skill));

  if (sectionHits.length <= 1 && !hasEmail) {
    warnings.push("This does not look like a resume (no standard sections or contact details were found).");
  }
  if (wordCount > 1400) warnings.push("The resume is very long; keep it to one or two pages.");

  // 1. Contact (10)
  const contactScore = (hasEmail ? 4 : 0) + (hasPhone ? 3 : 0) + (hasLink ? 3 : 0);
  const contactNote = [!hasEmail && "email", !hasPhone && "phone number", !hasLink && "GitHub/LinkedIn link"].filter(Boolean).join(", ");

  // 2. Education (15)
  const degree = /\b(b\.?\s?tech|b\.?\s?e\b|bachelor|m\.?\s?tech|m\.?\s?e\b|mca|bca|b\.?\s?sc|diploma|engineering)\b/i.test(text);
  const institute = /\b(university|college|institute|school|iit|nit|vit)\b/i.test(text);
  const grade = /\b(?:cgpa|gpa)\b[^\n]{0,15}\d/i.test(text) || /\b\d(?:\.\d{1,2})?\s*\/\s*10\b/.test(text) || /\b\d{2}(?:\.\d+)?\s*%/.test(text);
  const year = /\b(19|20)\d{2}\b/.test(text);
  const educationScore = (SECTION_PATTERNS.education.test(text) ? 3 : 0) + (degree ? 4 : 0) + (institute ? 3 : 0) + (grade ? 3 : 0) + (year ? 2 : 0);

  // 3. Skills (20): breadth of real technical skills, with diminishing returns
  const skillsScore = clamp(Math.round(Math.min(techSkills.length, 12) / 12 * 16) + (SECTION_PATTERNS.skills.test(text) ? 2 : 0) + (skills.some((skill) => SKILLS.Soft.includes(skill)) ? 2 : 0), 0, 20);

  // 4. Projects (20)
  const projectBody = sectionBody(text, "projects");
  const projectBullets = (projectBody.match(/^\s*[-•*▪●◦‣]\s+\S+/gm) ?? []).length;
  const projectLines = projectBody.split(/\r?\n/).filter((line) => line.trim().length > 25).length;
  const projectDepth = Math.max(projectBullets, projectLines);
  const projectTech = techSkills.filter((skill) => hasTerm(projectBody.toLowerCase(), skill)).length;
  const projectsScore = projectBody
    ? clamp(5 + Math.min(projectDepth, 8) * 1.2 + Math.min(projectTech, 5) * 0.8 + (/(github\.com|live|deployed|demo)/i.test(projectBody) ? 2 : 0), 0, 20)
    : SECTION_PATTERNS.projects.test(text) ? 4 : 0;

  // 5. Experience (15): internships, work, with dates
  const experienceBody = sectionBody(text, "experience");
  const dateRanges = (text.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\s*[-–—to]+\s*(?:present|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4})|\b\d{4}\s*[-–—]\s*(?:\d{4}|present)\b/gi) ?? []).length;
  const experienceMentions = (lower.match(/\b(intern(ship)?|trainee|freelanc|part-time|full-time|developer at|engineer at|worked)\b/g) ?? []).length;
  const experienceScore = clamp(
    (experienceBody ? 4 : 0) + Math.min(experienceMentions, 3) * 2 + Math.min(dateRanges, 3) * 1.5 + (experienceBody.split(/\r?\n/).filter((line) => line.trim().length > 25).length >= 3 ? 2 : 0),
    0, 15
  );

  // 6. Certifications & achievements (10)
  const certHits = (lower.match(/\b(certified|certification|certificate|nptel|coursera|udemy|hackerrank|leetcode|codeforces|hackathon|winner|rank|scholarship|award)\b/g) ?? []).length;
  const extraScore = clamp(Math.min(certHits, 5) * 1.6 + (SECTION_PATTERNS.certifications.test(text) || SECTION_PATTERNS.achievements.test(text) ? 2 : 0), 0, 10);

  // 7. Impact & writing quality (10)
  const quantified = (text.match(/\b\d+(?:\.\d+)?\s?%|\b\d+\+?\s*(?:users|projects|clients|students|requests|ms|api|endpoints|records|downloads|stars|members|teams?)\b|\$\s?\d+|₹\s?\d+/gi) ?? []).length;
  const verbHits = new Set(ACTION_VERBS.filter((verb) => new RegExp(`\\b${verb}`, "i").test(text))).size;
  const impactScore = clamp(Math.min(quantified, 4) * 1.5 + Math.min(verbHits, 6) * 0.7, 0, 10);

  const categories: ResumeCategory[] = [
    { key: "contact", label: "Contact & links", score: contactScore, max: 10, note: contactNote ? `Missing: ${contactNote}.` : "Complete." },
    { key: "education", label: "Education", score: educationScore, max: 15, note: educationScore >= 11 ? "Clear degree, institute and grades." : "Add degree, institute, year and CGPA." },
    { key: "skills", label: "Technical skills", score: skillsScore, max: 20, note: `${techSkills.length} technical skills detected.` },
    { key: "projects", label: "Projects", score: Math.round(projectsScore), max: 20, note: projectBody ? `${projectDepth} project detail lines found.` : "No Projects section with details found." },
    { key: "experience", label: "Experience", score: Math.round(experienceScore), max: 15, note: experienceBody ? "Experience section found." : "No Experience or internship section found." },
    { key: "extras", label: "Certifications & achievements", score: Math.round(extraScore), max: 10, note: certHits ? `${certHits} supporting items found.` : "No certifications or achievements found." },
    { key: "impact", label: "Impact & writing", score: Math.round(impactScore), max: 10, note: `${quantified} measurable results, ${verbHits} action verbs.` }
  ];

  let total = Math.round(categories.reduce((sum, item) => sum + item.score, 0));
  // Documents that do not look like resumes cannot score well no matter how many keywords they contain.
  if (warnings.some((warning) => warning.startsWith("This does not look like a resume"))) total = Math.min(total, 25);
  total = clamp(total, 0, 98);

  const weakSections = categories.filter((item) => item.score / item.max < 0.5).map((item) => item.label);
  const target = options.targetSkills?.length ? options.targetSkills.map((skill) => skill.toLowerCase()) : ["git", "sql", "data structures", "algorithms", "python", "java", "react", "node.js", "docker", "aws", "communication"];
  const missingSkills = target.filter((skill) => !hasTerm(lower, skill)).slice(0, 8);

  const suggestions: string[] = [];
  if (!hasEmail || !hasPhone) suggestions.push("Add a working email and phone number at the top.");
  if (!hasLink) suggestions.push("Add your GitHub and LinkedIn links.");
  if (educationScore < 11) suggestions.push("Show degree, college, graduation year and CGPA in the Education section.");
  if (techSkills.length < 6) suggestions.push("List more technical skills you can back up with projects (languages, frameworks, databases, tools).");
  if (projectsScore < 12) suggestions.push("Add 2 to 3 projects with the problem, your role, the stack and a result for each.");
  if (experienceScore < 6) suggestions.push("Add internships, freelance work or open-source contributions, with dates.");
  if (extraScore < 4) suggestions.push("Add certifications, hackathons, coding-platform ranks or awards.");
  if (quantified < 2) suggestions.push("Quantify impact with numbers (users, % improvement, response time, scale).");
  if (verbHits < 4) suggestions.push("Start bullet points with action verbs such as built, designed, optimised, deployed.");
  if (missingSkills.length) suggestions.push(`Commonly asked skills not found: ${missingSkills.slice(0, 5).join(", ")}. Add them only if you actually have them.`);

  return {
    score: total,
    grade: total >= 75 ? "Strong" : total >= 55 ? "Good" : total >= 35 ? "Needs work" : "Weak",
    categories,
    skills,
    missingSkills,
    sectionHits,
    weakSections,
    suggestions: suggestions.slice(0, 8),
    contactComplete: hasEmail && hasPhone,
    wordCount,
    warnings
  };
}
