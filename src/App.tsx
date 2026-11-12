import { ArrowUpRight, Check, GraduationCap, Building2, ShieldCheck, Users, CalendarDays, BookOpen, BarChart3, Wallet, FolderKanban, Sparkles, Menu, X, Play } from "lucide-react";
import { useEffect, useState } from "react";
import AuthExperience from "./components/AuthExperience";

const educationItems = ["Student & faculty management", "Daily attendance and timetables", "Notes, PDFs and video learning", "Fees, examinations and reports"];
const businessItems = ["Customers, teams and operations", "Projects, tasks and approvals", "Invoices, income and expenses", "Inventory and performance reports"];

function useReveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  useReveal();

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#" aria-label="MONK home">monk<span>.</span></a>
        <nav className={menuOpen ? "desktop-nav open" : "desktop-nav"} aria-label="Main navigation">
          <a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a>
          <a href="#education" onClick={() => setMenuOpen(false)}>Education</a>
          <a href="#business" onClick={() => setMenuOpen(false)}>Business</a>
          <a href="#security" onClick={() => setMenuOpen(false)}>Security</a>
        </nav>
        <div className="header-actions">
          <button className="sign-in" onClick={() => setAuthOpen(true)}>Sign in</button>
          <button className="header-cta" onClick={() => setAuthOpen(true)}>Get started <ArrowUpRight size={15}/></button>
        </div>
        <button className="mobile-menu" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(v => !v)}>{menuOpen ? <X/> : <Menu/>}</button>
      </header>

      <section className="hero">
        <div className="hero-kicker"><span className="kicker-dot"/> THE WORKSPACE FOR WHAT'S NEXT</div>
        <h1>Bring your whole<br/><em>organization</em> together.</h1>
        <p className="hero-copy">The people, processes and progress behind your institution or business — finally working in one place.</p>
        <div className="hero-actions">
          <button className="button-primary" onClick={() => setAuthOpen(true)}>Explore MONK <ArrowUpRight size={16}/></button>
          <a className="button-secondary" href="#platform"><Play size={14}/> See how it works</a>
        </div>
        <div className="hero-footnote"><span>EDUCATION</span><i/> <span>BUSINESS</span><i/> <span>ONE CONNECTED PLATFORM</span></div>
      </section>

      <section className="product-stage" id="platform" data-reveal>
        <div className="stage-topline"><span>01 / THE PLATFORM</span><span>ONE CLEAR VIEW</span></div>
        <div className="product-window">
          <div className="window-sidebar">
            <div className="mini-brand">m<span>.</span></div>
            <div className="mini-nav active"><BarChart3 size={16}/><b>Overview</b></div>
            <div className="mini-nav"><Users size={16}/> People</div>
            <div className="mini-nav"><CalendarDays size={16}/> Attendance</div>
            <div className="mini-nav"><FolderKanban size={16}/> Operations</div>
            <div className="mini-nav"><Wallet size={16}/> Finance</div>
            <div className="mini-nav"><BookOpen size={16}/> Resources</div>
            <div className="window-user"><div className="avatar">M</div><span><b>My workspace</b><small>Administrator</small></span></div>
          </div>
          <div className="window-main">
            <div className="window-toolbar"><span>Workspace overview <b>/ Today</b></span><span className="live-status"><i/> All systems normal</span></div>
            <div className="window-heading"><div><small>WEDNESDAY, 11 NOVEMBER</small><h3>A clearer view of today.</h3></div><span className="demo-pill">DEMO PREVIEW</span></div>
            <div className="metric-grid">
              <article className="metric"><span>People</span><strong>1,248</strong><small>Across your organization</small><div className="metric-line"><i style={{width:"76%"}}/></div></article>
              <article className="metric"><span>Daily activity</span><strong>86%</strong><small>Activity recorded today</small><div className="metric-line blue"><i style={{width:"86%"}}/></div></article>
              <article className="metric"><span>Financial overview</span><strong>₹4.8L</strong><small>Illustrative monthly total</small><div className="metric-line gold"><i style={{width:"62%"}}/></div></article>
            </div>
            <div className="window-lower">
              <div className="activity-card"><div className="card-title">Today at a glance <span>DEMO DATA</span></div><div className="activity-row"><b className="activity-icon blue-bg"><Users size={15}/></b><span><strong>People and teams</strong><small>Roles, groups and access</small></span><ArrowUpRight size={15}/></div><div className="activity-row"><b className="activity-icon green-bg"><CalendarDays size={15}/></b><span><strong>Daily operations</strong><small>Attendance, schedule and tasks</small></span><ArrowUpRight size={15}/></div><div className="activity-row"><b className="activity-icon amber-bg"><Wallet size={15}/></b><span><strong>Finance and records</strong><small>Collections, expenses and reports</small></span><ArrowUpRight size={15}/></div></div>
              <div className="pulse-card"><span>ORGANIZATION HEALTH</span><div className="pulse-ring"><strong>92</strong><small>HEALTH</small></div><p>Everything important,<br/>in view.</p></div>
            </div>
          </div>
        </div>
        <p className="stage-caption">A considered view of the work that moves your organization forward.</p>
      </section>

      <section className="vertical-section" id="education">
        <div className="vertical-copy" data-reveal><span className="section-index">02 / EDUCATION</span><div className="vertical-icon education-icon"><GraduationCap size={21}/></div><p className="vertical-eyebrow">MONK FOR EDUCATION</p><h2>Make more room<br/>for <em>learning.</em></h2><p className="vertical-description">A connected home for colleges, coaching centres and institutes. Bring administrators, teachers, students and parents into a clearer daily rhythm.</p><ul>{educationItems.map(x=><li key={x}><Check size={16}/>{x}</li>)}</ul><button className="text-link" onClick={() => setAuthOpen(true)}>Discover Education <ArrowUpRight size={17}/></button></div>
        <div className="education-visual" data-reveal><div className="ed-top"><span>EDUCATION WORKSPACE</span><span className="ed-status">● ACTIVE</span></div><div className="ed-title">Good morning, Principal.</div><p className="ed-sub">Your institution, in focus.</p><div className="ed-stats"><div><small>STUDENTS</small><b>1,286</b><span>Across 24 batches</span></div><div><small>FACULTY</small><b>48</b><span>Across 6 departments</span></div></div><div className="attendance-card"><div><span>ATTENDANCE TODAY</span><b>92.4%</b></div><div className="attendance-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><small>Illustrative preview — not live institution data</small></div><div className="ed-bottom"><span><BookOpen size={16}/> Learning resources</span><span><CalendarDays size={16}/> Timetable</span><span><Wallet size={16}/> Fee records</span></div></div>
      </section>

      <section className="vertical-section business-section" id="business">
        <div className="business-visual" data-reveal><div className="biz-top"><span>BUSINESS WORKSPACE</span><span className="biz-status">● OVERVIEW</span></div><small className="biz-eyebrow">YOUR BUSINESS, IN FOCUS</small><h3>Good work.<br/><em>Clear numbers.</em></h3><div className="revenue-panel"><div><span>MONTHLY OVERVIEW</span><b>₹ 4,82,600</b><small>Illustrative revenue</small></div><div className="sparkline"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div><div className="biz-bottom"><div><Users size={17}/><span><b>Customers</b><small>Relationships</small></span></div><div><FolderKanban size={17}/><span><b>Operations</b><small>Work in motion</small></span></div><div><Wallet size={17}/><span><b>Finance</b><small>Money in view</small></span></div></div></div>
        <div className="vertical-copy" data-reveal><span className="section-index">03 / BUSINESS</span><div className="vertical-icon business-icon"><Building2 size={21}/></div><p className="vertical-eyebrow">MONK FOR BUSINESS</p><h2>Run the details.<br/>See the <em>whole.</em></h2><p className="vertical-description">For small businesses, teams and growing companies. Keep customers, employees, daily work and finances connected without adding complexity.</p><ul>{businessItems.map(x=><li key={x}><Check size={16}/>{x}</li>)}</ul><button className="text-link" onClick={() => setAuthOpen(true)}>Discover Business <ArrowUpRight size={17}/></button></div>
      </section>

      <section className="principles" id="security" data-reveal><span className="section-index">04 / BUILT WITH INTENTION</span><h2>Simple on the surface.<br/><em>Thoughtful underneath.</em></h2><div className="principle-grid"><article><ShieldCheck/><h3>Private by design</h3><p>Organization-scoped workspaces and access shaped around each role.</p></article><article><Users/><h3>People come first</h3><p>Administrators, teachers, students and teams see what matters to them.</p></article><article><Sparkles/><h3>Room to grow</h3><p>Start with the essentials. Add capabilities as your organization evolves.</p></article></div></section>

      <section className="closing" id="get-started"><span>YOUR NEXT CHAPTER, WELL ORGANIZED.</span><h2>Bring it all<br/><em>into focus.</em></h2><p>One connected platform for the people and work that matter.</p><button className="button-primary light" onClick={() => setAuthOpen(true)}>Get started with MONK <ArrowUpRight size={16}/></button></section>
      <footer className="site-footer"><a className="wordmark" href="#">monk<span>.</span></a><span>One platform. Many ways to move forward.</span><span>© 2026 MONK</span></footer>
      {authOpen && <AuthExperience onClose={() => setAuthOpen(false)} />}
    </main>
  );
}
export default App;
