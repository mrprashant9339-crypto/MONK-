import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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
const text = (v: unknown) => v == null || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);
export default function WorkspaceDashboard({ organizationId, organizationName, onBack }: Props) {
  const [active,setActive] = useState<ModuleKey>("overview");
  const [rows,setRows] = useState<Row[]>([]);
  const [projects,setProjects] = useState<Row[]>([]);
  const [counts,setCounts] = useState<Record<string,number>>({});
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [query,setQuery] = useState("");
  const [showCreate,setShowCreate] = useState(false);
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [projectId,setProjectId] = useState("");
  const [userId,setUserId] = useState("");
  const selected = modules.find(m=>m.key===active) ?? modules[0];

  useEffect(()=>{ void supabase.auth.getUser().then(({data})=>setUserId(data.user?.id??"")); },[]);
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      if (selected.table) {
        let request = db.from(selected.table).select("*").eq("organization_id",organizationId).limit(50).order("created_at",{ascending:false});
        if (selected.table === "notifications" && userId) request = request.eq("user_id",userId);
        if (selected.table === "files") request = request.is("deleted_at",null);
        const {data,error:loadError} = await request;
        if (loadError) throw loadError;
        setRows((data??[]) as Row[]);
      } else setRows([]);
    } catch(e) { setError(e instanceof Error?e.message:"Unable to load this module."); setRows([]); }
    finally { setBusy(false); }
  },[selected.table,organizationId,userId]);

  useEffect(()=>{ void load(); },[load]);
  useEffect(()=>{
    let cancelled=false;
    async function refreshSummary() {
      const tables=["companies","contacts","leads","projects","tasks","teams","files","opportunities"];
      const results=await Promise.all(tables.map(async table=>{
        const {count,error:countError}=await db.from(table).select("id",{count:"exact",head:true}).eq("organization_id",organizationId);
        return [table,countError?0:(count??0)] as const;
      }));
      const {data:projectRows}=await db.from("projects").select("id,name").eq("organization_id",organizationId).is("deleted_at",null).order("created_at",{ascending:false}).limit(100);
      if(!cancelled){setCounts(Object.fromEntries(results));setProjects((projectRows??[]) as Row[]);}
    }
    void refreshSummary(); return()=>{cancelled=true};
  },[organizationId]);

  const filtered=useMemo(()=>rows.filter(row=>JSON.stringify(row).toLowerCase().includes(query.toLowerCase())),[rows,query]);
  async function createRecord(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      let result;
      if(active==="crm") result=await db.rpc("create_lead",{lead_name:name.trim(),lead_email:email.trim()||null,lead_phone:null,lead_source:"manual",lead_notes:"Created from MONK workspace"});
      else if(active==="teams") result=await db.rpc("create_team",{target_org:organizationId,team_name:name.trim(),team_description:"",team_type:"functional",parent_team:null});
      else if(active==="projects") result=await db.rpc("create_project",{project_name:name.trim(),project_code:name.trim().toUpperCase().replace(/[^A-Z0-9]+/g,"-").slice(0,20),project_description:"",project_client_company_id:null,project_due_date:null,project_visibility:"internal"});
      else if(active==="tasks") {
        if(!projectId) throw new Error("Select a project before creating a task.");
        result=await db.rpc("create_task",{task_project_id:projectId,task_title:name.trim(),task_due_date:null,task_priority:"medium"});
      } else throw new Error("Creation is not available for this module.");
      if(result.error) throw result.error;
      setName("");setEmail("");setProjectId("");setShowCreate(false);setNotice("Record created successfully.");await load();
    } catch(e) { setError(e instanceof Error?e.message:"Could not create this record."); }
    finally { setBusy(false); }
  }
  const canCreate=["crm","teams","projects","tasks"].includes(active);
  const title=active==="overview"?"Workspace overview":selected.label;
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
        <div className="workspace-page-head"><div><div className="workspace-eyebrow">{organizationName.toUpperCase()}</div><h1>{title}</h1><p>{active==="overview"?"A connected view of customers, projects and the work moving forward.":`Manage ${selected.label.toLowerCase()} across your organization.`}</p></div>{canCreate&&<button className="workspace-primary" onClick={()=>setShowCreate(v=>!v)}><Plus size={16}/> Create {active==="crm"?"lead":active==="teams"?"team":active==="projects"?"project":"task"}</button>}</div>
        {error&&<div className="workspace-alert error"><X size={15}/>{error}</div>}{notice&&<div className="workspace-alert">{notice}</div>}
        {active==="overview"?<><div className="workspace-metrics">{[["Companies",counts.companies??0],["Contacts",counts.contacts??0],["Open leads",counts.leads??0],["Projects",counts.projects??0],["Tasks",counts.tasks??0],["Teams",counts.teams??0]].map(([label,value])=><article className="workspace-metric" key={label}><span>{label}</span><b>{value}</b><small>Current workspace records</small></article>)}</div><div className="workspace-overview-grid"><section className="workspace-panel"><div className="workspace-panel-head"><div><h2>Get started</h2><p>Build your workspace around your team.</p></div></div>{[["Invite your team","Bring people into your organization."],["Create your first team","Group people around the work."],["Set up your CRM pipeline","Track leads and opportunities."],["Create a project","Plan and deliver work together."],["Add shared files","Keep important documents organized."]].map(([a,b],i)=><div className="workspace-check-row" key={a}><span>{i+1}</span><div><b>{a}</b><small>{b}</small></div><button onClick={()=>setActive(i===1?"teams":i===2?"crm":i===3?"projects":i===4?"files":"settings")}>Open</button></div>)}</section><section className="workspace-panel"><div className="workspace-panel-head"><div><h2>Workspace modules</h2><p>Navigate your business operations.</p></div></div><div className="workspace-module-grid">{modules.slice(1,7).map(item=><button key={item.key} onClick={()=>setActive(item.key)}><item.icon size={19}/><b>{item.label}</b><small>Open module <span>→</span></small></button>)}</div></section></div></>:active==="settings"?<section className="workspace-panel"><h2>Workspace settings</h2><p>Organization profile, member access, roles, integrations and security settings.</p><div className="workspace-module-grid">{["Members & invitations","Roles & permissions","Teams & access","Organization profile","Integrations","Audit log"].map((x,i)=><button key={x} onClick={()=>setActive(i===2?"teams":i===5?"activity":"settings")}><Settings2 size={18}/><b>{x}</b><small>{i===2?"Manage teams":"Configuration area"}</small></button>)}</div></section>:<section className="workspace-panel"><div className="workspace-panel-head"><div><h2>{selected.label}</h2><p>{rows.length} records loaded · organization scoped</p></div><button className="workspace-refresh" onClick={()=>void load()}>Refresh</button></div>
          {showCreate&&<form className="workspace-create-form" onSubmit={createRecord}><input required maxLength={160} value={name} onChange={e=>setName(e.target.value)} placeholder={active==="crm"?"Lead name":active==="teams"?"Team name":active==="projects"?"Project name":"Task title"}/>{active==="crm"&&<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Lead email (optional)"/>}{active==="tasks"&&<select required value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">Select project</option>{projects.map(p=><option key={String(p.id)} value={String(p.id)}>{text(p.name)}</option>)}</select>}<button disabled={busy} className="workspace-primary">Save</button><button type="button" onClick={()=>setShowCreate(false)}>Cancel</button></form>}
          {busy?<div className="workspace-empty">Loading {selected.label.toLowerCase()}…</div>:filtered.length===0?<div className="workspace-empty"><FolderKanban size={25}/><b>No records yet</b><span>Records for this organization will appear here.</span></div>:<div className="workspace-record-list">{filtered.map((row,i)=><article key={String(row.id??i)}><div className="workspace-record-icon"><selected.icon size={17}/></div><div className="workspace-record-copy"><b>{text(row.name??row.title??row.body??row.email??row.resource_type??"Workspace record")}</b><small>{text(row.status??row.role??row.category??row.kind??row.created_at??"")}</small></div><span>{text(row.updated_at??row.created_at??"")}</span></article>)}</div>}
        </section>}
        <footer className="workspace-footer">MONK Workspace · Changes are subject to your organization permissions.</footer>
      </div>
    </main>
  </div>;
}
