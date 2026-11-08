import { buildTemplate, parseCsv, parseQuestionRows, readRows } from "../src/services/testImport.js";

describe("mock test import", () => {
  it("the downloadable template parses with no errors", async () => {
    const rows = await readRows(await buildTemplate(), "mock-test-template.xlsx");
    const result = parseQuestionRows(rows);
    expect(result.errors).toEqual([]);
    expect(result.questions).toHaveLength(3);
    expect(result.questions[0].correctAnswer).toBe(1);
    expect(result.sectionConfig).toEqual({ Quantitative: 1, Logical: 1, Verbal: 1 });
  });

  it("reads quoted CSV cells with commas and accepts 1-4 or option text as the answer", () => {
    const csv = 'Section,Question,Option A,Option B,Option C,Option D,Correct\r\nLogical,"Pick, the odd one",a1,b1,c1,d1,3\r\nVerbal,Choose the noun here,x,y,z,w,y\r\n';
    const result = parseQuestionRows(parseCsv(csv));
    expect(result.errors).toEqual([]);
    expect(result.questions[0].questionText).toBe("Pick, the odd one");
    expect(result.questions.map((q: { correctAnswer: number }) => q.correctAnswer)).toEqual([2, 1]);
  });

  it("reports row-level problems and missing columns", () => {
    const bad = parseQuestionRows(parseCsv("Section,Question,Option A,Option B,Option C,Option D,Correct\nLogical,Short?,a,b,,d,Z\n"));
    expect(bad.questions).toHaveLength(0);
    expect(bad.errors[0]).toMatch(/Row 2/);
    expect(bad.errors[0]).toMatch(/Option C is empty/);
    expect(bad.errors[0]).toMatch(/must be A, B, C or D/);
    expect(parseQuestionRows(parseCsv("Question,Correct\nfoo,A\n")).errors[0]).toMatch(/Missing column/);
  });
});
