import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { Download, File, FileImage, FileText, FileVideo, FolderOpen, Search, Trash2, UploadCloud, X } from "lucide-react";
import "./documents-management.css";

type LocalDocument = {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  addedAt: number;
};

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "application/pdf", "text/plain", "text/csv", "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png", "image/jpeg", "image/webp"
]);

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function fileIcon(type: string) {
  if (type.startsWith("image/")) return FileImage;
  if (type.startsWith("video/")) return FileVideo;
  if (type.includes("pdf") || type.includes("word") || type.startsWith("text/")) return FileText;
  return File;
}

export default function DocumentsManagement() {
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleDocuments = useMemo(() => documents.filter(item =>
    item.name.toLowerCase().includes(query.trim().toLowerCase())
  ), [documents, query]);

  function addFiles(fileList: FileList | File[]) {
    setError("");
    setNotice("");
    const incoming = Array.from(fileList);
    if (!incoming.length) return;
    const accepted: LocalDocument[] = [];
    const rejected: string[] = [];
    for (const file of incoming) {
      const supported = ACCEPTED_TYPES.has(file.type) || /\.(pdf|txt|csv|json|docx|xlsx|pptx|png|jpe?g|webp)$/i.test(file.name);
      if (!supported) { rejected.push(file.name + " (unsupported type)"); continue; }
      if (file.size > MAX_FILE_SIZE) { rejected.push(file.name + " (over 20 MB)"); continue; }
      if (documents.some(item => item.name === file.name && item.size === file.size)) continue;
      accepted.push({ id: crypto.randomUUID(), file, name: file.name, size: file.size, type: file.type, addedAt: Date.now() });
    }
    if (accepted.length) {
      setDocuments(current => [...accepted, ...current]);
      setNotice(accepted.length + " file" + (accepted.length === 1 ? "" : "s") + " added to this temporary browser preview.");
    }
    if (rejected.length) setError("Not added: " + rejected.join(", "));
    if (!accepted.length && !rejected.length) setNotice("Those files are already in this preview.");
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function removeDocument(id: string) {
    setDocuments(current => current.filter(item => item.id !== id));
  }

  function downloadDocument(item: LocalDocument) {
    const url = URL.createObjectURL(item.file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = item.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return <section className="documents-workspace">
    <div className="documents-heading">
      <div><p className="eyebrow">WORKSPACE LIBRARY</p><h2>Documents</h2><p className="muted">Keep working files together. This is a device-only preview until secure workspace storage is connected.</p></div>
      <button className="primary" type="button" onClick={() => inputRef.current?.click()}><UploadCloud size={16}/> Add files</button>
      <input ref={inputRef} className="documents-hidden-input" type="file" multiple accept=".pdf,.txt,.csv,.json,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.webp" onChange={onInputChange}/>
    </div>
    <div className={dragging ? "documents-dropzone is-dragging" : "documents-dropzone"} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={onDrop}>
      <span className="documents-upload-icon"><UploadCloud size={22}/></span>
      <strong>Drop files here</strong><span>or <button type="button" onClick={() => inputRef.current?.click()}>browse your device</button></span>
      <small>PDF, Office, CSV, text and images · up to 20 MB per file</small>
    </div>
    <div className="documents-toolbar"><div><span className="documents-count">{documents.length}</span><span> files in this temporary session</span></div><label className="documents-search"><Search size={15}/><input aria-label="Search documents" placeholder="Search files…" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X size={13}/></button>}</label></div>
    {notice && <p className="documents-notice" role="status">{notice}</p>}
    {error && <p className="documents-error" role="alert">{error}</p>}
    {visibleDocuments.length ? <div className="documents-list">{visibleDocuments.map(item => { const Icon = fileIcon(item.type); return <article className="documents-row" key={item.id}><span className="documents-file-icon"><Icon size={18}/></span><div className="documents-file-meta"><strong title={item.name}>{item.name}</strong><small>{formatSize(item.size)} · Added {new Date(item.addedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small></div><span className="documents-local-tag">LOCAL</span><button type="button" aria-label={"Download "+item.name} onClick={() => downloadDocument(item)}><Download size={15}/></button><button type="button" aria-label={"Remove "+item.name} onClick={() => removeDocument(item.id)}><Trash2 size={15}/></button></article>; })}</div> : <div className="documents-empty"><FolderOpen size={25}/><strong>{query ? "No matching files" : "Your library is empty"}</strong><p>{query ? "Try a different file name." : "Add a few files to preview the document workflow. Files are not uploaded or shared."}</p>{query ? <button type="button" onClick={() => setQuery("")}>Clear search</button> : <button type="button" onClick={() => inputRef.current?.click()}>Choose files</button>}</div>}
    <div className="documents-storage-note"><FileText size={16}/><span><b>Storage connection pending</b><small>Files stay in this browser session only and disappear when this page is closed or refreshed. No file is sent to MONK servers.</small></span></div>
  </section>;
}
