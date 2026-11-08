import { getDocumentProxy } from "unpdf";

// The bundled pdf.js calls Math.sumPrecise, which Node 22 does not have yet. Without it every PDF
// logs a "TypeError: Math.sumPrecise is not a function" warning. A plain sum is fine for text layout.
if (typeof (Math as any).sumPrecise !== "function") {
  (Math as any).sumPrecise = (values: Iterable<number>) => {
    let total = 0;
    for (const value of values) total += value;
    return total;
  };
}

/**
 * Extracts raw textual layout from an incoming PDF document binary stream buffer.
 */
export async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
  try {
    const pdfProxy = await getDocumentProxy(new Uint8Array(fileBuffer));
    let extractedText = "";
    for (let i = 1; i <= pdfProxy.numPages; i++) {
      const page = await pdfProxy.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || "")
        .join(" ");
      extractedText += pageText + "\n";
    }
    return extractedText || "";
  } catch (error) {
    throw new Error("Failed to properly read or decode the uploaded PDF document structure.");
  }
}