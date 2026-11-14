export type DocumentRecord = {
  id: string; originalName: string; mimeType: string; size: number;
  extractedText: string; status: "processed" | "unreadable"; uploadedAt: string;
};
export type Finding = {
  category: "verified" | "discrepancy" | "missing" | "interpretation";
  title: string; detail: string; sources: { documentId: string; documentName: string; evidence?: string }[];
  severity: "low" | "medium" | "high";
};
export type AnalysisResult = {
  executiveSummary: string; findings: Finding[]; extractedData: Record<string, { value: string; sources: string[] }[]>;
  missingInformation: string[]; disclaimer: string;
};
