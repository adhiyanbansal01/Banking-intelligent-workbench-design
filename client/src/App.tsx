import { useEffect, useMemo, useState } from "react";
import { UploadCloud, FileText, ShieldCheck, AlertTriangle, Copy, Trash2, Sparkles, CheckCircle2, LoaderCircle } from "lucide-react";

type Doc = { id: string; originalName: string; size: number; status: string; uploadedAt: string; preview?: string };
type Finding = { category: string; title: string; detail: string; severity: string; sources: { documentId: string; documentName: string; evidence?: string }[] };
type Result = { executiveSummary: string; findings: Finding[]; extractedData: Record<string, { value: string; sources: string[] }[]>; missingInformation: string[]; disclaimer: string };
const API = "http://localhost:4000/api";
const starterInstruction = "Verify applicant name and address across all documents. Compare declared monthly income with salary credits in the bank statement. Identify mismatches, missing information and important financial figures. Cite the source document for every finding.";

export default function App() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [instruction, setInstruction] = useState(starterInstruction);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [apiOk, setApiOk] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState("All documents");

  async function refresh() {
    try {
      const [health, list] = await Promise.all([fetch(`${API}/health`), fetch(`${API}/documents`)]);
      setApiOk(health.ok);
      if (list.ok) { const data = await list.json(); setDocs(data); setSelected(data.map((d: Doc) => d.id)); }
    } catch { setApiOk(false); }
  }
  useEffect(() => { refresh(); }, []);
  const stats = useMemo(() => ({ total: docs.length, readable: docs.filter(d => d.status === "processed").length, issues: result?.findings.filter(f => f.category === "discrepancy").length || 0 }), [docs, result]);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setMessage("");
    const body = new FormData();
    Array.from(files).forEach(f => body.append("files", f));
    try {
      const response = await fetch(`${API}/documents`, { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      setMessage(`${data.documents.length} document(s) uploaded.`);
      setResult(null); await refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Upload failed"); }
    finally { setBusy(false); }
  }
  async function analyze() {
    if (instruction.trim().length < 5) { setMessage("Please enter a meaningful instruction."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${API}/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instruction, documentIds: selected }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");
      setResult(data.result); setMessage("Analysis completed.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Analysis failed"); }
    finally { setBusy(false); }
  }
  async function removeDoc(id: string) {
    await fetch(`${API}/documents/${id}`, { method: "DELETE" }); setResult(null); await refresh();
  }
  async function copyReport() {
    if (!result) return;
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setMessage("Structured report copied to clipboard.");
  }
  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-icon"><ShieldCheck size={22}/></div><div><strong>FinSight</strong><span> BANKING INTELLIGENCE WORKBENCH</span></div></div><div className="connection"><i className={apiOk ? "online" : "offline"}/>{apiOk ? "API Connected" : "API Offline"}</div></header>
    <main>
      <section className="hero"><div><div className="eyebrow">DOCUMENT INTELLIGENCE / REVIEW WORKSPACE</div><h1>Banking document<br/><em>verification, simplified.</em></h1><p>Upload supporting documents, define your review objective, and surface traceable insights across the entire application.</p></div><div className="hero-mark"><ShieldCheck size={74} strokeWidth={1}/><span>SECURE REVIEW<br/>ENVIRONMENT</span></div></section>
      <section className="stats">
        <div className="stat"><span>DOCUMENTS UPLOADED</span><b>{stats.total.toString().padStart(2,"0")}</b><small>Across this review</small></div>
        <div className="stat"><span>READABLE DOCUMENTS</span><b>{stats.readable.toString().padStart(2,"0")}</b><small>Text successfully extracted</small></div>
        <div className="stat"><span>POTENTIAL DISCREPANCIES</span><b className={stats.issues ? "warn" : ""}>{stats.issues.toString().padStart(2,"0")}</b><small>From latest analysis</small></div>
        <div className="stat"><span>ANALYSIS MODE</span><b className="mode">AI / MOCK</b><small>Prototype review engine</small></div>
      </section>
      <div className="workspace">
        <section className="panel documents">
          <div className="panel-heading"><div><span className="step">01 / INPUT</span><h2>Source documents</h2></div><span className="count">{docs.length} FILES</span></div>
          <label className="dropzone"><input type="file" multiple accept=".pdf,.txt,.csv" onChange={e => uploadFiles(e.target.files)}/><UploadCloud size={28}/><b>Drop files here or browse</b><span>PDF, TXT, CSV · Max 10 MB per file · Up to 10 files</span></label>
          <div className="doc-toolbar"><span>UPLOADED FILES</span><button className="text-btn" onClick={() => setSelected(docs.map(d => d.id))}>Select all</button></div>
          <div className="doc-list">{docs.length === 0 ? <div className="empty">No documents yet. Upload sample files to begin.</div> : docs.map(doc => <div className="doc-row" key={doc.id}><input type="checkbox" checked={selected.includes(doc.id)} onChange={() => toggle(doc.id)}/><div className="file-icon"><FileText size={18}/></div><div className="doc-meta"><b>{doc.originalName}</b><span>{(doc.size/1024).toFixed(1)} KB · {doc.status}</span></div><span className={doc.status === "processed" ? "tag good" : "tag bad"}>{doc.status === "processed" ? "READY" : "REVIEW"}</span><button className="icon-btn" title="Remove" onClick={() => removeDoc(doc.id)}><Trash2 size={15}/></button></div>)}</div>
          <div className="privacy-note"><ShieldCheck size={16}/><span>Use synthetic data only. Files remain in your local development environment.</span></div>
        </section>
        <section className="panel instruction">
          <div className="panel-heading"><div><span className="step">02 / ANALYSIS</span><h2>Review instruction</h2></div><Sparkles size={20} className="spark"/></div>
          <p className="subtext">Tell the workbench what to verify, compare or extract across the selected documents.</p>
          <textarea value={instruction} onChange={e => setInstruction(e.target.value)} placeholder="e.g. Compare applicant income across salary slip and bank statement..."/>
          <div className="quick-prompts"><span>QUICK PROMPTS</span><button onClick={() => setInstruction("Verify applicant name, date of birth and address across PAN, Aadhaar and loan application. List every mismatch with source documents.")}>KYC verification</button><button onClick={() => setInstruction("Compare monthly net salary on the salary slip against salary credits in the bank statement. Identify amount and date differences.")}>Income comparison</button><button onClick={() => setInstruction("Extract account opening details, transactions, total credits, debits and closing balance. Highlight unusual or inconsistent figures.")}>Statement review</button></div>
          <div className="run-row"><span>{selected.length} of {docs.length} documents selected</span><button className="primary" disabled={busy || !docs.length || !selected.length} onClick={analyze}>{busy ? <><LoaderCircle className="spin" size={16}/> Processing</> : <><Sparkles size={16}/> Run analysis</>}</button></div>
          {message && <div className="message">{message}</div>}
        </section>
      </div>
      <section className="panel results">
        <div className="panel-heading"><div><span className="step">03 / OUTPUT</span><h2>Analysis report</h2></div><div className="result-actions"><span className="tag neutral">{result ? `${result.findings.length} FINDINGS` : "AWAITING ANALYSIS"}</span><button className="outline-btn" disabled={!result} onClick={copyReport}><Copy size={15}/> Copy JSON</button></div></div>
        {!result ? <div className="result-empty"><div className="result-symbol"><Sparkles size={26}/></div><b>Your intelligence report will appear here</b><span>Upload at least one document, enter an instruction and run analysis.</span></div> : <div className="report">
          <div className="summary"><span>EXECUTIVE SUMMARY</span><p>{result.executiveSummary}</p></div>
          <div className="finding-grid">{result.findings.map((f,i) => <article className="finding" key={i}><div className="finding-top"><span className={`tag ${f.category}`}>{f.category.toUpperCase()}</span><span className={`severity ${f.severity}`}>{f.severity} priority</span></div><h3>{f.title}</h3><p>{f.detail}</p>{f.sources.length > 0 && <div className="sources"><b>Evidence sources</b>{f.sources.map(s => <span key={s.documentId}><FileText size={13}/> {s.documentName}</span>)}</div>}</article>)}</div>
          <div className="data-section"><h3>Extracted financial data</h3>{Object.keys(result.extractedData).length ? <table><thead><tr><th>FIELD</th><th>EXTRACTED VALUE</th><th>SOURCE DOCUMENT</th></tr></thead><tbody>{Object.entries(result.extractedData).flatMap(([field, entries]) => entries.map((entry,i) => <tr key={`${field}-${i}`}><td>{field}</td><td>{entry.value}</td><td>{entry.sources.join(", ")}</td></tr>))}</tbody></table> : <p className="muted">No labelled financial fields were detected.</p>}</div>
          <div className="disclaimer"><AlertTriangle size={16}/><span>{result.disclaimer}</span></div>
        </div>}
      </section>
      <footer><span>FINSIGHT WORKBENCH · PROTOTYPE BUILD 1.0</span><span>NOT FOR PRODUCTION CREDIT OR KYC DECISIONS</span></footer>
    </main>
  </div>;
}
