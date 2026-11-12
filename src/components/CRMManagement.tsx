import { FormEvent, useCallback, useEffect, useState } from "react";
import { Building2, Users, Target, Plus, Search, RefreshCw, Mail, ArrowUpRight } from "lucide-react";
import { supabase } from "../lib/supabase";

type Lead = { id: string; name: string; email: string | null; phone: string | null; source: string; status: string; score: number; created_at: string };
type Contact = { id: string; first_name: string; last_name: string; email: string; phone: string | null; title: string | null; created_at: string };
type Tab = "Leads" | "Contacts" | "Companies";

export default function CRMManagement({ organizationId }: { organizationId: string }) {
  const [tab, setTab] = useState<Tab>("Leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<{id:string;name:string;domain:string|null;industry:string|null;status:string}[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadSource, setLeadSource] = useState("website");
  const [leadNotes, setLeadNotes] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [companyName, setCompanyName] = useState("");

  const load = useCallback(async () => {
    if (!supabase || !organizationId) return;
    setBusy(true); setError("");
    try {
      const [l,c,b] = await Promise.all([
        supabase.from("leads").select("id,name,email,phone,source,status,score,created_at").eq("organization_id",organizationId).is("deleted_at",null).order("created_at",{ascending:false}).limit(100),
        supabase.from("contacts").select("id,first_name,last_name,email,phone,title,created_at").eq("organization_id",organizationId).is("deleted_at",null).order("created_at",{ascending:false}).limit(100),
        supabase.from("companies").select("id,name,domain,industry,status").eq("organization_id",organizationId).is("deleted_at",null).order("created_at",{ascending:false}).limit(100)
      ]);
      if (l.error) throw l.error;
      if (c.error) throw c.error;
      if (b.error) throw b.error;
      setLeads((l.data ?? []) as Lead[]);
      setContacts((c.data ?? []) as Contact[]);
      setCompanies((b.data ?? []) as typeof companies);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load CRM records."); }
    finally { setBusy(false); }
  }, [organizationId]);

  useEffect(() => { void load(); }, [load]);

  async function createLead(e: FormEvent) {
    e.preventDefault(); if (!supabase) return;
    setBusy(true); setError(""); setNotice("");
    const { error: rpcError } = await supabase.rpc("create_lead", {
      lead_name: leadName.trim(), lead_email: leadEmail.trim() || null,
      lead_phone: leadPhone.trim() || null, lead_source: leadSource, lead_notes: leadNotes.trim() || null
    });
    setBusy(false);
    if (rpcError) { setError(rpcError.message); return; }
    setLeadName(""); setLeadEmail(""); setLeadPhone(""); setLeadNotes("");
    setNotice("Lead saved to this organization."); await load();
  }

  async function createContact(e: FormEvent) {
    e.preventDefault(); if (!supabase) return;
    setBusy(true); setError(""); setNotice("");
    const { error: rpcError } = await supabase.rpc("create_contact", {
      contact_first_name: firstName.trim(), contact_last_name: lastName.trim(),
      contact_email: contactEmail.trim(), contact_phone: contactPhone.trim() || null,
      contact_title: contactTitle.trim() || null, contact_company_name: companyName.trim() || null,
      contact_tags: []
    });
    setBusy(false);
    if (rpcError) { setError(rpcError.message); return; }
    setFirstName(""); setLastName(""); setContactEmail(""); setContactPhone(""); setContactTitle(""); setCompanyName("");
    setNotice("Contact saved. A company was linked or created when provided."); await load();
  }

  const filteredLeads = leads.filter(v => [v.name,v.email,v.phone,v.source,v.status].join(" ").toLowerCase().includes(query.toLowerCase()));
  const filteredContacts = contacts.filter(v => [v.first_name,v.last_name,v.email,v.phone,v.title].join(" ").toLowerCase().includes(query.toLowerCase()));
  const filteredCompanies = companies.filter(v => [v.name,v.domain,v.industry,v.status].join(" ").toLowerCase().includes(query.toLowerCase()));

  return <section className="crm-shell">
    <div className="crm-heading"><div><p className="eyebrow">CUSTOMER RELATIONSHIPS</p><h2>CRM workspace</h2><p className="muted">Manage prospects, people and organizations in your active tenant.</p></div><button className="icon-btn" onClick={() => void load()} aria-label="Refresh CRM" disabled={busy}><RefreshCw size={16}/></button></div>
    <div className="crm-metrics">
      <article><span><Target size={16}/> Leads</span><strong>{leads.length}</strong><small>Active prospect records</small></article>
      <article><span><Users size={16}/> Contacts</span><strong>{contacts.length}</strong><small>People in your network</small></article>
      <article><span><Building2 size={16}/> Companies</span><strong>{companies.length}</strong><small>Organizations tracked</small></article>
    </div>
    <div className="crm-toolbar"><div className="crm-tabs">{(["Leads","Contacts","Companies"] as Tab[]).map(v=><button key={v} className={tab===v?"active":""} onClick={()=>setTab(v)}>{v}</button>)}</div><label className="crm-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={"Search "+tab.toLowerCase()+"…"}/></label></div>
    {error && <p className="notice" role="alert">{error}</p>}{notice && <p className="crm-notice" role="status">{notice}</p>}
    {tab==="Leads" && <div className="crm-layout"><form className="education-card education-form" onSubmit={createLead}><div className="education-card-heading"><Target size={17}/><div><b>Add a lead</b><small>Capture a new sales opportunity</small></div></div><label>Name<input required maxLength={160} value={leadName} onChange={e=>setLeadName(e.target.value)} placeholder="Prospect name"/></label><label>Email<input type="email" value={leadEmail} onChange={e=>setLeadEmail(e.target.value)} placeholder="name@company.com"/></label><label>Phone<input value={leadPhone} onChange={e=>setLeadPhone(e.target.value)} placeholder="+91…"/></label><label>Source<select value={leadSource} onChange={e=>setLeadSource(e.target.value)}>{["website","referral","campaign","event","partner","manual","other"].map(v=><option key={v}>{v}</option>)}</select></label><label>Notes<textarea rows={3} value={leadNotes} onChange={e=>setLeadNotes(e.target.value)} maxLength={2000}/></label><button className="primary" disabled={busy}><Plus size={15}/> Save lead</button></form><div className="education-card crm-list"><h3>Lead pipeline <span>{filteredLeads.length}</span></h3>{filteredLeads.map(v=><div className="education-record" key={v.id}><Target size={16}/><div><b>{v.name}</b><small>{v.email ?? "No email"} · {v.source} · {v.status} · Score {v.score}</small></div><time>{new Date(v.created_at).toLocaleDateString("en-IN")}</time></div>)}{!filteredLeads.length&&<p className="education-empty">{busy?"Loading leads…":"No matching leads. Add your first prospect."}</p>}</div></div>}
    {tab==="Contacts" && <div className="crm-layout"><form className="education-card education-form" onSubmit={createContact}><div className="education-card-heading"><Users size={17}/><div><b>Add a contact</b><small>Keep business relationships organized</small></div></div><div className="education-two"><label>First name<input required value={firstName} onChange={e=>setFirstName(e.target.value)}/></label><label>Last name<input value={lastName} onChange={e=>setLastName(e.target.value)}/></label></div><label>Email<input required type="email" value={contactEmail} onChange={e=>setContactEmail(e.target.value)}/></label><label>Phone<input value={contactPhone} onChange={e=>setContactPhone(e.target.value)}/></label><label>Job title<input value={contactTitle} onChange={e=>setContactTitle(e.target.value)}/></label><label>Company name<input value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Optional company"/></label><button className="primary" disabled={busy}><Plus size={15}/> Save contact</button></form><div className="education-card crm-list"><h3>Contacts <span>{filteredContacts.length}</span></h3>{filteredContacts.map(v=><div className="education-record" key={v.id}><Users size={16}/><div><b>{v.first_name} {v.last_name}</b><small>{v.title ?? "Contact"} · {v.email}</small></div><a href={"mailto:"+v.email} aria-label={"Email "+v.first_name}><Mail size={15}/></a></div>)}{!filteredContacts.length&&<p className="education-empty">{busy?"Loading contacts…":"No contacts yet."}</p>}</div></div>}
    {tab==="Companies" && <div className="education-card crm-list crm-company-list"><h3>Companies <span>{filteredCompanies.length}</span></h3>{filteredCompanies.map(v=><div className="education-record" key={v.id}><Building2 size={16}/><div><b>{v.name}</b><small>{v.industry ?? "Industry not set"} · {v.domain ?? "No domain"} · {v.status}</small></div>{v.domain&&<a href={"https://"+v.domain.replace(/^https?:\/\//,"")} target="_blank" rel="noreferrer" aria-label={"Open "+v.name}><ArrowUpRight size={15}/></a>}</div>)}{!filteredCompanies.length&&<p className="education-empty">Companies are created when you add a contact with a company name.</p>}</div>}
    <p className="crm-footnote">All records are loaded from the active organization. Database permissions remain enforced by Supabase Row Level Security and scoped RPCs.</p>
  </section>;
}
