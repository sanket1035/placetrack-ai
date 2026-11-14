import ExcelJS from "exceljs";

export const STUDENT_TEMPLATE_HEADERS = ["name", "email", "branch", "cgpa", "graduationYear", "backlogs", "skills"];

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object") {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if ("richText" in value) return value.richText.map((part) => part.text).join("").trim();
    if ("result" in value && value.result != null) return String(value.result).trim();
    if ("text" in value) return String(value.text).trim();
    return "";
  }
  return String(value).trim();
}

/** Reads the first sheet of an .xlsx file into rows of trimmed strings (all columns). */
export async function readXlsxRows(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const width = sheet.actualColumnCount || STUDENT_TEMPLATE_HEADERS.length;
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values: string[] = [];
    for (let c = 1; c <= width; c++) values.push(cellText(row.getCell(c).value));
    rows.push(values);
  });
  return rows;
}

/** Normalises a header so "Graduation Year", "graduation_year" and "graduationYear" all match. */
export const normHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function buildStudentTemplate(department: string | null): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Students");
  sheet.addRow(STUDENT_TEMPLATE_HEADERS).font = { bold: true };
  sheet.addRow(["Asha Patil", "asha.patil@kkwagh.edu.in", department ?? "Computer Engineering", 8.2, 2027, 0, "Java, SQL"]);
  sheet.columns = [{ width: 24 }, { width: 34 }, { width: 34 }, { width: 8 }, { width: 16 }, { width: 10 }, { width: 30 }];
  const notes = workbook.addWorksheet("Instructions");
  notes.addRow(["Fill the Students sheet, one student per row, and keep the header row."]);
  notes.addRow(["Required: name, email, cgpa, graduationYear. branch is required for admins; coordinators can leave it empty (their own department is used)."]);
  notes.addRow(["Optional: backlogs (default 0), skills (comma separated)."]);
  notes.addRow(["Emails that are already registered are skipped and reported."]);
  notes.getColumn(1).width = 120;
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
