import fs from "node:fs/promises";
import pdf from "pdf-parse";

export async function extractText(filePath: string, mimeType: string, originalName: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const ext = originalName.toLowerCase().split(".").pop();
  if (ext === "pdf" || mimeType === "application/pdf") {
    const parsed = await pdf(buffer);
    return (parsed.text || "").trim();
  }
  if (ext === "txt" || ext === "csv" || mimeType.startsWith("text/")) {
    return buffer.toString("utf8").replace(/\u0000/g, "").trim();
  }
  throw new Error("Unsupported file type. Upload PDF, TXT or CSV.");
}
