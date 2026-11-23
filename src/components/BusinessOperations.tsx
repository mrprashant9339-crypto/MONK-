import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, Boxes, Building2, CalendarClock, CheckCircle2, ChevronRight, CircleDollarSign, ClipboardList, Download, FileText, Layers3, Package, PieChart, RefreshCw, Search, ShieldCheck, Sparkles, Target, Users, Wallet } from "lucide-react";
import { supabase } from "../lib/supabase";
import "../business-operations.css";

type View = "Command" | "Organization" | "Deals" | "Activities" | "Products" | "Inventory" | "Orders" | "Invoices" | "Finance" | "Reports";
type Lead = {id:string;name:string;email:string|null;source:string;status:string;score:number;created_at:string};
type Contact = {id:string;first_name:string;last_name:string;email:string;title:string|null;created_at:string};
type Company = {id:string;name:string;industry:string|null;domain:string|null;status:string};
type Project = {id:string;name:string;status:string;created_at?:string};
type Member = {member_id:string;user_id:string;email:string;full_name:string;role:string;status:string;created_at:string};

const views: {name:View;icon:typeof Building2;eyebrow:string;title:string;description:string;kind:string}[]=[
{name:"Command",icon:Sparkles,eyebrow:"BUSINESS CONTROL ROOM",title:"The whole business, in one view.",description:"A live operational snapshot from records already connected to this workspace.",kind:"command"},
{name:"Organization",icon:Building2,eyebrow:"ORGANIZATION STRUCTURE",title:"Your organization, clearly mapped.",description:"Review the active tenant and see which operating structures are configured.",kind:"organization"},
{name:"Deals",icon:CircleDollarSign,eyebrow:"COMMERCIAL PIPELINE",title:"Move opportunities with intent.",description:"Review real CRM prospects while the dedicated deal and quotation records are provisioned.",kind:"deals"},
{name:"Activities",icon:CalendarClock,eyebrow:"TEAM EXECUTION",title:"Keep the next action visible.",description:"Recent prospect and project records are shown as source records—not fabricated activity events.",kind:"activities"},
{name:"Products",icon:Package,eyebrow:"PRODUCT CATALOG",title:"A clean home for every product.",description:"Product catalog, variants, price lists and service definitions are awaiting their secured data layer.",kind:"products"},
{name:"Inventory",icon:Boxes,eyebrow:"STOCK OPERATIONS",title:"Know what is on hand.",description:"Warehouse balances, stock movements and reorder rules require the inventory data layer.",kind:"inventory"},
{name:"Orders",icon:ClipboardList,eyebrow:"ORDER MANAGEMENT",title:"From request to fulfilment.",description:"Order creation, fulfilment and returns will activate after server-side order workflows are installed.",kind:"orders"},
{name:"Invoices",icon:FileText,eyebrow:"BILLING WORKSPACE",title:"Billing with a reliable audit trail.",description:"Invoice numbering, tax calculations and payment reconciliation are not enabled until the billing service is ready.",kind:"invoices"},
{name:"Finance",icon:Wallet,eyebrow:"FINANCE LEDGER",title:"Financial clarity starts with trusted entries.",description:"No money movement, balances or tax values are shown until the ledger and permissions are connected.",kind:"finance"},
{name:"Reports",icon:PieChart,eyebrow:"BUSINESS INTELLIGENCE",title:"Decisions grounded in actual records.",description:"Reports below are calculated only from live CRM and project records available to this organization.",kind:"reports"}
];

function safeCsv(rows:string[][]){return rows.map(row=>row.map(value=>{const first=value.trimStart()[0];const safe=first&&"=+-@".includes(first)?"'"+value:value;return '"'+safe.split('"').join('""')+'"';}).join(",")).join("\r\n");}

