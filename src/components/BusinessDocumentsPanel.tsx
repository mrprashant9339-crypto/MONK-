import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowDownToLine, FileText, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { supabase } from "../lib/supabase";
import "../business-documents.css";

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
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]);

function safeFileName(name: string) {
  return name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-120) || "document";
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BusinessDocumentsPanel({
  organizationId,
  canUpload,
  canDelete
}: {
  organizationId: string | null;
  canUpload: boolean;
  canDelete: boolean;
}) {
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!supabase || !organizationId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("business_documents")
      .select("id,organization_id,storage_path,file_name,mime_type,file_size,category,description,uploaded_by,created_at")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (queryError) setError(queryError.message);
    else setRows((data ?? []) as DocumentRow[]);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => { void load(); }, [load]);

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !organizationId || !file) return;
    setError("");
    setNotice("");
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      setError("Choose a file between 1 byte and 25 MB.");
      return;
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Unsupported file type. Upload PDF, JPG, PNG, WEBP, TXT, CSV, DOC/DOCX or XLS/XLSX.");
      return;
    }
    setSaving(true);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setSaving(false);
      setError("Your session has expired. Sign in again before uploading.");
      return;
    }

    const documentId = crypto.randomUUID();
    const storagePath = `${organizationId}/${documentId}/${safeFileName(file.name)}`;
    const { error: storageError } = await supabase.storage
      .from("business-private")
      .upload(storagePath, file, { contentType: file.type, cacheControl: "3600", upsert: false });

    if (storageError) {
      setSaving(false);
      setError(storageError.message);
      return;
    }

    const { error: insertError } = await supabase.from("business_documents").insert({
      id: documentId,
      organization_id: organizationId,
      storage_path: storagePath,
      file_name: file.name.slice(0, 255),
      mime_type: file.type,
      file_size: file.size,
      category,
      description: description.trim() || null,
      uploaded_by: authData.user.id
    });

    if (insertError) {
      await supabase.storage.from("business-private").remove([storagePath]);
      setSaving(false);
      setError(insertError.message);
      return;
    }

    setFile(null);
    setDescription("");
    setCategory("general");
    setNotice("Document uploaded to private organization storage.");
    setSaving(false);
    await load();
  }

  async function download(row: DocumentRow) {
    if (!supabase) return;
    setError("");
    const { data, error: signedError } = await supabase.storage
      .from("business-private")
      .createSignedUrl(row.storage_path, 60, { download: row.file_name });
    if (signedError || !data?.signedUrl) {
      setError(signedError?.message || "A secure download link could not be created.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function remove(row: DocumentRow) {
    if (!supabase || !canDelete) return;
    if (!window.confirm(`Permanently delete "${row.file_name}" from this organization?`)) return;
    setSaving(true);
    setError("");
    const { error: storageError } = await supabase.storage.from("business-private").remove([row.storage_path]);
    if (storageError) {
      setSaving(false);
      setError(storageError.message);
      return;
    }
    const { error: rowError } = await supabase
      .from("business_documents")
      .delete()
      .eq("id", row.id)
      .eq("organization_id", organizationId);
    setSaving(false);
    if (rowError) {
      setError("The stored file was removed, but its metadata could not be deleted: " + rowError.message);
      await load();
      return;
    }
    setNotice("Document permanently deleted.");
    await load();
  }

  if (!organizationId) {
    return <section className="bol-section"><div className="bol-empty">Select an authenticated Business organization to manage documents.</div></section>;
  }

  return (
    <section className="bol-section" aria-labelledby="business-documents-title">
      <div className="bol-section-head">
        <div>
          <span>PRIVATE ORGANIZATION FILES</span>
          <h3 id="business-documents-title">Documents</h3>
          <p>Files are private, tenant-scoped and delivered through short-lived signed links.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={14}/> Refresh</button>
      </div>

      {canUpload && <form className="bol-panel bol-document-upload" onSubmit={upload}>
        <h4><UploadCloud size={16}/> Upload a document</h4>
        <label>File
          <input type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx" onChange={event => setFile(event.target.files?.[0] ?? null)}/>
        </label>
        <label>Category
          <select value={category} onChange={event => setCategory(event.target.value)}>
            <option value="general">General</option>
            <option value="contract">Contract</option>
            <option value="invoice">Invoice</option>
            <option value="receipt">Receipt</option>
            <option value="identity">Identity</option>
            <option value="compliance">Compliance</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>Description
          <input maxLength={500} value={description} onChange={event => setDescription(event.target.value)} placeholder="Optional context for your team"/>
        </label>
        <small>Maximum 25 MB. Allowed: PDF, JPG, PNG, WEBP, TXT, CSV, DOC/DOCX and XLS/XLSX.</small>
        <button type="submit" disabled={saving || !file}><UploadCloud size={14}/>{saving ? "Uploading…" : "Upload privately"}</button>
      </form>}

      {error && <p className="bol-error" role="alert">{error}</p>}
      {notice && <p className="bol-success" role="status">{notice}</p>}

      {loading ? <div className="bol-empty">Loading organization documents…</div> : rows.length === 0 ? (
        <div className="bol-empty">No documents have been uploaded to this organization.</div>
      ) : (
        <div className="bol-document-list">
          {rows.map(row => <article className="bol-document-row" key={row.id}>
            <span className="bol-document-icon"><FileText size={18}/></span>
            <div className="bol-document-info">
              <strong>{row.file_name}</strong>
              <small>{row.category} · {formatSize(row.file_size)} · {new Date(row.created_at).toLocaleDateString("en-IN")}</small>
              {row.description && <p>{row.description}</p>}
            </div>
            <button type="button" onClick={() => void download(row)} aria-label={`Download ${row.file_name}`}><ArrowDownToLine size={14}/> Download</button>
            {canDelete && <button type="button" className="bol-danger-action" disabled={saving} onClick={() => void remove(row)} aria-label={`Delete ${row.file_name}`}><Trash2 size={14}/></button>}
          </article>)}
        </div>
      )}
    </section>
  );
}
