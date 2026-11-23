import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Building2, Check, ChevronDown, CircleDollarSign, Download, Filter, Mail, Plus, RefreshCw, Search, Sparkles, Target, Users, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import "./sales-workspace.css";

type Lead = { id:string; name:string; email:string|null; phone:string|null; source:string; status:string; score:number; created_at:string };
type Contact = { id:string; first_name:string; last_name:string; email:string; phone:string|null; title:string|null; created_at:string };
type Company = { id:string; name:string; domain:string|null; industry:string|null; status:string };
type Tab = "Overview" | "Pipeline" | "People" | "Companies";

const statusLabel = (value:string) => value.replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());
const initials = (value:string) => value.trim().split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()??"").join("") || "—";

export default function SalesWorkspace({organizationId}:{organizationId:string|null}) {
  const [tab,setTab] = useState<Tab>("Overview");
  const [leads,setLeads] = useState<Lead[]>([]);
  const [contacts,setContacts] = useState<Contact[]>([]);
  const [companies,setCompanies] = useState<Company[]>([]);
  const [query,setQuery] = useState("");
  const [sourceFilter,setSourceFilter] = useState("all");
  const [loading,setLoading] = useState(false);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [showLeadForm,setShowLeadForm] = useState(false);
  const [leadName,setLeadName] = useState("");
  const [leadEmail,setLeadEmail] = useState("");
  const [leadPhone,setLeadPhone] = useState("");
  const [leadSource,setLeadSource] = useState("website");
  const [leadNotes,setLeadNotes] = useState("");

  const load = useCallback(async () => {
    if (!supabase || !organizationId) return;
    setLoading(true); setError("");
    try {
      const [leadResult,contactResult,companyResult] = await Promise.all([
        supabase.from("leads").select("id,name,email,phone,source,status,score,created_at").eq("organization_id",organizationId).is("deleted_at",null).order("created_at",{ascending:false}).limit(250),
        supabase.from("contacts").select("id,first_name,last_name,email,phone,title,created_at").eq("organization_id",organizationId).is("deleted_at",null).order("created_at",{ascending:false}).limit(250),
        supabase.from("companies").select("id,name,domain,industry,status").eq("organization_id",organizationId).is("deleted_at",null).order("created_at",{ascending:false}).limit(250)
      ]);
      if (leadResult.error) throw leadResult.error;
      if (contactResult.error) throw contactResult.error;
      if (companyResult.error) throw companyResult.error;
      setLeads((leadResult.data??[]) as Lead[]);
      setContacts((contactResult.data??[]) as Contact[]);
      setCompanies((companyResult.data??[]) as Company[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sales records could not be loaded.");
    } finally { setLoading(false); }
  },[organizationId]);

  useEffect(()=>{ void load(); },[load]);

  const filteredLeads = useMemo(()=>leads.filter(lead=>{
    const matchesQuery=[lead.name,lead.email,lead.phone,lead.source,lead.status].join(" ").toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (sourceFilter==="all" || lead.source===sourceFilter);
  }),[leads,query,sourceFilter]);
  const stages = useMemo(()=>{
    const groups = new Map<string,Lead[]>();
    leads.forEach(lead=>groups.set(lead.status||"unspecified",[...(groups.get(lead.status||"unspecified")??[]),lead]));
    return [...groups.entries()].sort((a,b)=>b[1].length-a[1].length);
  },[leads]);
  const sources = useMemo(()=>[...new Set(leads.map(lead=>lead.source).filter(Boolean))].sort(),[leads]);
  const qualified = leads.filter(lead=>Number(lead.score)>=70).length;
  const recentLeads = leads.slice(0,5);
  const avgScore = leads.length ? Math.round(leads.reduce((sum,lead)=>sum+(Number(lead.score)||0),0)/leads.length) : 0;
  const sourceMix = sources.map(source=>({source,count:leads.filter(lead=>lead.source===source).length})).sort((a,b)=>b.count-a.count).slice(0,5);
  const maxSource = Math.max(1,...sourceMix.map(item=>item.count));

  async function createLead(event:FormEvent) {
    event.preventDefault();
    if (!supabase || !organizationId || !leadName.trim()) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const {error:rpcError}=await supabase.rpc("create_lead",{
        lead_name:leadName.trim(),lead_email:leadEmail.trim()||null,lead_phone:leadPhone.trim()||null,
        lead_source:leadSource,lead_notes:leadNotes.trim()||null
      });
      if(rpcError){setError(rpcError.message);return;}
      setLeadName("");setLeadEmail("");setLeadPhone("");setLeadNotes("");setShowLeadForm(false);
      setNotice("Lead created in the active organization.");
      await load();
    } catch(cause) { setError(cause instanceof Error?cause.message:"Lead could not be saved. Please retry."); }
    finally { setSaving(false); }
  }

  function exportLeads() {
    const rows=[["Name","Email","Phone","Source","Status","Score","Created"],...filteredLeads.map(lead=>[lead.name,lead.email??"",lead.phone??"",lead.source,lead.status,String(lead.score),lead.created_at])];
    const csv=rows.map(row=>row.map(value=>{const cell=String(value);const safe=/^[\\s]*[=+@-]/.test(cell)?"\u0027"+cell:cell;return '"' + safe.replace(/"/g,'""') + '"';}).join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const anchor=document.createElement("a");anchor.href=url;anchor.download="monk-sales-leads.csv";document.body.appendChild(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  if (!organizationId) return <section className="sales-empty"><Target/><h2>Choose a business workspace</h2><p>Sales records are available after a business organization is connected.</p></section>;

  return <section className="sales-page">
    <div className="sales-hero">
      <div className="sales-hero-copy"><span className="sales-kicker"><Sparkles size={13}/> MONK BUSINESS / REVENUE ENGINE</span><h2>Make every relationship<br/><em>move business forward.</em></h2><p>One clear view of your prospects, people and account momentum.</p></div>
      <div className="sales-hero-art" aria-hidden="true"><div className="sales-art-ring ring-a"/><div className="sales-art-ring ring-b"/><div className="sales-art-core"><Target size={31}/></div><span className="sales-art-node node-a"><Users size={15}/></span><span className="sales-art-node node-b"><Building2 size={15}/></span><span className="sales-art-node node-c"><Activity size={15}/></span></div>
      <div className="sales-hero-actions"><button className="sales-button sales-button-primary" onClick={()=>setShowLeadForm(true)}><Plus size={15}/> Add prospect</button><button className="sales-button sales-button-quiet" onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/> Refresh</button></div>
    </div>

    <div className="sales-stat-grid">
      <article className="sales-stat"><span>Total prospects <Target size={15}/></span><strong>{leads.length}</strong><small>Active lead records</small><i className="sales-stat-line line-one"/></article>
      <article className="sales-stat"><span>Qualified prospects <Check size={15}/></span><strong>{qualified}</strong><small>Lead score of 70 or above</small><i className="sales-stat-line line-two"/></article>
      <article className="sales-stat"><span>People <Users size={15}/></span><strong>{contacts.length}</strong><small>Saved business contacts</small><i className="sales-stat-line line-three"/></article>
      <article className="sales-stat"><span>Accounts <Building2 size={15}/></span><strong>{companies.length}</strong><small>Tracked organizations</small><i className="sales-stat-line line-four"/></article>
    </div>

    <div className="sales-toolbar">
      <div className="sales-tabs" role="tablist" aria-label="Sales views">{(["Overview","Pipeline","People","Companies"] as Tab[]).map(item=><button key={item} role="tab" aria-selected={tab===item} className={tab===item?"is-active":""} onClick={()=>setTab(item)}>{item}</button>)}</div>
      <div className="sales-tools"><label className="sales-search"><Search size={15}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search sales records"/></label><button className="sales-icon-button" onClick={exportLeads} disabled={!filteredLeads.length} aria-label="Export filtered leads"><Download size={15}/></button></div>
    </div>

    {error&&<p className="sales-alert" role="alert">{error}</p>}{notice&&<p className="sales-notice" role="status">{notice}</p>}
    {loading&&<div className="sales-loading"><span/> Syncing organization records…</div>}

    {tab==="Overview"&&<div className="sales-overview">
      <article className="sales-panel sales-pipeline-panel"><div className="sales-panel-head"><div><span className="sales-overline">LIVE RECORD DISTRIBUTION</span><h3>Pipeline by stage</h3></div><button onClick={()=>setTab("Pipeline")}>Open pipeline <ArrowUpRight size={14}/></button></div>
        {stages.length? <div className="sales-stage-bars">{stages.slice(0,6).map(([stage,items],index)=><div className="sales-stage-row" key={stage} style={{"--stage-index":index} as React.CSSProperties}><span>{statusLabel(stage)}</span><div className="sales-stage-track"><i style={{width:(items.length/Math.max(1,leads.length)*100)+"%"}}/></div><b>{items.length}</b></div>)}</div>:<div className="sales-blank"><Target size={21}/><b>Your pipeline starts here</b><span>Add a prospect to see its stage distribution.</span></div>}
        <div className="sales-panel-foot"><span>Average lead score</span><strong>{leads.length?avgScore+" / 100":"—"}</strong></div>
      </article>
      <article className="sales-panel sales-source-panel"><div className="sales-panel-head"><div><span className="sales-overline">ACQUISITION INTELLIGENCE</span><h3>Where leads come from</h3></div><Activity size={17}/></div>
        {sourceMix.length?sourceMix.map((item,index)=><div className="sales-source-row" key={item.source}><div><span>{statusLabel(item.source)}</span><b>{item.count}</b></div><div className="sales-source-track"><i style={{width:(item.count/maxSource*100)+"%",animationDelay:(index*90)+"ms"}}/></div></div>):<div className="sales-blank"><span>No source data yet.</span></div>}
        <small className="sales-data-note">Calculated from saved lead records. No estimated revenue or fabricated conversion rates.</small>
      </article>
      <article className="sales-panel sales-recent-panel"><div className="sales-panel-head"><div><span className="sales-overline">LATEST ACTIVITY</span><h3>Recently added prospects</h3></div><button onClick={()=>setTab("Pipeline")}>View all <ArrowUpRight size={14}/></button></div>
        {recentLeads.length?recentLeads.map(lead=><div className="sales-recent-row" key={lead.id}><span className="sales-initials">{initials(lead.name)}</span><div><b>{lead.name}</b><small>{lead.email||"No email"} · {statusLabel(lead.status)}</small></div><time>{new Date(lead.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</time></div>):<div className="sales-blank"><span>No prospects have been added yet.</span></div>}
      </article>
    </div>}

    {tab==="Pipeline"&&<div className="sales-pipeline-view"><div className="sales-view-heading"><div><span className="sales-overline">PROSPECT MANAGEMENT</span><h3>Sales pipeline</h3><p>Stages reflect the current status values saved on your leads.</p></div><label className="sales-filter"><Filter size={14}/><select value={sourceFilter} onChange={event=>setSourceFilter(event.target.value)}><option value="all">All sources</option>{sources.map(source=><option key={source} value={source}>{statusLabel(source)}</option>)}</select><ChevronDown size={13}/></label></div>
      {stages.length?<div className="sales-kanban">{stages.map(([stage,items],index)=><section className="sales-kanban-column" key={stage} style={{"--column-index":index} as React.CSSProperties}><header><span><i/>{statusLabel(stage)}</span><b>{items.filter(item=>filteredLeads.some(match=>match.id===item.id)).length}</b></header>{items.filter(item=>filteredLeads.some(match=>match.id===item.id)).map(lead=><article className="sales-lead-card" key={lead.id}><div className="sales-lead-card-top"><span>{lead.source}</span><small>#{lead.id.slice(0,6)}</small></div><h4>{lead.name}</h4><p>{lead.email||lead.phone||"No contact detail"}</p><footer><span className={Number(lead.score)>=70?"score-high":"score-normal"}>Score {lead.score}</span><time>{new Date(lead.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</time></footer></article>)}{!items.some(item=>filteredLeads.some(match=>match.id===item.id))&&<p className="sales-column-empty">No matching records</p>}</section>)}</div>:<div className="sales-blank sales-large-blank"><Target/><b>No pipeline stages yet</b><span>Create a lead to begin tracking your pipeline.</span></div>}
    </div>}

    {tab==="People"&&<div className="sales-directory"><div className="sales-view-heading"><div><span className="sales-overline">RELATIONSHIP DIRECTORY</span><h3>People</h3><p>Contacts stored in this organization.</p></div><span className="sales-count">{contacts.length} contacts</span></div>{contacts.filter(person=>[person.first_name,person.last_name,person.email,person.title,person.phone].join(" ").toLowerCase().includes(query.toLowerCase())).map(person=><article className="sales-person-row" key={person.id}><span className="sales-initials">{initials(person.first_name+" "+person.last_name)}</span><div><b>{person.first_name} {person.last_name}</b><small>{person.title||"Contact"} · {person.email}</small></div><a href={"mailto:"+person.email} aria-label={"Email "+person.first_name}><Mail size={15}/></a></article>)}{!contacts.length&&<div className="sales-blank"><Users/><b>No contacts yet</b><span>Contacts added in CRM will appear here.</span></div>}</div>}

    {tab==="Companies"&&<div className="sales-directory"><div className="sales-view-heading"><div><span className="sales-overline">ACCOUNT DIRECTORY</span><h3>Companies</h3><p>Organizations linked to your customer relationships.</p></div><span className="sales-count">{companies.length} accounts</span></div>{companies.filter(company=>[company.name,company.domain,company.industry,company.status].join(" ").toLowerCase().includes(query.toLowerCase())).map(company=><article className="sales-company-row" key={company.id}><span className="sales-company-mark"><Building2 size={17}/></span><div><b>{company.name}</b><small>{company.industry||"Industry not set"} · {company.domain||"No domain"}</small></div><span className="sales-company-status">{statusLabel(company.status)}</span></article>)}{!companies.length&&<div className="sales-blank"><Building2/><b>No company accounts yet</b><span>Companies linked through CRM contacts will appear here.</span></div>}</div>}

    {showLeadForm&&<div className="sales-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setShowLeadForm(false);}}><section className="sales-modal" role="dialog" aria-modal="true" aria-labelledby="sales-modal-title"><header><div><span className="sales-overline">NEW RELATIONSHIP</span><h3 id="sales-modal-title">Add a prospect</h3></div><button className="sales-icon-button" onClick={()=>setShowLeadForm(false)} aria-label="Close"><X size={16}/></button></header><form onSubmit={createLead}><label>Prospect name<input required maxLength={160} autoFocus value={leadName} onChange={event=>setLeadName(event.target.value)} placeholder="Person or company name"/></label><label>Email address<input type="email" maxLength={254} value={leadEmail} onChange={event=>setLeadEmail(event.target.value)} placeholder="name@company.com"/></label><label>Phone number<input maxLength={32} value={leadPhone} onChange={event=>setLeadPhone(event.target.value)} placeholder="+91…"/></label><label>Lead source<select value={leadSource} onChange={event=>setLeadSource(event.target.value)}>{["website","referral","campaign","event","partner","manual","other"].map(value=><option key={value} value={value}>{statusLabel(value)}</option>)}</select></label><label>Context notes<textarea rows={3} maxLength={2000} value={leadNotes} onChange={event=>setLeadNotes(event.target.value)} placeholder="Add useful context for your team…"/></label><footer><button type="button" className="sales-button sales-button-quiet" onClick={()=>setShowLeadForm(false)}>Cancel</button><button className="sales-button sales-button-primary" disabled={saving}>{saving?"Saving…":<><Plus size={14}/> Save prospect</>}</button></footer></form></section></div>}
  </section>;
}
