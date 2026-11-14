import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
const dataDir = path.resolve("data");
fs.mkdirSync(dataDir, { recursive: true });
export const db = new Database(path.join(dataDir, "workbench.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS documents (
 id TEXT PRIMARY KEY, originalName TEXT NOT NULL, mimeType TEXT NOT NULL, size INTEGER NOT NULL,
 extractedText TEXT NOT NULL, status TEXT NOT NULL, uploadedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reports (
 id TEXT PRIMARY KEY, instruction TEXT NOT NULL, resultJson TEXT NOT NULL, createdAt TEXT NOT NULL
);`);
