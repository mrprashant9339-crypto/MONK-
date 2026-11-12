import { useEffect, useMemo, useState } from "react";
import { Activity, Bell, BriefcaseBusiness, Building2, CheckSquare, ChevronDown, CircleHelp, Command, FileText, FolderKanban, LayoutDashboard, LogOut, Plus, Search, Settings2, ShieldCheck, Users, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type ModuleKey = "overview" | "crm" | "projects" | "tasks" | "teams" | "files" | "activity" | "notifications" | "settings";
type Row = Record<string, unknown> & { id?: string };
type Props = { organizationId: string; organizationName: string; onBack: () => void };
const db = supabase as any;
const modules: { key: ModuleKey; label: string; icon: typeof LayoutDashboard; table?: string }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "crm", label: "CRM leads", icon: BriefcaseBusiness, table: "leads" },
  { key: "projects", label: "Projects", icon: FolderKanban, table: "projects" },
  { key: "tasks", label: "Tasks", icon: CheckSquare, table: "tasks" },
  { key: "teams", label: "Teams", icon: Users, table: "teams" },
  { key: "files", label: "Documents & files", icon: FileText, table: "files" },
  { key: "activity", label: "Activity", icon: Activity, table: "activities" },
  { key: "notifications", label: "Notifications", icon: Bell, table: "notifications" },
  { key: "settings", label: "Settings", icon: Settings2 },
];
function display(value: unknown) { if (value === null || value === undefined || value === "") return "—"; if (typeof value === "object") return JSON.stringify(value); return String(value); }
export default function WorkspaceDashboard({ organizationId, organizationName, onBack }: Props) {
  const [active,setActive] = useState<ModuleKey>("overview");
  const [rows,setRows] = useState<Row[]>([]);
  const [counts,setCounts] = useState<Record<string,number>>({});
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [query,setQuery] = useState("");
  const [showCreate,setShowCreate] = useState(false);
  const [newName,setNewName] = useState("");
  const [notice,setNotice] = useState("");
  const [userId,setUserId] = useState("");
  const selected = modules.find(m=>m.key===active) ?? modules[0];
  useEffect(()=>{ void supabase.auth.getUser().then(({data})=>setUserId(data.user?.id??"")); },[]);
  async function load() {
    setBusy(true); setError("");
    try {
      const table = selected.table;
      if (!table) { setRows([]); setBusy(false); return; }
      let request = db.from(table).select("*").eq("organization_id",organizationId).limit(40);
      if (table === "notifications" && userId) request = request.eq("user_id",userId);
      if (table === "activities") request = request.order("created_at",{ascending:false});
      else request = request.order("created_at",{ascending:false});
      const {data,error:loadError} = await request;
      if (loadError) throw loadError;
      setRows((data??[]) as Row[]);
    } catch (e) { setError(e instanceof Error?e.message:"Unable to load this module."); setRows([]); }
    finally { setBusy(false); }
  }
  useEffect(()=>{void load();},[active,organizationId,userId]);
  useEffect(()=>{
    let cancelled=false;
    async function loadCounts(){
      const tables=["companies","contacts","leads","projects","tasks","teams","files","opportunities"];
      const results=await Promise.all(tables.map(async table=>{
        const {count,error:countError}=await db.from(table).select("id",{count:"exact",head:true}).eq("organization_id",organizationId);
        return [table,countError?0:(count??0)] as const;
      }));
      if(!cancelled)setCounts(Object.fromEntries(results));
    }
    void loadCounts(); return()=>{cancelled=true};
  },[organizationId]);
  const filtered = useMemo(()=>rows.filter(row=>JSON.stringify(row).toLowerCase().includes(query.toLowerCase())),[rows,query]);
  async function createItem(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      if(active==="teams") {
        const {error:rpcError}=await db.rpc("create_team",{target_org:organizationId,team_name:newName,team_description:"",team_type:"functional",parent_team:null});
        if(rpcError)throw rpcError;
      } else if(active==="crm") {
        const {error:rpcError}=await supabase.rpc("create_lead",{lead_name:newName,lead_email:null,lead_phone:null,lead_source:"manual",lead_notes:"Created from MONK workspace"});
        if(rpcError)throw rpcError;
      } else throw new Error("Creation workflow is not available in this module yet.");
      setNewName("");setShowCreate(false);setNotice("Record created.");await load();
    } catch(e){setError(e instanceof Error?e.message:"Could not create record.");}
    finally{setBusy(false)}
  }
  const title = active==="overview"?"Workspace overview":selected.label;
  return <div className="monk-workspace">
    <aside className="workspace-sidebar">
      <button className="workspace-brand" onClick={onBack}>monk<span>.</span></button>
      <button className="workspace-org-switch" onClick={onBack}><span className="workspace-org-mark"><Building2 size={17}/></span><span><b>{organizationName}</b><small>Workspace</small></span><ChevronDown size={14}/></button>
      <div className="workspace-nav-label">WORKSPACE</div>
      {modules.slice(0,7).map(item=><button key={item.key} className={active===item.key?"workspace-nav active":"workspace-nav"} onClick={()=>{setActive(item.key);setQuery("");setNotice("");}}><item.icon size={17}/>{item.label}</button>)}
      <div className="workspace-nav-label">PERSONAL</div>
      {modules.slice(7).map(item=><button key={item.key} className={active===item.key?"workspace-nav active":"workspace-nav"} onClick={()=>setActive(item.key)}><item.icon size={17}/>{item.label}</button>)}
      <div className="workspace-sidebar-bottom"><div className="workspace-secure"><ShieldCheck size={15}/> Tenant-scoped workspace</div><button className="workspace-nav" onClick={onBack}><LogOut size={17}/> Organization hub</button></div>
    </aside>
    <main className="workspace-main">
      <header className="workspace-topbar"><div className="workspace-breadcrumb">MONK <span>/</span> {title}</div><label className="workspace-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search this workspace"/><kbd><Command size={11}/> K</kbd></label><button className="workspace-icon-button" aria-label="Help"><CircleHelp size={18}/></button><button className="workspace-avatar" title="Account">{organizationName.slice(0,1).toUpperCase()}</button></header>
      <div className="workspace-content">
        <div className="workspace-page-head"><div><div className="workspace-eyebrow">{organizationName.toUpperCase()}</div><h1>{title}</h1><p>{active==="overview"?"A connected view of customers, projects and the work moving forward.":`Manage ${selected.label.toLowerCase()} across your organization.`}</p></div>{active!=="overview"&&["crm","teams"].includes(active)&&<button className="workspace-primary" onClick={()=>setShowCreate(v=>!v)}><Plus size={16}/> Create {active==="teams"?"team":"lead"}</button>}</div>
        {error&&<div className="workspace-alert error"><X size={15}/>{error}</div>}{notice&&<div className="workspace-alert">{notice}</div>}
        {active==="overview"?<><div className="workspace-metrics">{[["Companies",counts.companies??0],["Contacts",counts.contacts??0],["Open leads",counts.leads??0],["Projects",counts.projects??0],["Tasks",counts.tasks??0],["Teams",counts.teams??0]].map(([label,value])=><article className="workspace-metric" key={label}><span>{label}</span><b>{value}</b><small>Current workspace records</small></article>)}</div><div className="workspace-overview-grid"><section className="workspace-panel"><div className="workspace-panel-head"><div><h2>Get started</h2><p>Build your workspace around your team.</p></div></div>{[["Invite your team","Bring people into your organization."],["Create your first team","Group people around the work."],["Set up your CRM pipeline","Track leads and opportunities."],["Create a project","Plan and deliver work together."],["Add shared files","Keep important documents organized."]].map(([a,b],i)=><div className="workspace-check-row" key={a}><span>{i+1}</span><div><b>{a}</b><small>{b}</small></div><button onClick={()=>setActive(i===1?"teams":i===2?"crm":i===3?"projects":i===4?"files":"settings")}>Open</button></div>)}</section><section className="workspace-panel"><div className="workspace-panel-head"><div><h2>Workspace modules</h2><p>Navigate your business operations.</p></div></div><div className="workspace-module-grid">{modules.slice(1,7).map(item=><button key={item.key} onClick={()=>setActive(item.key)}><item.icon size={19}/><b>{item.label}</b><small>Open module <span>→</span></small></button>)}</div></section></div></>:active==="settings"?<section className="workspace-panel"><h2>Workspace settings</h2><p>Organization profile, member access, roles, integrations and security settings.</p><div className="workspace-module-grid">{["Members & invitations","Roles & permissions","Teams & access","Organization profile","Integrations","Audit log"].map((x,i)=><button key={x} onClick={()=>setActive(i===2?"teams":i===5?"activity":"settings")}><Settings2 size={18}/><b>{x}</b><small>{i===2?"Manage teams":"Configuration area"}</small></button>)}</div></section>:<section className="workspace-panel"><div className="workspace-panel-head"><div><h2>{selected.label}</h2><p>{rows.length} records loaded · organization scoped</p></div><button className="workspace-refresh" onClick={()=>void load()}>Refresh</button></div>{showCreate&&<form className="workspace-create-form" onSubmit={createItem}><input required value={newName} onChange={e=>setNewName(e.target.value)} placeholder={active==="teams"?"Team name":"Lead name"}/><button disabled={busy} className="workspace-primary">Save</button><button type="button" onClick={()=>setShowCreate(false)}>Cancel</button></form>}{busy?<div className="workspace-empty">Loading {selected.label.toLowerCase()}…</div>:filtered.length===0?<div className="workspace-empty"><FolderKanban size={25}/><b>No records yet</b><span>New {selected.label.toLowerCase()} will appear here when added.</span></div>:<div className="workspace-record-list">{filtered.map((row,i)=><article key={String(row.id??i)}><div className="workspace-record-icon"><selected.icon size={17}/></div><div className="workspace-record-copy"><b>{display(row.name??row.title??row.body??row.email??row.resource_type??"Workspace record")}</b><small>{display(row.status??row.role??row.category??row.kind??row.created_at??"")}</small></div><span>{display(row.updated_at??row.created_at??"")}</span></article>)}</div>}</section>}
        <footer className="workspace-footer">MONK Workspace · Changes are subject to your organization permissions.</footer>
      </div>
    </main>
  </div>;
}
