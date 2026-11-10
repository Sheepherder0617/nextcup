import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function extractResumeText(file: File): Promise<string> {
  if (/\.(txt|md)$/i.test(file.name) || file.type.startsWith("text/")) {
    return (await file.text()).slice(0, 20000);
  }
  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
    throw new Error("Choose a PDF, .txt, or .md file.");
  }

  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => "str" in item ? item.str : "").join(" "));
  }

  const text = pages.join("\n").replace(/\s+/g, " ").trim().slice(0, 20000);
  if (!text) throw new Error("No selectable text found. Scanned PDFs need OCR before uploading.");
  return text;
}