export default function BusinessOperations({organizationId,initialView="Command"}:{organizationId:string|null;initialView?:string}){
 const [view,setView]=useState<View>(views.some(v=>v.name===initialView)?initialView as View:"Command");
 const [leads,setLeads]=useState<Lead[]>([]);
 const [contacts,setContacts]=useState<Contact[]>([]);
 const [companies,setCompanies]=useState<Company[]>([]);
 const [projects,setProjects]=useState<Project[]>([]);
 const [members,setMembers]=useState<Member[]>([]);
 const [memberAccess,setMemberAccess]=useState<"available"|"restricted"|"unknown">("unknown");
 const [organizationName,setOrganizationName]=useState("");
 const [organizationVertical,setOrganizationVertical]=useState("");
 const [query,setQuery]=useState("");
 const [statusFilter,setStatusFilter]=useState("all");
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [lastUpdated,setLastUpdated]=useState<Date|null>(null);
 const current=views.find(item=>item.name===view)??views[0];

 const load=useCallback(async()=>{
  if(!supabase||!organizationId){setError("Connect an authenticated business workspace to load organization records.");return;}
  setLoading(true);setError("");
  try{
   const [orgResult,leadResult,contactResult,companyResult,projectResult,memberResult]=await Promise.all([
    supabase.from("organizations").select("name,vertical").eq("id",organizationId).single(),
    supabase.from("leads").select("id,name,email,source,status,score,created_at").eq("organization_id",organizationId).is("deleted_at",null).order("created_at",{ascending:false}).limit(500),
    supabase.from("contacts").select("id,first_name,last_name,email,title,created_at").eq("organization_id",organizationId).is("deleted_at",null).order("created_at",{ascending:false}).limit(500),
    supabase.from("companies").select("id,name,industry,domain,status").eq("organization_id",organizationId).is("deleted_at",null).order("created_at",{ascending:false}).limit(500),
    supabase.from("projects").select("id,name,status,created_at").eq("organization_id",organizationId).is("deleted_at",null).order("created_at",{ascending:false}).limit(500),
    supabase.rpc("list_organization_members")
   ]);
   if(orgResult.error)throw orgResult.error;if(leadResult.error)throw leadResult.error;if(contactResult.error)throw contactResult.error;if(companyResult.error)throw companyResult.error;if(projectResult.error)throw projectResult.error;
   setOrganizationName(orgResult.data.name);setOrganizationVertical(orgResult.data.vertical);
   setLeads((leadResult.data??[]) as Lead[]);setContacts((contactResult.data??[]) as Contact[]);setCompanies((companyResult.data??[]) as Company[]);setProjects((projectResult.data??[]) as Project[]);
   if(memberResult.error){setMembers([]);setMemberAccess("restricted");}else{setMembers((memberResult.data??[]) as Member[]);setMemberAccess("available");}
   setLastUpdated(new Date());
  }catch(cause){setError(cause instanceof Error?cause.message:"Business workspace records could not be loaded.");}
  finally{setLoading(false);}
 },[organizationId]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{setView(views.some(v=>v.name===initialView)?initialView as View:"Command");},[initialView]);

 const stageCounts=useMemo(()=>Object.entries(leads.reduce<Record<string,number>>((acc,lead)=>{const key=lead.status||"unspecified";acc[key]=(acc[key]??0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1]),[leads]);
 const filteredLeads=useMemo(()=>leads.filter(lead=>[lead.name,lead.email,lead.source,lead.status].join(" ").toLowerCase().includes(query.toLowerCase())&&(statusFilter==="all"||lead.status===statusFilter)),[leads,query,statusFilter]);
 const qualified=leads.filter(lead=>Number(lead.score)>=70).length;
 const avgScore=leads.length?Math.round(leads.reduce((sum,lead)=>sum+(Number(lead.score)||0),0)/leads.length):0;
 const projectActive=projects.filter(project=>project.status==="active").length;
 const noData=leads.length===0&&contacts.length===0&&companies.length===0&&projects.length===0;

 function exportLeads(){const rows=[["Name","Email","Source","Status","Score","Created"],...filteredLeads.map(l=>[l.name,l.email??"",l.source,l.status,String(l.score),l.created_at])];const url=URL.createObjectURL(new Blob([safeCsv(rows)],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="monk-business-prospects.csv";document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}

 function renderRecords(){return <div className="bo-records">
  <div className="bo-record-tools"><label><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search live records"/></label><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All stages</option>{stageCounts.map(([stage])=><option key={stage} value={stage}>{stage.replace(/[_-]/g," ")}</option>)}</select><button onClick={exportLeads} disabled={!filteredLeads.length}><Download size={14}/> Export</button></div>
  {filteredLeads.length?filteredLeads.map(lead=><article className="bo-record-row" key={lead.id}><span className="bo-record-avatar">{lead.name.trim().split(/\s+/).slice(0,2).map(s=>s[0]).join("").toUpperCase()}</span><div><b>{lead.name}</b><small>{lead.email||"No email"} · {lead.source}</small></div><span className="bo-status">{lead.status.replace(/[_-]/g," ")}</span><strong>{lead.score}<small> score</small></strong></article>):<div className="bo-empty"><Search/><b>No matching prospect records</b><span>Try another search or clear the stage filter.</span></div>}
 </div>}

 if(!organizationId)return <section className="bo-page"><div className="bo-unavailable"><ShieldCheck/><h2>Business workspace required</h2><p>Sign in and select an organization to open business operations.</p></div></section>;

 return <section className={"bo-page bo-"+current.kind}>
  <header className="bo-hero"><div className="bo-hero-copy"><span className="bo-eyebrow"><current.icon size={13}/>{current.eyebrow}</span><h2>{current.title}</h2><p>{current.description}</p><div className="bo-hero-meta"><span><i/> {organizationName||"Organization"}</span><span>{lastUpdated?"Updated "+lastUpdated.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}):"Awaiting sync"}</span></div></div><div className="bo-hero-visual" aria-hidden="true"><div className="bo-visual-orbit orbit-one"/><div className="bo-visual-orbit orbit-two"/><div className="bo-visual-center"><current.icon size={28}/></div><span className="bo-visual-dot dot-one"/><span className="bo-visual-dot dot-two"/><span className="bo-visual-dot dot-three"/></div><div className="bo-hero-actions"><button onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/> {loading?"Syncing":"Refresh data"}</button></div></header>
  <nav className="bo-nav" aria-label="Business operations views">{views.map(item=><button key={item.name} className={view===item.name?"active":""} onClick={()=>{setView(item.name);setQuery("");setStatusFilter("all");}}><item.icon size={15}/><span>{item.name}</span><ChevronRight size={12}/></button>)}</nav>
  {error&&<p className="bo-error" role="alert">{error}</p>}
  {loading&&<div className="bo-loading"><i/>Loading organization data…</div>}

  {view==="Command"&&<div className="bo-command-view">
   <div className="bo-kpi-grid">
    <article><span>Prospects</span><strong>{leads.length}</strong><small>Live CRM records</small><TargetMark/></article>
    <article><span>Qualified leads</span><strong>{qualified}</strong><small>Score 70 or above</small><CheckCircle2/></article>
    <article><span>Contacts</span><strong>{contacts.length}</strong><small>Organization people</small><Users/></article>
    <article><span>Companies</span><strong>{companies.length}</strong><small>Customer accounts</small><Building2/></article>
    <article><span>Active projects</span><strong>{projectActive}</strong><small>Current project records</small><Layers3/></article>
   </div>
   <div className="bo-command-grid"><article className="bo-surface bo-stage-surface"><header><div><span className="bo-label">COMMERCIAL SIGNAL</span><h3>Prospect stages</h3></div><Activity/></header>{stageCounts.length?stageCounts.map(([stage,count],i)=><div className="bo-stage-row" key={stage}><span>{stage.replace(/[_-]/g," ")}</span><div><i style={{width:(count/Math.max(1,leads.length)*100)+"%",animationDelay:i*80+"ms"}}/></div><b>{count}</b></div>):<div className="bo-empty"><Target/><b>No prospects yet</b><span>Lead records will appear after they are created in CRM.</span></div>}</article>
    <article className="bo-surface bo-org-surface"><header><div><span className="bo-label">TENANT CONTEXT</span><h3>Organization snapshot</h3></div><Building2/></header><div className="bo-org-mark">M</div><h4>{organizationName||"Organization"}</h4><p>{organizationVertical||"Business"} workspace</p><div className="bo-org-facts"><span>Organization ID</span><code>{organizationId.slice(0,8)}…{organizationId.slice(-4)}</code><span>Workspace status</span><b>Connected</b></div><button onClick={()=>setView("Organization")}>View organization structure <ArrowUpRight size={14}/></button></article>
    <article className="bo-surface bo-recent-surface"><header><div><span className="bo-label">LATEST RECORDS</span><h3>Recently added prospects</h3></div><button onClick={()=>setView("Deals")}>Open deals view <ArrowUpRight size={14}/></button></header>{leads.slice(0,5).map(lead=><div className="bo-recent-row" key={lead.id}><span>{lead.name.slice(0,1).toUpperCase()}</span><div><b>{lead.name}</b><small>{lead.status.replace(/[_-]/g," ")} · {lead.source}</small></div><time>{new Date(lead.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</time></div>)}{!leads.length&&<div className="bo-empty"><span>No prospect records to display.</span></div>}</article>
   </div>
   {noData&&<p className="bo-hint">This workspace has no business records yet. No example customers, revenue or orders have been inserted.</p>}
  </div>}

  {view==="Organization"&&<div className="bo-organization-view"><div className="bo-section-title"><span className="bo-label">TENANT DIRECTORY</span><h3>Organization structure</h3><p>Organization identity is live. Branch, department and staff administration require their own secured records and role policies.</p></div><div className="bo-organization-grid"><article className="bo-org-card bo-org-primary"><span className="bo-org-emblem">M</span><div><small>ACTIVE ORGANIZATION</small><h3>{organizationName}</h3><p>{organizationVertical} workspace · Organization-scoped access</p></div><CheckCircle2/></article>{[{name:"Branches",icon:Building2,desc:"Multi-location business units, addresses and branch-level access."},{name:"Departments",icon:Layers3,desc:"Department ownership, reporting lines and cost-centre mapping."}].map(item=><article className="bo-structure-card" key={item.name}><item.icon/><h4>{item.name}</h4><p>{item.desc}</p><span>Secure backend schema required</span></article>)}</div><section className="bo-members-panel"><header><div><span className="bo-label">AUTHORIZED DIRECTORY</span><h3>Organization members</h3><p>Visible only when your account has the existing member-list permission.</p></div><span>{memberAccess==="available"?members.length+" members":"Restricted"}</span></header>{memberAccess==="available"?(members.length?members.map(member=><article key={member.member_id}><span className="bo-member-avatar">{(member.full_name||member.email||"M").trim().slice(0,1).toUpperCase()}</span><div><b>{member.full_name||"Name not set"}</b><small>{member.role} · {member.status}</small></div><time>{new Date(member.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</time></article>):<p className="bo-members-empty">No member records returned.</p>):<p className="bo-members-empty">Your account does not have permission to list organization members.</p>}</section></div>}

  {view==="Deals"&&<div className="bo-deals-view"><div className="bo-section-title"><span className="bo-label">LEAD-TO-DEAL JOURNEY</span><h3>Opportunity desk</h3><p>Existing prospects are live. Deal amount, close date, owner assignment and quote linkage are not inferred from lead fields.</p></div><div className="bo-deal-stats"><article><small>Prospects</small><b>{leads.length}</b></article><article><small>Qualified</small><b>{qualified}</b></article><article><small>Average score</small><b>{leads.length?avgScore+" / 100":"—"}</b></article></div>{renderRecords()}<div className="bo-backend-note"><ShieldCheck/><div><b>Deal objects are not yet enabled</b><p>Deal stages, commercial values, owner assignment, activities and quotations need dedicated tables, row-level security and permission-checked RPCs. The screen will not create a false deal from a lead.</p></div></div></div>}

  {view==="Activities"&&<div className="bo-activities-view"><div className="bo-section-title"><span className="bo-label">RECENT WORK SIGNALS</span><h3>Activity timeline</h3><p>Source record creation timestamps, not an invented audit log.</p></div><div className="bo-timeline">{[...leads.map(x=>({id:x.id,title:"Prospect added: "+x.name,detail:x.source,date:x.created_at,kind:"lead"})),...projects.map(x=>({id:x.id,title:"Project record: "+x.name,detail:x.status,date:x.created_at??"",kind:"project"}))].filter(x=>x.date).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30).map((item,i)=><article key={item.kind+item.id} style={{"--timeline-index":i} as React.CSSProperties}><span className="bo-timeline-icon">{item.kind==="lead"?<TargetMark/>:<Layers3/>}</span><div><b>{item.title}</b><small>{item.kind.toUpperCase()} SOURCE · {item.detail}</small></div><time>{new Date(item.date).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}</time></article>)}{!leads.length&&!projects.some(p=>p.created_at)&&<div className="bo-empty"><CalendarClock/><b>No source events available</b><span>Once source records exist, their creation times appear here.</span></div>}</div><div className="bo-backend-note"><ShieldCheck/><div><b>Persistent activity feed pending</b><p>Comments, reminders, calls, meetings and follow-up completion require an append-only activity log and scoped write operations.</p></div></div></div>}

  {view==="Products"&&<ResourcePanel icon={Package} title="Product catalog" items={["Products & services","Categories and variants","SKU and barcode registry","Price lists and unit definitions"]} explanation="No product table or catalog mutation API exists in the reviewed migrations. Product creation stays unavailable until the secured catalog service is installed."/>}
  {view==="Inventory"&&<ResourcePanel icon={Boxes} title="Inventory control" items={["Warehouses and stock locations","On-hand and reserved quantities","Stock movement ledger","Reorder points and low-stock rules","Transfers and adjustments"]} explanation="Inventory balances must be ledger-derived and concurrency-safe. No stock count or adjustment is simulated in this interface."/>}
  {view==="Orders"&&<ResourcePanel icon={ClipboardList} title="Order management" items={["Sales orders and line items","Fulfilment and shipment status","Returns and cancellations","Customer order history"]} explanation="Order placement, fulfilment and returns are not enabled until order tables, validation and permission-checked server workflows are installed."/>}
  {view==="Invoices"&&<ResourcePanel icon={FileText} title="Invoices & billing" items={["Invoice numbering and line items","Tax and discount calculations","Payment status and reconciliation","Credit notes and refunds"]} explanation="No invoice number, tax amount, payment status or PDF is fabricated. Billing activation requires verified tax rules and a secured invoice service."/>}
  {view==="Finance"&&<div className="bo-finance-view"><div className="bo-finance-head"><div><span className="bo-label">FINANCIAL CONTROL / LEDGER</span><h3>Finance workspace</h3><p>Financial values stay blank until backed by posted ledger entries.</p></div><Wallet/></div><div className="bo-finance-empty"><div className="bo-ledger-art"><div/><div/><div/><div/><div/></div><b>Ledger not connected</b><span>There are no verified income, expense, cash-flow or account balances available.</span><small>NO FINANCIAL DATA HAS BEEN GENERATED</small></div><div className="bo-finance-grid">{["Income & expenses","Accounts & transactions","Cash flow","Tax configuration"].map((name,i)=><article key={name}><span>0{i+1}</span><h4>{name}</h4><p>Requires ledger schema, posting rules and financial permissions.</p><ShieldCheck/></article>)}</div></div>}
  {view==="Reports"&&<div className="bo-reports-view"><div className="bo-section-title"><span className="bo-label">EVIDENCE-BASED REPORTING</span><h3>Business reports</h3><p>Only metrics derived from connected records are available in this release.</p></div><div className="bo-report-grid"><article><span>CRM / PROSPECTS</span><b>{leads.length}</b><small>Active prospect records</small></article><article><span>CRM / QUALIFIED</span><b>{qualified}</b><small>Score ≥ 70</small></article><article><span>CRM / CONTACTS</span><b>{contacts.length}</b><small>Saved contacts</small></article><article><span>CRM / COMPANIES</span><b>{companies.length}</b><small>Tracked companies</small></article><article><span>PROJECTS / ACTIVE</span><b>{projectActive}</b><small>Active projects</small></article><article><span>CRM / AVG SCORE</span><b>{leads.length?avgScore:"—"}</b><small>Mean lead score</small></article></div><button className="bo-report-export" onClick={exportLeads} disabled={!filteredLeads.length}><Download size={15}/> Export live prospect report</button><p className="bo-hint">No revenue, margin, conversion, inventory turnover or tax report is displayed without source records.</p></div>}
 </section>;
}

function TargetMark(){return <span className="bo-target-mark"><Activity size={16}/></span>;}
function ResourcePanel({icon:Icon,title,items,explanation}:{icon:typeof Package;title:string;items:string[];explanation:string}){
 return <div className="bo-resource-view"><header><span className="bo-label">BUSINESS SYSTEM / FOUNDATION</span><h3>{title}</h3><p>Dedicated page composition is ready; persistent records remain gated behind secure backend setup.</p></header><div className="bo-resource-layout"><div className="bo-resource-icon"><Icon size={34}/></div><div className="bo-resource-list">{items.map((item,i)=><article key={item}><span>0{i+1}</span><b>{item}</b><small>Schema and permission contract required</small><ChevronRight size={15}/></article>)}</div></div><div className="bo-backend-note"><ShieldCheck/><div><b>Backend activation required</b><p>{explanation}</p></div></div></div>;
}
