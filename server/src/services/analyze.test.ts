import test from "node:test";
import assert from "node:assert/strict";
import { mockAnalyze } from "./analyze.js";
import type { DocumentRecord } from "../types.js";

test("flags a name mismatch and retains source document names", () => {
  const docs: DocumentRecord[] = [
    { id: "1", originalName: "Loan Application Form.txt", mimeType: "text/plain", size: 20, extractedText: "Applicant Name: Asha Sharma", status: "processed", uploadedAt: "now" },
    { id: "2", originalName: "PAN.txt", mimeType: "text/plain", size: 20, extractedText: "Name: Asha Verma", status: "processed", uploadedAt: "now" }
  ];
  const result = mockAnalyze(docs, "Compare names");
  const mismatch = result.findings.find(f => f.category === "discrepancy");
  assert.ok(mismatch);
  assert.match(mismatch!.detail, /Asha Sharma/);
  assert.deepEqual(mismatch!.sources.map(s => s.documentName), ["Loan Application Form.txt", "PAN.txt"]);
});
