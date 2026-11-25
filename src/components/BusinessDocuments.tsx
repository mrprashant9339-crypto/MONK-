import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, FileUp, LoaderCircle, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import "./business-documents.css";

type DocumentRow = {
  id: string;
  organization_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  category: string;
  description: string | null;
  uploaded_by: string;
  created_at: string;
};

const BUCKET = "business-private";
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const CATEGORIES = ["general", "contract", "invoice", "receipt", "identity", "compliance", "other"];

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value < 0) return "—";
  if (value < 1024) return value + " B";
  if (value < 1024 * 1024) return (value / 1024).toFixed(0) + " KB";
  return (value / (1024 * 1024)).toFixed(1) + " MB";
}

function safeFileName(value: string) {
  const cleaned = value.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.{2,}/g, ".").slice(0, 120);
  return cleaned || "document";
}

export default function BusinessDocuments({ organizationId }: { organizationId: string }) {
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [canRead, setCanRead] = useState(false);
  const [canUpload, setCanUpload] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!supabase || !organizationId) {
      setError("A connected Business workspace is required.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [read, upload, approve] = await Promise.all([
        supabase.rpc("has_org_permission", { target_org: organizationId, permission_key: "documents.document.read" }),
        supabase.rpc("has_org_permission", { target_org: organizationId, permission_key: "documents.document.upload" }),
        supabase.rpc("has_org_permission", { target_org: organizationId, permission_key: "documents.document.approve" }),
      ]);
      if (read.error || upload.error || approve.error) throw read.error ?? upload.error ?? approve.error;
      setCanRead(read.data === true);
      setCanUpload(upload.data === true);
      setCanApprove(approve.data === true);
      setPermissionsReady(true);
      if (read.data !== true) {
        setRows([]);
        return;
      }
      const result = await supabase.from("business_documents")
        .select("id,organization_id,storage_path,file_name,mime_type,file_size,category,description,uploaded_by,created_at")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(250);
      if (result.error) throw result.error;
      setRows((result.data ?? []) as DocumentRow[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Documents could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { void load(); }, [load]);

  const visibleRows = useMemo(() => rows.filter(row => {
    const matchesCategory = category === "all" || row.category === category;
    const text = (row.file_name + " " + (row.description ?? "") + " " + row.category).toLowerCase();
    return matchesCategory && text.includes(query.trim().toLowerCase());
  }), [rows, category, query]);

  async function upload() {
    if (!supabase || !organizationId || !selectedFile || !canUpload || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    let storagePath = "";
    try {
      if (!ALLOWED_TYPES.has(selectedFile.type)) throw new Error("This file type is not allowed. Upload PDF, images, text, CSV, DOC/DOCX or XLS/XLSX.");
      if (selectedFile.size <= 0 || selectedFile.size > MAX_FILE_SIZE) throw new Error("File must be between 1 byte and 25 MB.");
      const id = crypto.randomUUID();
      storagePath = organizationId + "/" + id + "/" + crypto.randomUUID() + "-" + safeFileName(selectedFile.name);
      const uploaded = await supabase.storage.from(BUCKET).upload(storagePath, selectedFile, {
        contentType: selectedFile.type,
        cacheControl: "3600",
        upsert: false,
      });
      if (uploaded.error) throw uploaded.error;
      const user = await supabase.auth.getUser();
      if (user.error || !user.data.user) throw new Error("Your session expired. Sign in again and retry.");
      const inserted = await supabase.from("business_documents").insert({
        id,
        organization_id: organizationId,
        storage_path: storagePath,
        file_name: selectedFile.name.slice(0, 255),
        mime_type: selectedFile.type,
        file_size: selectedFile.size,
        category: uploadCategory,
        description: description.trim().slice(0, 1000) || null,
        uploaded_by: user.data.user.id,
      });
      if (inserted.error) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
        storagePath = "";
        throw inserted.error;
      }
      setSelectedFile(null);
      setDescription("");
      setNotice("Document uploaded to the private workspace vault.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  async function download(row: DocumentRow) {
    if (!supabase || !canRead || openingId) return;
    setOpeningId(row.id);
    setError("");
    try {
      const result = await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path, 60, { download: row.file_name });
      if (result.error || !result.data?.signedUrl) throw result.error ?? new Error("A secure download link could not be created.");
      window.location.assign(result.data.signedUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Download failed.");
    } finally {
      setOpeningId(null);
    }
  }

  async function archive(row: DocumentRow) {
    if (!supabase || !canApprove || busy) return;
    if (!window.confirm("Permanently remove “" + row.file_name + "” from this workspace?")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const removed = await supabase.storage.from(BUCKET).remove([row.storage_path]);
      if (removed.error) throw removed.error;
      const deleted = await supabase.from("business_documents").delete()
        .eq("id", row.id)
        .eq("organization_id", organizationId);
      if (deleted.error) {
        setError("The file object was removed, but its metadata could not be deleted. Contact support with document ID " + row.id + ".");
        return;
      }
      setRows(current => current.filter(item => item.id !== row.id));
      setNotice("Document permanently removed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Document removal failed.");
    } finally {
      setBusy(false);
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file && file.size > MAX_FILE_SIZE) setError("File exceeds the 25 MB limit.");
    else setError("");
  }

  return <section className="business-documents">
    <header className="business-documents-head">
      <div><span className="business-documents-kicker">PRIVATE WORKSPACE VAULT</span><h2>Documents</h2><p>Contracts, finance records and operational files, stored privately inside this organization.</p></div>
      <button type="button" className="business-documents-refresh" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/> Refresh</button>
    </header>

    <div className="business-documents-trust"><ShieldCheck size={17}/><span>Private storage · Organization-scoped access · 60-second signed download links · 25 MB maximum per file</span></div>
    {error && <div className="business-documents-alert error" role="alert">{error}</div>}
    {notice && <div className="business-documents-alert" role="status">{notice}</div>}

    {permissionsReady && !canRead && <div className="business-documents-empty"><ShieldCheck size={22}/><b>Document access is restricted</b><p>Your current organization role does not include document read permission.</p></div>}

    {canUpload && <section className="business-documents-upload">
      <div><span className="business-documents-kicker">ADD TO VAULT</span><h3>Upload a document</h3><p>Only authorized workspace members can upload files.</p></div>
      <label>Category<select value={uploadCategory} onChange={event => setUploadCategory(event.target.value)}>{CATEGORIES.map(item => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}</select></label>
      <label className="business-documents-file">Choose file<input type="file" onChange={onFileChange} accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx"/></label>
      {selectedFile && <p className="business-documents-file-meta">{selectedFile.name} · {formatBytes(selectedFile.size)}</p>}
      <label>Description (optional)<input value={description} maxLength={1000} onChange={event => setDescription(event.target.value)} placeholder="What is this document for?"/></label>
      <button type="button" className="business-documents-primary" onClick={() => void upload()} disabled={!selectedFile || busy || !permissionsReady}><FileUp size={15}/>{busy ? "Uploading…" : "Upload privately"}</button>
    </section>}

    {canRead && <section className="business-documents-list">
      <div className="business-documents-toolbar">
        <div><h3>Workspace files</h3><span>{visibleRows.length} of {rows.length} documents</span></div>
        <label className="business-documents-search"><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search documents"/></label>
        <select aria-label="Filter documents by category" value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{CATEGORIES.map(item => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}</select>
      </div>
      {loading ? <div className="business-documents-empty"><LoaderCircle size={18}/> Loading private documents…</div>
        : visibleRows.length === 0 ? <div className="business-documents-empty"><FileText size={22}/><b>No documents found</b><p>Uploaded files will appear here after they are saved successfully.</p></div>
        : <div className="business-documents-table">
          {visibleRows.map(row => <article className="business-document-row" key={row.id}>
            <span className="business-document-icon"><FileText size={18}/></span>
            <div className="business-document-info"><b>{row.file_name}</b><small>{row.category.replace(/_/g, " ")} · {formatBytes(Number(row.file_size))} · {new Date(row.created_at).toLocaleDateString("en-IN")}</small>{row.description && <p>{row.description}</p>}</div>
            <div className="business-document-actions"><button type="button" onClick={() => void download(row)} disabled={openingId !== null || busy} aria-label={"Download " + row.file_name}><Download size={15}/>{openingId === row.id ? "Preparing…" : "Download"}</button>{canApprove && <button type="button" className="danger" onClick={() => void archive(row)} disabled={busy} aria-label={"Delete " + row.file_name}><Trash2 size={15}/> Remove</button>}</div>
          </article>)}
        </div>}
    </section>}
    <p className="business-documents-footnote">Do not upload passwords, payment-card details or files you are not authorized to store. File-type and size checks are enforced in the browser and private bucket; malware scanning is not currently enabled.</p>
  </section>;
}
