import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Bell, Check, ChevronRight, Command, LayoutGrid, Plus, Search, ShieldCheck, Sparkles, Target, Workflow, Zap, LoaderCircle, LogOut, Pencil, Trash2, Play, Pause, RotateCcw, Users, Activity } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import WorkspaceManagement from "./components/WorkspaceManagement";

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
        setProjects([]);
        setTasks([]);
        setProjectId("");
        setWorkspaceReady(true);
        return;
      }
      const organizationResult = await supabase.from("organizations")
        .select("name").eq("id", orgId).single();
      if (organizationResult.error) throw organizationResult.error;
      setOrganizationName(organizationResult.data.name);
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
      org_country: "IN", org_timezone: "Asia/Kolkata", org_currency: "INR", org_locale: "en-IN", org_industry: "Technology"
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
  const nav = [{ name: "Overview", icon: LayoutGrid }, { name: "Projects", icon: Workflow }, { name: "Team", icon: Users }, { name: "Activity", icon: Activity }, { name: "Focus", icon: Target }];

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
      <label>Workspace URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={50} value={organizationSlug} onChange={e => setOrganizationSlug(e.target.value)} /></label>
      {workspaceError && <p className="notice">{workspaceError}</p>}
      <button className="primary full" disabled={saving}>{saving ? "Creating…" : "Create workspace"} <ArrowUpRight size={17} /></button>
      <button type="button" className="text-button full" onClick={() => supabase?.auth.signOut()}><LogOut size={14} /> Sign out</button>
    </form></main>
  );

  if (isSupabaseConfigured && session && workspaceReady && organizationId && projects.length === 0 && active === "Overview") return (
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
        <p className="side-label">WORKSPACE</p>
        <nav>{nav.map(item => <button key={item.name} className={active === item.name ? "nav-item selected" : "nav-item"} onClick={() => setActive(item.name)}><item.icon size={17} />{item.name}{item.name === "Projects" && <span className="nav-count">{projects.length}</span>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="secure"><ShieldCheck size={16} /><span><b>Private by design</b><small>Organization-scoped access.</small></span></div>
          <button className="profile" onClick={async () => { await supabase?.auth.signOut(); setSession(null); }}><div className="profile-avatar">{session?.user.email?.[0]?.toUpperCase() ?? "P"}</div><span><b>{session?.user.email ?? "Preview mode"}</b><small>{session ? "Signed in" : "Local demo"}</small></span><LogOut size={14} /></button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar"><div className="crumb">Workspace <span>/</span> {active}</div><div className="top-actions"><button className="icon-btn" aria-label="Search"><Search size={18} /></button><button className="icon-btn" aria-label="Notifications"><Bell size={18} /></button><div className="top-avatar">P</div></div></header>
        <div className="content">
          <div className="welcome-row"><div><p className="eyebrow"><Sparkles size={13} /> YOUR WORKSPACE</p><h1>Good to have you here<span>.</span></h1><p className="muted">A clear space for your best work. Start with what matters today.</p></div>{(active === "Overview" || active === "Focus") && <button className="primary" onClick={() => document.getElementById("new-task")?.focus()}><Plus size={17} /> New task</button>}</div>
          {!isSupabaseConfigured && <div className="config-banner"><Zap size={17} /><span><b>Preview mode</b> — add Supabase environment variables to enable persistent tasks and authentication.</span></div>}
          {workspaceError && <div className="error-banner" role="alert">{workspaceError}<button onClick={() => void loadWorkspace()}>Retry</button></div>}
          {loading && <div className="loading-line"><LoaderCircle size={15} /> Syncing workspace…</div>}
          {(active === "Overview" || active === "Focus") && <>
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
          {isSupabaseConfigured && session && organizationId && (active === "Projects" || active === "Team" || active === "Activity") && <WorkspaceManagement
            view={active}
            organizationId={organizationId}
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
