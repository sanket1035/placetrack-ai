import ExcelJS from "exceljs";

export const MAX_QUESTIONS = 300;
export const TEMPLATE_HEADERS = ["Section", "Question", "Option A", "Option B", "Option C", "Option D", "Correct", "Explanation"];

export interface ParsedQuestion {
  section: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface ImportResult {
  questions: ParsedQuestion[];
  errors: string[];
  sectionConfig: Record<string, number>;
}

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Minimal RFC-4180 CSV reader (quotes, escaped quotes, newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((part) => part.text).join("").trim();
    if ("result" in value && value.result != null) return String(value.result).trim();
    if ("text" in value) return String(value.text).trim();
    return "";
  }
  return String(value).trim();
}

export async function readRows(buffer: Buffer, filename: string): Promise<string[][]> {
  if (/\.csv$/i.test(filename)) return parseCsv(buffer.toString("utf8"));
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values: string[] = [];
    for (let c = 1; c <= TEMPLATE_HEADERS.length; c++) values.push(cellText(row.getCell(c).value));
    rows.push(values);
  });
  return rows;
}

const HEADER_KEYS: Record<string, number> = {
  section: 0, topic: 0, category: 0,
  question: 1, questiontext: 1,
  optiona: 2, a: 2, optionb: 3, b: 3, optionc: 4, c: 4, optiond: 5, d: 5,
  correct: 6, answer: 6, correctanswer: 6, correctoption: 6,
  explanation: 7, solution: 7
};

export function parseQuestionRows(rows: string[][]): ImportResult {
  const errors: string[] = [];
  const questions: ParsedQuestion[] = [];
  const nonEmpty = rows.filter((row) => row.some((cell) => cell.trim()));
  if (nonEmpty.length === 0) return { questions, errors: ["The file is empty."], sectionConfig: {} };

  // Map columns by header name so the column order in the file does not matter.
  const header = nonEmpty[0].map((cell) => norm(cell));
  const col: number[] = new Array(TEMPLATE_HEADERS.length).fill(-1);
  header.forEach((name, index) => {
    const target = HEADER_KEYS[name];
    if (target !== undefined && col[target] === -1) col[target] = index;
  });
  const missing = [0, 1, 2, 3, 4, 5, 6].filter((i) => col[i] === -1).map((i) => TEMPLATE_HEADERS[i]);
  if (missing.length) {
    return { questions, errors: [`Missing column(s): ${missing.join(", ")}. Download the template and keep its header row.`], sectionConfig: {} };
  }

  const get = (row: string[], target: number) => (col[target] >= 0 ? (row[col[target]] ?? "").trim() : "");
  const dataRows = nonEmpty.slice(1);
  if (dataRows.length > MAX_QUESTIONS) errors.push(`A test can have at most ${MAX_QUESTIONS} questions (file has ${dataRows.length}).`);

  dataRows.slice(0, MAX_QUESTIONS).forEach((row, index) => {
    const line = index + 2; // header is line 1
    const problems: string[] = [];
    const section = get(row, 0);
    const questionText = get(row, 1);
    const options = [2, 3, 4, 5].map((i) => get(row, i));
    const correctRaw = get(row, 6);
    if (!section) problems.push("Section is empty");
    if (questionText.length < 5) problems.push("Question is empty or too short");
    options.forEach((option, i) => { if (!option) problems.push(`Option ${"ABCD"[i]} is empty`); });
    if (new Set(options.map((o) => o.toLowerCase())).size < options.filter(Boolean).length) problems.push("Two options are identical");

    let correctAnswer = -1;
    const letter = correctRaw.toUpperCase().replace(/^OPTION\s*/, "");
    if (/^[A-D]$/.test(letter)) correctAnswer = letter.charCodeAt(0) - 65;
    else if (/^[1-4]$/.test(correctRaw)) correctAnswer = Number(correctRaw) - 1;
    else if (correctRaw) correctAnswer = options.findIndex((option) => option.toLowerCase() === correctRaw.toLowerCase());
    if (correctAnswer < 0) problems.push(`Correct answer "${correctRaw}" must be A, B, C or D`);

    if (problems.length) errors.push(`Row ${line}: ${problems.join("; ")}.`);
    else questions.push({ section, questionText, options, correctAnswer, explanation: get(row, 7) || "No explanation provided." });
  });

  const sectionConfig: Record<string, number> = {};
  for (const question of questions) sectionConfig[question.section] = (sectionConfig[question.section] ?? 0) + 1;
  return { questions, errors, sectionConfig };
}

export async function buildTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Questions");
  sheet.addRow(TEMPLATE_HEADERS).font = { bold: true };
  sheet.addRow(["Quantitative", "A train 120 m long passes a pole in 6 seconds. What is its speed in km/h?", "60", "72", "80", "90", "B", "Speed = 120/6 = 20 m/s = 72 km/h."]);
  sheet.addRow(["Logical", "Find the next number: 2, 6, 12, 20, ?", "28", "30", "32", "36", "B", "Differences increase by 2: 4, 6, 8, 10."]);
  sheet.addRow(["Verbal", "Choose the synonym of 'Abundant'.", "Scarce", "Plentiful", "Rare", "Tiny", "B", "Abundant means plentiful."]);
  sheet.columns = [{ width: 16 }, { width: 60 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 10 }, { width: 50 }];
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
