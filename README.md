# Banking Intelligence Workbench

A local full-stack prototype for multi-document banking review. It ingests PDF, TXT and CSV files, keeps document identity, extracts text, and generates a structured report with evidence references.

## Architecture
- `client/`: React + TypeScript + Vite dashboard.
- `server/`: Express + TypeScript REST API.
- `server/src/services/extract.ts`: file-type-specific extraction (PDF via `pdf-parse`, TXT/CSV as UTF-8).
- `server/src/services/analyze.ts`: deterministic mock analysis by default; optional OpenAI-compatible chat completion call.
- `server/src/db.ts`: SQLite persistence for uploaded document metadata and reports.
- Every finding contains source document names and evidence snippets where available.

## Requirements
Node.js 20+ and npm. No external database service is required.

## Run locally
1. Unzip the project.
2. Open a terminal in `banking-intelligence-workbench`.
3. Install dependencies:
   ```bash
   npm run install:all
   ```
4. Copy `.env.example` to `server/.env` (optional). To use mock mode, no key is needed.
5. Start both apps:
   ```bash
   npm run dev
   ```
6. Open http://localhost:5173. The API runs at http://localhost:4000.

If you want a real LLM, set `LLM_PROVIDER=openai` and `OPENAI_API_KEY` in `server/.env`. The prototype sends extracted text and the user's instruction to the configured model. Do not use real customer data.

## API
- `GET /api/health`
- `GET /api/documents`
- `POST /api/documents` (multipart field `files`, multiple files)
- `DELETE /api/documents/:id`
- `POST /api/analyze` with `{ "instruction": "...", "documentIds": ["..."] }`
- `GET /api/reports/:id`

## Data model
- `documents`: id, original name, MIME type, byte size, extracted text, status, upload timestamp.
- `reports`: id, instruction, structured JSON result, creation timestamp.

## What works
- Multiple PDF/TXT/CSV uploads.
- Per-file validation and graceful extraction errors.
- Document list with file identity and extraction status.
- Individual and cross-document analysis.
- Structured findings, source references, missing-information notes and summary.
- Copy report as JSON.
- Synthetic sample files under `sample-documents/`.

## Mock AI behavior
Mock mode is intentionally transparent and deterministic. It extracts common labels (name, address, monthly income, salary credit, account balance) and compares values across documents. It is suitable for demonstrating the workflow, not for making lending decisions. The optional OpenAI mode is an LLM interpretation layer and must not be treated as a source of verified facts.

## Security considerations
- Uses synthetic data only.
- Upload size and file extensions are restricted.
- Uploaded files are stored locally in a private server directory and are not served as static assets.
- This is a prototype: add authentication, authorization, malware scanning, encryption at rest/in transit, audit logs, retention/deletion policies, secrets management, rate limits and a private deployment before production.
- Do not expose this server publicly or upload real PAN/Aadhaar/bank data.

## Known limitations
- OCR for scanned/image-only PDFs is not included; scanned documents are marked as potentially unreadable.
- Extraction is text-based and label heuristics are intentionally basic.
- Mock analysis is not a substitute for a banking-grade verification engine.
- No user accounts, role-based access or production audit trail.
- OpenAI mode transmits extracted document text to the provider; use only approved synthetic data in this demo.

## AI tool and implementation disclosure
Complete this section honestly after the assessment. Example:
- AI development tools used: [list tools actually used].
- Decisions made independently: [describe architecture, validation, schema, traceability and testing decisions you personally made].
- Shortcuts/limitations: [describe mock analysis, heuristic extraction, absent OCR/authentication].

## Testing
Run:
```bash
npm test
```
