import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { z } from "zod";
import { db } from "./db.js";
import { extractText } from "./services/extract.js";
import { analyzeDocuments } from "./services/analyze.js";
import type { DocumentRecord } from "./types.js";

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));
const uploadDir = path.resolve("uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const maxMb = Number(process.env.MAX_FILE_MB || 10);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({
  storage, limits: { fileSize: maxMb * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, [".pdf", ".txt", ".csv"].includes(ext));
  }
});
const getDocuments = (ids?: string[]) => {
  const rows = db.prepare("SELECT * FROM documents ORDER BY uploadedAt DESC").all() as DocumentRecord[];
  return ids?.length ? rows.filter(d => ids.includes(d.id)) : rows;
};
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "banking-workbench-api" }));
app.get("/api/documents", (_req, res) => {
  const docs = getDocuments().map(({ extractedText, ...d }) => ({ ...d, preview: extractedText.slice(0, 180) }));
  res.json(docs);
});
app.post("/api/documents", upload.array("files", 10), async (req, res) => {
  const files = (req.files || []) as Express.Multer.File[];
  if (!files.length) return res.status(400).json({ error: "Choose at least one PDF, TXT or CSV file." });
  const saved = [];
  for (const file of files) {
    const id = crypto.randomUUID();
    let extractedText = "", status: "processed" | "unreadable" = "processed";
    try {
      extractedText = await extractText(file.path, file.mimetype, file.originalname);
      if (!extractedText) status = "unreadable";
    } catch (error) {
      status = "unreadable";
      extractedText = `Extraction error: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
    const record: DocumentRecord = { id, originalName: path.basename(file.originalname), mimeType: file.mimetype, size: file.size, extractedText, status, uploadedAt: new Date().toISOString() };
    db.prepare("INSERT INTO documents VALUES (@id,@originalName,@mimeType,@size,@extractedText,@status,@uploadedAt)").run(record);
    saved.push({ ...record, extractedText: undefined });
  }
  res.status(201).json({ documents: saved });
});
app.delete("/api/documents/:id", (req, res) => {
  const result = db.prepare("DELETE FROM documents WHERE id = ?").run(req.params.id);
  res.json({ deleted: result.changes > 0 });
});
app.post("/api/analyze", async (req, res) => {
  const schema = z.object({ instruction: z.string().trim().min(5).max(2000), documentIds: z.array(z.string()).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Provide an analysis instruction of 5–2000 characters." });
  const docs = getDocuments(parsed.data.documentIds);
  if (!docs.length) return res.status(400).json({ error: "Upload at least one readable document first." });
  try {
    const result = await analyzeDocuments(docs, parsed.data.instruction);
    const id = crypto.randomUUID(), createdAt = new Date().toISOString();
    db.prepare("INSERT INTO reports VALUES (?, ?, ?, ?)").run(id, parsed.data.instruction, JSON.stringify(result), createdAt);
    res.json({ id, createdAt, result });
  } catch (error) {
    res.status(502).json({ error: `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}` });
  }
});
app.get("/api/reports/:id", (req, res) => {
  const report = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id) as { id: string; instruction: string; resultJson: string; createdAt: string } | undefined;
  if (!report) return res.status(404).json({ error: "Report not found." });
  res.json({ ...report, result: JSON.parse(report.resultJson) });
});
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err?.code === "LIMIT_FILE_SIZE" ? `File exceeds ${maxMb} MB limit.` : err?.message || "Unexpected server error.";
  res.status(400).json({ error: message });
});
const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API ready at http://localhost:${port}`));
