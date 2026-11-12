import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Bell, Check, ChevronRight, Command, LayoutGrid, Plus, Search, ShieldCheck, Sparkles, Target, Workflow, Zap, LoaderCircle, LogOut, Pencil, Trash2, Play, Pause, RotateCcw, Users, Activity, GraduationCap, Briefcase, FolderKanban, CheckSquare, FileText, BarChart3, Wallet, Store, Bot, Settings, Building2, CalendarDays, ArrowUpRight as OpenArrow } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import WorkspaceManagement from "./components/WorkspaceManagement";
import EducationManagement from "./components/EducationManagement";
import CRMManagement from "./components/CRMManagement";

type Project = { id: string; name: string; code: string; description?: string | null; due_date?: string | null; visibility?: "internal" | "client_visible"; status?: "draft" | "active" | "at_risk" | "in_review" | "completed" };
type Task = { id: string; title: string; status: "todo" | "in_progress" | "blocked" | "review" | "done"; priority: "low" | "medium" | "high" | "urgent"; due_date: string | null; project_id: string };
const demoTasks: Task[] = [
  { id: "demo-1", title: "Define the next milestone", status: "todo", priority: "high", due_date: null, project_id: "demo" },
  { id: "demo-2", title: "Review product requirements", status: "done", priority: "medium", due_date: null, project_id: "demo" },
  { id: "demo-3", title: "Prepare the weekly execution plan", status: "in_progress", priority: "medium", due_date: null, project_id: "demo" }
];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [tasks, setTasks] = useState<Task[]>(demoTasks);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState("");
  const [organizationName, setOrganizationName] = useState("MONK Studio");
  const [organizationVertical, setOrganizationVertical] = useState<"business" | "education">("business");
  const [organizationSlug, setOrganizationSlug] = useState("monk-studio");
  const [projectName, setProjectName] = useState("MONK Workspace");
  const [projectCode, setProjectCode] = useState("MONK-001");
  const [active, setActive] = useState("Overview");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);

  const loadWorkspace = useCallback(async () => {
    if (!supabase || !session) return;
    setLoading(true);
    setWorkspaceError("");
    try {
      const orgResult = await supabase.rpc("current_organization_id");
      if (orgResult.error) throw orgResult.error;
      const orgId = orgResult.data as string | null;
      setOrganizationId(orgId);
      if (!orgId) {
        setOrganizationName("MONK Studio");
        setOrganizationVertical("business");
        setProjects([]);
        setTasks([]);
        setProjectId("");
        setWorkspaceReady(true);
        return;
      }
      const organizationResult = await supabase.from("organizations")
        .select("name,vertical").eq("id", orgId).single();
      if (organizationResult.error) throw organizationResult.error;
      setOrganizationName(organizationResult.data.name);
      setOrganizationVertical(organizationResult.data.vertical === "education" ? "education" : "business");
      const projectResult = await supabase.from("projects")
        .select("id,name,code,description,due_date,visibility,status")
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (projectResult.error) throw projectResult.error;
      const nextProjects = (projectResult.data ?? []) as Project[];
      setProjects(nextProjects);
      const selected = nextProjects.some(p => p.id === projectId) ? projectId : nextProjects[0]?.id ?? "";
      setProjectId(selected);
      if (!selected) {
        setTasks([]);
        setWorkspaceReady(true);
        return;
      }
      const taskResult = await supabase.from("tasks")
        .select("id,title,status,priority,due_date,project_id")
        .eq("organization_id", orgId)
        .eq("project_id", selected)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (taskResult.error) throw taskResult.error;
      setTasks((taskResult.data ?? []) as Task[]);
      setWorkspaceReady(true);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Unable to load workspace data.");
    } finally {
      setLoading(false);
    }
  }, [session, projectId]);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { if (alive) setSession(next); });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (session && supabase) void loadWorkspace();
  }, [session, loadWorkspace]);

  useEffect(() => {
    if (organizationVertical !== "education" && active === "Education") setActive("Overview");
  }, [organizationVertical, active]);

  useEffect(() => {
    if (!focusRunning) return;
    const timer = window.setInterval(() => {
      setFocusSeconds(current => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [focusRunning]);

  useEffect(() => {
    if (focusSeconds === 0) setFocusRunning(false);
  }, [focusSeconds]);

  useEffect(() => {
    if (!session || !supabase) return;
    const token = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("invite");
    if (!token) return;
    let active = true;
    void (async () => {
      const { error } = await supabase.rpc("accept_organization_invitation", { invite_token: token });
      if (!active) return;
      if (error) { setWorkspaceError(error.message); return; }
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
      setWorkspaceError("");
      setActive("Team");
      await loadWorkspace();
    })();
    return () => { active = false; };
  }, [session, loadWorkspace]);

  async function signIn(mode: "login" | "signup") {
    if (!supabase) return;
    if (!email.trim() || password.length < 8) { setAuthMessage("Enter a valid email and a password with at least 8 characters."); return; }
    setAuthBusy(true); setAuthMessage("");
    try {
      const result = mode === "login"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
      if (result.error) {
        setAuthMessage(result.error.message);
        return;
      }
      setAuthMessage(mode === "signup" && !result.data.session
        ? "Account created. Check your inbox, confirm your email, then sign in."
        : "Authentication successful.");
      if (result.data.session) setSession(result.data.session);
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Authentication request failed. Check your connection and try again.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function createOrganization(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !organizationName.trim() || !organizationSlug.trim()) return;
    setSaving(true); setWorkspaceError("");
    const { error } = await supabase.rpc("create_organization", {
      org_name: organizationName.trim(), org_slug: organizationSlug.toLowerCase().trim(),
      org_country: "IN", org_timezone: "Asia/Kolkata", org_currency: "INR", org_locale: "en-IN", org_industry: organizationVertical === "education" ? "Education" : "Technology", org_vertical: organizationVertical
    });
    setSaving(false);
    if (error) { setWorkspaceError(error.message); return; }
    setOrganizationId("created");
    await loadWorkspace();
  }

  async function createProject(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !projectName.trim() || !projectCode.trim()) return;
    setSaving(true); setWorkspaceError("");
    const { error } = await supabase.rpc("create_project", {
      project_name: projectName.trim(), project_code: projectCode.toUpperCase().trim(),
      project_description: "MONK primary workspace", project_client_company_id: null,
      project_due_date: null, project_visibility: "internal"
    });
    setSaving(false);
    if (error) { setWorkspaceError(error.message); return; }
    await loadWorkspace();
  }

  async function addTask(e: FormEvent) {
    e.preventDefault();
    const title = newTask.trim();
    if (!title) return;
    if (!supabase || !isSupabaseConfigured || !session) {
      setTasks(current => [{ id: String(Date.now()), title, status: "todo", priority: "medium", due_date: null, project_id: "demo" }, ...current]);
      setNewTask("");
      return;
    }
    if (!projectId) { setWorkspaceError("Create or select a project before adding tasks."); return; }
    setSaving(true); setWorkspaceError("");
    const { error } = await supabase.rpc("create_task", {
      task_project_id: projectId, task_title: title, task_due_date: null, task_priority: "medium"
    });
    setSaving(false);
    if (error) { setWorkspaceError(error.message); return; }
    setNewTask("");
    await loadWorkspace();
  }

  async function toggleTask(task: Task) {
    const nextStatus = task.status === "done" ? "todo" : "done";
    if (!supabase || !isSupabaseConfigured || !session || task.id.startsWith("demo-")) {
      setTasks(current => current.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
      return;
    }
    setSaving(true); setWorkspaceError("");
    const { error } = await supabase.rpc("update_task", {
      task_id: task.id, next_status: nextStatus, next_blocker_reason: null
    });
    setSaving(false);
    if (error) { setWorkspaceError(error.message); return; }
    await loadWorkspace();
  }


  async function editTask(task: Task) {
    const title = window.prompt("Update task title", task.title);
    if (title === null) return;
    const nextTitle = title.trim();
    if (!nextTitle || nextTitle.length > 240) { setWorkspaceError("Task title must contain 1–240 characters."); return; }
    if (!supabase || !session || task.id.startsWith("demo-")) {
      setTasks(current => current.map(item => item.id === task.id ? { ...item, title: nextTitle } : item));
      return;
    }
    setSaving(true); setWorkspaceError("");
    const { error } = await supabase.rpc("update_task_details", {
      target_task_id: task.id, next_title: nextTitle, next_priority: task.priority, next_due_date: task.due_date
    });
    setSaving(false);
    if (error) { setWorkspaceError(error.message); return; }
    await loadWorkspace();
  }

  async function archiveTask(task: Task) {
    if (!window.confirm(`Archive “${task.title}”? This hides it from the active task list.`)) return;
    if (!supabase || !session || task.id.startsWith("demo-")) {
      setTasks(current => current.filter(item => item.id !== task.id));
      return;
    }
    setSaving(true); setWorkspaceError("");
    const { error } = await supabase.rpc("archive_task", { target_task_id: task.id });
    setSaving(false);
    if (error) { setWorkspaceError(error.message); return; }
    await loadWorkspace();
  }

  const completed = tasks.filter(task => task.status === "done").length;
  const focusTime = `${String(Math.floor(focusSeconds / 60)).padStart(2, "0")}:${String(focusSeconds % 60).padStart(2, "0")}`;
  const openTasks = tasks.length - completed;
  const nav = [{ name: "Overview", icon: LayoutGrid, group: "WORKSPACE" }, { name: "Projects", icon: FolderKanban, group: "WORKSPACE" }, { name: "Tasks", icon: CheckSquare, group: "WORKSPACE" }, ...(organizationVertical === "business" ? [{ name: "CRM", icon: Briefcase, group: "GROWTH" }] : []), { name: "Sales", icon: BarChart3, group: "GROWTH" }, { name: "Documents", icon: FileText, group: "WORKSPACE" }, { name: "Team", icon: Users, group: "MANAGE" }, { name: "Analytics", icon: Activity, group: "MANAGE" }, { name: "Finance", icon: Wallet, group: "MANAGE" }, { name: "Marketplace", icon: Store, group: "EXPLORE" }, { name: "AI Copilot", icon: Bot, group: "EXPLORE" }, ...(organizationVertical === "education" ? [{ name: "Education", icon: GraduationCap, group: "MANAGE" }] : []), { name: "Focus", icon: Target, group: "PERSONAL" }, { name: "Settings", icon: Settings, group: "PERSONAL" }];

  if (isSupabaseConfigured && !session) return (
    <main className="auth-page"><div className="auth-card">
      <a className="brand" href="#"><span className="brand-mark">M</span> MONK<span className="brand-dot">.</span></a>
      <p className="eyebrow">YOUR WORKSPACE, REIMAGINED</p><h1>Make room for<br /><em>meaningful work.</em></h1>
      <p className="muted">Sign in to continue to your MONK workspace.</p>
      <label>Email address<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" /></label>
      <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
      <button className="primary full" disabled={authBusy} onClick={() => signIn("login")}>{authBusy ? "Please wait…" : "Sign in"} <ArrowUpRight size={17} /></button>
      <button className="text-button full" disabled={authBusy} onClick={() => signIn("signup")}>Create an account</button>
      {authMessage && <p className="notice">{authMessage}</p>}<p className="tiny">Protected by Supabase Authentication</p>
    </div></main>
  );

  if (isSupabaseConfigured && session && !workspaceReady) return (
    <main className="auth-page"><section className="auth-card">
      <a className="brand" href="#"><span className="brand-mark">M</span> MONK<span className="brand-dot">.</span></a>
      <p className="eyebrow">SECURE WORKSPACE</p><h1>{loading ? "Loading your" : "Workspace"}<br /><em>{loading ? "workspace…" : "could not load."}</em></h1>
      <p className="muted">{loading ? "Checking your organization membership and workspace access." : "Your session is active, but MONK could not retrieve your workspace."}</p>
      {workspaceError && <p className="notice" role="alert">{workspaceError}</p>}
      <button className="primary full" disabled={loading} onClick={() => void loadWorkspace()}>{loading ? "Please wait…" : "Retry workspace loading"} <ArrowUpRight size={17} /></button>
      <button className="text-button full" onClick={async () => { await supabase?.auth.signOut(); setSession(null); setWorkspaceReady(false); setOrganizationId(null); }}>Sign out</button>
    </section></main>
  );

  if (isSupabaseConfigured && session && workspaceReady && !organizationId) return (
    <main className="auth-page"><form className="auth-card" onSubmit={createOrganization}>
      <a className="brand" href="#"><span className="brand-mark">M</span> MONK<span className="brand-dot">.</span></a>
      <p className="eyebrow">FIRST-TIME SETUP</p><h1>Create your<br /><em>workspace.</em></h1>
      <p className="muted">Your organization is the secure boundary for its projects and tasks.</p>
      <label>Workspace name<input required maxLength={100} value={organizationName} onChange={e => setOrganizationName(e.target.value)} /></label>
      <label>Workspace type<select value={organizationVertical} onChange={e => setOrganizationVertical(e.target.value as "business" | "education")}><option value="business">Business workspace</option><option value="education">Education institution</option></select></label>
      <label>Workspace URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={50} value={organizationSlug} onChange={e => setOrganizationSlug(e.target.value)} /></label>
      {workspaceError && <p className="notice">{workspaceError}</p>}
      <button className="primary full" disabled={saving}>{saving ? "Creating…" : "Create workspace"} <ArrowUpRight size={17} /></button>
      <button type="button" className="text-button full" onClick={() => supabase?.auth.signOut()}><LogOut size={14} /> Sign out</button>
    </form></main>
  );

  if (isSupabaseConfigured && session && workspaceReady && organizationId && organizationVertical === "business" && projects.length === 0 && active === "Overview") return (
    <main className="auth-page"><form className="auth-card" onSubmit={createProject}>
      <a className="brand" href="#"><span className="brand-mark">M</span> MONK<span className="brand-dot">.</span></a>
      <p className="eyebrow">WORKSPACE SETUP</p><h1>Create your first<br /><em>project.</em></h1>
      <p className="muted">Tasks belong to projects, so create one to start tracking work.</p>
      <label>Project name<input required maxLength={120} value={projectName} onChange={e => setProjectName(e.target.value)} /></label>
      <label>Project code<input required maxLength={20} value={projectCode} onChange={e => setProjectCode(e.target.value.toUpperCase())} /></label>
      {workspaceError && <p className="notice">{workspaceError}</p>}
      <button className="primary full" disabled={saving}>{saving ? "Creating…" : "Create project"} <ArrowUpRight size={17} /></button>
      <button type="button" className="text-button full" onClick={() => supabase?.auth.signOut()}><LogOut size={14} /> Sign out</button>
    </form></main>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-mark">M</span> MONK<span className="brand-dot">.</span></a>
        <div className="workspace-switch"><div className="workspace-avatar">M</div><div><strong>{organizationName}</strong><small>{projects.find(p => p.id === projectId)?.name ?? "Personal workspace"}</small></div><ChevronRight size={15} /></div>
        <nav className="monk-navigation">{["WORKSPACE","GROWTH","MANAGE","EXPLORE","PERSONAL"].map(group => <section className="nav-section" key={group}><p className="side-label">{group}</p>{nav.filter(item => item.group === group).map(item => <button key={item.name} className={active === item.name ? "nav-item selected" : "nav-item"} onClick={() => setActive(item.name)}><item.icon size={16} /><span>{item.name}</span>{item.name === "Projects" && <span className="nav-count">{projects.length}</span>}</button>)}</section>)}</nav>
        <div className="sidebar-bottom"><div className="secure"><ShieldCheck size={16} /><span><b>Private by design</b><small>Organization-scoped access.</small></span></div>
          <button className="profile" onClick={async () => { await supabase?.auth.signOut(); setSession(null); }}><div className="profile-avatar">{session?.user.email?.[0]?.toUpperCase() ?? "P"}</div><span><b>{session?.user.email ?? "Preview mode"}</b><small>{session ? "Signed in" : "Local demo"}</small></span><LogOut size={14} /></button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar"><div className="crumb"><span className="crumb-mark">M</span> Workspace <span>/</span> {active}</div><div className="top-actions"><button className="icon-btn" aria-label="Search"><Search size={18} /></button><button className="icon-btn" aria-label="Notifications"><Bell size={18} /></button><div className="top-avatar">P</div></div></header>
        <div className="content">
          <div className="welcome-row"><div><p className="eyebrow"><Sparkles size={13} /> THE OPERATING SYSTEM FOR YOUR WORK</p><h1>{active === "Overview" ? "One workspace. Entire operation." : active === "Tasks" ? "Turn plans into progress." : active === "Focus" ? "Protect your focus." : `${active}, in one place.`}<span>.</span></h1><p className="muted">{active === "Overview" ? "Projects, customers, people and execution — connected in one calm workspace." : `Bring your ${active.toLowerCase()} workflow into the MONK workspace.`}</p></div>{(["Overview","Tasks","Focus"].includes(active)) && <button className="primary" onClick={() => { setActive("Tasks"); window.setTimeout(() => document.getElementById("new-task")?.focus(), 0); }}><Plus size={17} /> New task</button>}</div>
          {!isSupabaseConfigured && <div className="config-banner"><Zap size={17} /><span><b>Preview mode</b> — add Supabase environment variables to enable persistent tasks and authentication.</span></div>}
          {workspaceError && <div className="error-banner" role="alert">{workspaceError}<button onClick={() => void loadWorkspace()}>Retry</button></div>}
          {loading && <div className="loading-line"><LoaderCircle size={15} /> Syncing workspace…</div>}
          {(["Overview", "Focus", "Tasks"].includes(active)) && <>
          <section className="stats-grid">
            <article className="stat-card"><div className="stat-top"><span>Open tasks</span><span className="stat-icon"><Command size={17} /></span></div><strong>{openTasks}</strong><small>Across selected project</small></article>
            <article className="stat-card"><div className="stat-top"><span>Completed</span><span className="stat-icon green"><Check size={17} /></span></div><strong>{completed}</strong><small>Saved to your workspace</small></article>
            <article className="stat-card highlight"><div className="stat-top"><span>Projects</span><span className="stat-icon gold"><Target size={17} /></span></div><strong>{projects.length || (isSupabaseConfigured ? "—" : 1)}</strong><small>Organized workspaces</small></article>
          </section>
          <section className="work-grid">
            <article className="panel tasks-panel"><div className="panel-heading"><div><p className="eyebrow">EXECUTION</p><h2>Today's priorities</h2></div><select className="project-select" aria-label="Select project" value={projectId} onChange={e => setProjectId(e.target.value)}>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}{!projects.length && <option value="demo">Demo project</option>}</select></div>
              <form className="add-task" onSubmit={addTask}><input id="new-task" value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Add a priority…" maxLength={240} /><button aria-label="Add task" type="submit" disabled={saving || (isSupabaseConfigured && !projectId)}><Plus size={18} /></button></form>
              <div className="task-list">{tasks.map(task => <div className="task-row" key={task.id}><label className="task-check"><input type="checkbox" checked={task.status === "done"} disabled={saving} onChange={() => void toggleTask(task)} /><span className="custom-check"><Check size={12} /></span></label><span className={task.status === "done" ? "task-title done" : "task-title"}>{task.title}<small>{task.priority} · {task.status.replace("_", " ")}</small></span><span className="task-actions"><button type="button" aria-label={`Edit ${task.title}`} disabled={saving} onClick={() => void editTask(task)}><Pencil size={13} /></button><button type="button" aria-label={`Archive ${task.title}`} disabled={saving} onClick={() => void archiveTask(task)}><Trash2 size={13} /></button></span></div>)}{!tasks.length && !loading && <p className="empty-state">No tasks yet. Add your first priority above.</p>}</div>
            </article>
            <article className="panel focus-panel"><div className="panel-heading"><div><p className="eyebrow">STAY INTENTIONAL</p><h2>Focus session</h2></div><span className="live-dot">READY</span></div><div className="focus-orb"><div className="orb-inner"><Target size={27} /><strong>{focusTime}</strong><small>DEEP WORK</small></div></div><p className="focus-copy">One thing at a time.<br />Give your best work the space it needs.</p><div className="focus-controls"><button className="primary full" onClick={() => { if (focusSeconds === 0) setFocusSeconds(25 * 60); setFocusRunning(value => !value); }}>{focusRunning ? <Pause size={15} /> : <Play size={15} />}{focusRunning ? "Pause session" : focusSeconds === 0 ? "Start again" : "Start session"}</button><button className="icon-btn reset-focus" aria-label="Reset focus timer" onClick={() => { setFocusRunning(false); setFocusSeconds(25 * 60); }}><RotateCcw size={15} /></button></div></article>
          </section>
          <section className="bottom-note"><div className="note-icon"><Sparkles size={18} /></div><div><b>Small steps. Serious momentum.</b><p>MONK brings your priorities, projects and focus into one calm workspace.</p></div><span className="note-tag">BUILT FOR BUILDERS</span></section>
          </>}
          {isSupabaseConfigured && session && organizationId && organizationVertical === "education" && active === "Education" && <EducationManagement organizationId={organizationId} />}
          {isSupabaseConfigured && session && organizationId && organizationVertical === "business" && (active === "CRM" || active === "Sales") && <CRMManagement organizationId={organizationId} />}
          {!["Overview","Focus","Tasks","Projects","Team","Activity","CRM","Sales","Education"].includes(active) && <section className="module-hub"><div className="module-hub-head"><div><span className="module-kicker">MONK WORKSPACE / {active.toUpperCase()}</span><h2>{active === "AI Copilot" ? "Your intelligent work companion." : active === "Documents" ? "Every important file, in context." : active === "Analytics" ? "Clarity across your operation." : active === "Finance" ? "Keep the numbers connected." : active === "Marketplace" ? "Extend your workspace." : "Make MONK work your way."}</h2><p>One connected system for your team. This area is being brought online in the approved MVP rollout.</p></div><span className="module-orb"><Sparkles size={22}/></span></div><div className="module-cards">{(active === "Documents" ? [{icon:FileText,title:"Shared documents",desc:"Organize project briefs, contracts and working files.",status:"Storage integration pending"},{icon:ShieldCheck,title:"Access controls",desc:"Keep sensitive files scoped to the right workspace.",status:"Security foundation"}] : active === "Analytics" ? [{icon:BarChart3,title:"Workspace performance",desc:"Understand delivery, workload and customer momentum.",status:"Metrics foundation"},{icon:Activity,title:"Activity insights",desc:"Track meaningful changes across teams and projects.",status:"Event aggregation pending"}] : active === "Finance" ? [{icon:Wallet,title:"Revenue overview",desc:"Bring invoices, expenses and cash visibility together.",status:"Finance module pending"},{icon:Building2,title:"Client accounts",desc:"Connect commercial records with customer work.",status:"CRM foundation available"}] : active === "Marketplace" ? [{icon:Store,title:"Connected tools",desc:"Discover integrations that extend MONK workflows.",status:"Integration catalog pending"},{icon:Zap,title:"Automation recipes",desc:"Connect repetitive work across your stack.",status:"Coming in a later phase"}] : active === "AI Copilot" ? [{icon:Bot,title:"Workspace assistant",desc:"Summarize work, prepare updates and find next actions.",status:"AI runtime not connected"},{icon:Sparkles,title:"AI-assisted reports",desc:"Turn project activity into clear client-ready updates.",status:"Report workflow pending"}] : [{icon:Settings,title:"Workspace preferences",desc:"Manage profile, organization and security preferences.",status:"Settings foundation"}]).map(card => <article className="module-card" key={card.title}><span className="module-card-icon"><card.icon size={18}/></span><h3>{card.title}</h3><p>{card.desc}</p><small>{card.status}</small></article>)}</div><div className="module-hub-foot"><ShieldCheck size={16}/><span>MONK uses organization-scoped access. Features are enabled only when their secure backend workflows are ready.</span></div></section>}
          {active === "Education" && isSupabaseConfigured && session && organizationId && <EducationManagement organizationId={organizationId} />}
          {isSupabaseConfigured && session && organizationId && (active === "Projects" || active === "Team" || active === "Activity") && <WorkspaceManagement
            view={active}
            organizationId={organizationId}
            organizationVertical={organizationVertical}
            projects={projects}
            projectId={projectId}
            setProjectId={setProjectId}
            onReload={loadWorkspace}
          />}
          <footer>MONK © 2026 <span>{isSupabaseConfigured && session ? "Synced with Supabase." : "Local preview mode."}</span></footer>
        </div>
      </main>
    </div>
  );
}
