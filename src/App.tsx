import { useEffect, useState } from "react";
import { ArrowUpRight, Bell, Check, ChevronRight, Command, LayoutGrid, Plus, Search, ShieldCheck, Sparkles, Target, Workflow, Zap } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type Task = { id: number; title: string; area: string; done: boolean };
const starterTasks: Task[] = [
  { id: 1, title: "Define the next milestone", area: "Strategy", done: false },
  { id: 2, title: "Review product requirements", area: "Product", done: true },
  { id: 3, title: "Prepare the weekly execution plan", area: "Operations", done: false }
];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [tasks, setTasks] = useState(starterTasks);
  const [newTask, setNewTask] = useState("");
  const [active, setActive] = useState("Overview");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  async function signIn(mode: "login" | "signup") {
    if (!supabase) { setAuthMessage("Add your Supabase URL and publishable key to enable authentication."); return; }
    if (!email.trim() || !password) { setAuthMessage("Enter your email and password."); return; }
    setAuthBusy(true); setAuthMessage("");
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password });
    setAuthBusy(false);
    setAuthMessage(result.error?.message ?? (mode === "signup" ? "Account request submitted. Check your email if confirmation is enabled." : "Signed in."));
  }

  function addTask() {
    const title = newTask.trim();
    if (!title) return;
    setTasks(current => [{ id: Date.now(), title, area: "Personal", done: false }, ...current]);
    setNewTask("");
  }

  const completed = tasks.filter(task => task.done).length;
  const nav = [{ name: "Overview", icon: LayoutGrid }, { name: "Projects", icon: Workflow }, { name: "Focus", icon: Target }];

  if (!session && isSupabaseConfigured) return (
    <main className="auth-page">
      <div className="auth-card">
        <a className="brand" href="#"><span className="brand-mark">M</span> MONK<span className="brand-dot">.</span></a>
        <p className="eyebrow">YOUR WORKSPACE, REIMAGINED</p>
        <h1>Make room for<br /><em>meaningful work.</em></h1>
        <p className="muted">Sign in to continue to your MONK workspace.</p>
        <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" /></label>
        <button className="primary full" disabled={authBusy} onClick={() => signIn("login")}>{authBusy ? "Please wait…" : "Sign in"} <ArrowUpRight size={17} /></button>
        <button className="text-button full" disabled={authBusy} onClick={() => signIn("signup")}>Create an account</button>
        {authMessage && <p className="notice">{authMessage}</p>}
        <p className="tiny">Protected by Supabase Authentication</p>
      </div>
    </main>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-mark">M</span> MONK<span className="brand-dot">.</span></a>
        <div className="workspace-switch"><div className="workspace-avatar">M</div><div><strong>MONK Studio</strong><small>Personal workspace</small></div><ChevronRight size={15} /></div>
        <p className="side-label">WORKSPACE</p>
        <nav>{nav.map(item => <button key={item.name} className={active === item.name ? "nav-item selected" : "nav-item"} onClick={() => setActive(item.name)}><item.icon size={17} />{item.name}{item.name === "Projects" && <span className="nav-count">3</span>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="secure"><ShieldCheck size={16} /><span><b>Private by design</b><small>Your workspace stays yours.</small></span></div><button className="profile" onClick={async () => { await supabase?.auth.signOut(); setSession(null); }}><div className="profile-avatar">{session?.user.email?.[0]?.toUpperCase() ?? "P"}</div><span><b>{session?.user.email ?? "Prashant"}</b><small>{session ? "Signed in" : "Preview mode"}</small></span><ChevronRight size={15} /></button></div>
      </aside>
      <main className="main">
        <header className="topbar"><div className="crumb">Workspace <span>/</span> {active}</div><div className="top-actions"><button className="icon-btn" aria-label="Search"><Search size={18} /></button><button className="icon-btn" aria-label="Notifications"><Bell size={18} /></button><div className="top-avatar">P</div></div></header>
        <div className="content">
          <div className="welcome-row"><div><p className="eyebrow"><Sparkles size={13} /> TUESDAY, YOUR NEXT CHAPTER</p><h1>Good to have you here<span>.</span></h1><p className="muted">A clear space for your best work. Start with what matters today.</p></div><button className="primary" onClick={() => document.getElementById("new-task")?.focus()}><Plus size={17} /> New task</button></div>
          {!isSupabaseConfigured && <div className="config-banner"><Zap size={17} /><span><b>Preview mode</b> — connect Supabase by adding the environment variables in <code>.env</code>.</span></div>}
          <section className="stats-grid">
            <article className="stat-card"><div className="stat-top"><span>Open tasks</span><span className="stat-icon"><Command size={17} /></span></div><strong>{tasks.length - completed}</strong><small>Across your workspace</small></article>
            <article className="stat-card"><div className="stat-top"><span>Completed</span><span className="stat-icon green"><Check size={17} /></span></div><strong>{completed}</strong><small>Good progress, keep going</small></article>
            <article className="stat-card highlight"><div className="stat-top"><span>Focus score</span><span className="stat-icon gold"><Target size={17} /></span></div><strong>84<span className="unit">/100</span></strong><small>Consistency is the advantage</small></article>
          </section>
          <section className="work-grid">
            <article className="panel tasks-panel"><div className="panel-heading"><div><p className="eyebrow">EXECUTION</p><h2>Today's priorities</h2></div><button className="quiet-btn">View all <ArrowUpRight size={14} /></button></div>
              <form className="add-task" onSubmit={e => { e.preventDefault(); addTask(); }}><input id="new-task" value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Add a priority…" /><button aria-label="Add task" type="submit"><Plus size={18} /></button></form>
              <div className="task-list">{tasks.map(task => <label className="task-row" key={task.id}><input type="checkbox" checked={task.done} onChange={() => setTasks(current => current.map(t => t.id === task.id ? { ...t, done: !t.done } : t))} /><span className="custom-check"><Check size={12} /></span><span className={task.done ? "task-title done" : "task-title"}>{task.title}<small>{task.area}</small></span><ChevronRight size={15} className="task-arrow" /></label>)}</div>
            </article>
            <article className="panel focus-panel"><div className="panel-heading"><div><p className="eyebrow">STAY INTENTIONAL</p><h2>Focus session</h2></div><span className="live-dot">READY</span></div><div className="focus-orb"><div className="orb-inner"><Target size={27} /><strong>25:00</strong><small>DEEP WORK</small></div></div><p className="focus-copy">One thing at a time.<br />Give your best work the space it needs.</p><button className="primary full" onClick={() => setActive("Focus")}>Start a session <ArrowUpRight size={16} /></button></article>
          </section>
          <section className="bottom-note"><div className="note-icon"><Sparkles size={18} /></div><div><b>Small steps. Serious momentum.</b><p>MONK brings your priorities, projects and focus into one calm workspace.</p></div><span className="note-tag">BUILT FOR BUILDERS</span></section>
          <footer>MONK © 2026 <span>Designed for clarity. Built for momentum.</span></footer>
        </div>
      </main>
    </div>
  );
}