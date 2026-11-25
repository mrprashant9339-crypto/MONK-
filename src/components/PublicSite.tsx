import { useEffect, useMemo, useState } from "react";
import type { FormEvent, MouseEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import "../public-site.css";
import InstitutionDirectory from "./InstitutionDirectory";
import LegalPage, { CookieNotice } from "./LegalPages";
import SupportTrustPages, { isSupportTrustRoute } from "./SupportTrustPages";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, GraduationCap, Store, Users, BookOpen, ShieldCheck, BarChart3, CalendarDays, ClipboardList, Package, Receipt, Menu, X, CheckCircle2, Layers3, Workflow, ChevronRight, Mail, Github, Instagram, Linkedin, Youtube } from "lucide-react";

type Portal = "campus" | "business";

const PUBLIC_PAGE_METADATA: Record<string, { title: string; description: string }> = {
  "/thank-you": { title: "Submission received — MONK", description: "Your MONK submission has been received. Review the next steps and keep your reference number if one was provided." },
  "/": { title: "MONK — Campus & Business Workspaces", description: "MONK brings college operations and business workflows into focused, connected workspaces. Explore Campus and Business." },
  "/about": { title: "About MONK — Independent Workspace Platform", description: "Learn about MONK, its independent development, product direction and current preview availability." },
  "/documentation": { title: "MONK Documentation — Product Guide", description: "Explore MONK product guidance, workspace concepts and available workflows for Campus and Business." },
  "/updates": { title: "MONK Updates — Product Progress", description: "Read product updates and development notes for the MONK Campus and Business workspaces." },
  "/faq": { title: "MONK FAQ — Accounts, Workspaces & Access", description: "Find answers about MONK accounts, Campus and Business workspaces, previews, access and support." },
  "/campus": { title: "MONK Campus — College & Institution Workspaces", description: "Explore a connected workspace concept for colleges, polytechnics, students, faculty and institution teams." },
  "/directory": { title: "India Institution Directory — MONK", description: "Search published Indian universities, colleges and specialist institutions with source-aware verification information." },
  "/business": { title: "MONK Business — Business Operations Workspace", description: "Explore customer, inventory, orders and team workflows in the MONK Business workspace." },
  "/contact": { title: "Contact MONK — Support & Enquiries", description: "Contact the MONK team about account access, product questions, technical issues or privacy requests." },
  "/support/tickets": { title: "Support Tickets — MONK", description: "Submit a support request to MONK or review the local reference details available in this browser." },
  "/status": { title: "MONK Service Status", description: "View the current service status information published by MONK." },
  "/incidents": { title: "MONK Incident History", description: "Review service incident information and updates published by MONK." },
  "/security-center": { title: "MONK Security Center", description: "Read about MONK security practices, responsible use and security contact information." },
  "/security/vulnerability-disclosure": { title: "Vulnerability Disclosure — MONK", description: "Read how to report a suspected security vulnerability to MONK responsibly." },
  "/privacy-center": { title: "Privacy Center — MONK", description: "Find privacy information and ways to contact MONK about personal information requests." },
  "/cookies/preferences": { title: "Cookie Preferences — MONK", description: "Review and update optional cookie preferences for the MONK website." },
  "/data-rights": { title: "Data Rights Requests — MONK", description: "Contact MONK to request access, correction or deletion of personal information." },
  "/offline": { title: "MONK — Offline", description: "MONK is currently unavailable offline. Reconnect to the internet and try again." },
  "/maintenance": { title: "MONK — Maintenance", description: "MONK is temporarily unavailable while maintenance is in progress." },
  "/error": { title: "MONK — Something Went Wrong", description: "An unexpected error occurred. Return to MONK or contact support if the issue continues." },
  "/privacy": { title: "Privacy Policy — MONK", description: "Read how MONK processes account, workspace, support and technical information." },
  "/terms": { title: "Terms of Service — MONK", description: "Read the terms governing access to the MONK website and workspaces." },
  "/cookies": { title: "Cookie Policy — MONK", description: "Learn how cookies and browser storage are used by the MONK website." },
  "/refunds": { title: "Refund Policy — MONK", description: "Read the MONK refund and cancellation information." },
  "/disclaimer": { title: "Disclaimer — MONK", description: "Read important limitations and product-preview information for MONK." },
  "/security": { title: "Security Overview — MONK", description: "Read the security overview and responsible access information for MONK." },
  "/accessibility": { title: "Accessibility — MONK", description: "Read the MONK accessibility statement and ways to report an accessibility issue." },
};

function updatePublicPageMetadata(pathname: string) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
  const metadata = PUBLIC_PAGE_METADATA[path] ?? (/^\/support\/tickets\/[^/]+$/.test(path)
    ? { title: "Support Ticket Reference — MONK", description: "View the support ticket reference information available in this browser." }
    : { title: "Page not found — MONK", description: "The requested page could not be found on MONK." });
  document.title = metadata.title;

  const setMeta = (name: string, content: string) => {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!element) {
      element = document.createElement("meta");
      element.name = name;
      document.head.appendChild(element);
    }
    element.content = content;
  };
  setMeta("description", metadata.description);
  const privatePath = ["/support/tickets", "/privacy-center", "/cookies/preferences", "/status", "/offline", "/maintenance", "/error", "/thank-you"].includes(path) || /^\/support\/tickets\//.test(path);
  setMeta("robots", privatePath ? "noindex, nofollow" : "index, follow, max-image-preview:large");

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = `https://monk.monster${path === "/" ? "/" : path}`;
  const setProperty = (property: string, content: string) => {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute("property", property);
      document.head.appendChild(element);
    }
    element.content = content;
  };
  setProperty("og:title", metadata.title);
  setProperty("og:description", metadata.description);
  setProperty("og:url", canonical.href);
  setProperty("og:image", "https://monk.monster/brand/monk-share-placeholder.svg");
  setProperty("og:image:width", "1200");
  setProperty("og:image:height", "630");
  setProperty("og:image:alt", "MONK Campus and Business workspaces — share image placeholder");
  setMeta("twitter:card", "summary_large_image");
  setMeta("twitter:title", metadata.title);
  setMeta("twitter:description", metadata.description);
  setMeta("twitter:image", "https://monk.monster/brand/monk-share-placeholder.svg");
  setMeta("twitter:image:alt", "MONK Campus and Business workspaces — share image placeholder");
}

const campusFeatures = [
  { icon: Users, title: "Student & faculty space", desc: "Student profiles, faculty directories, class groups and role-specific access." },
  { icon: BookOpen, title: "Academic operations", desc: "Courses, branches, semesters, notices, assignments and learning resources." },
  { icon: CalendarDays, title: "Attendance & timetable", desc: "Daily attendance, class schedules, academic calendar and alerts." },
  { icon: ClipboardList, title: "Exams & results", desc: "Internal assessments, practical records, marks workflows and result visibility." },
  { icon: ShieldCheck, title: "Institution controls", desc: "Principal, HOD, teacher, student and admin permissions with audit history." },
  { icon: BarChart3, title: "Institution insights", desc: "Attendance trends, academic progress and department-level summaries." }
];
const businessFeatures = [
  { icon: Users, title: "Customer relationship", desc: "Customer records, enquiries, follow-ups, notes and sales pipeline." },
  { icon: Package, title: "Products & inventory", desc: "Products, stock levels, categories, suppliers and low-stock visibility." },
  { icon: Receipt, title: "Orders & invoices", desc: "Sales records, invoices, payment status and simple order tracking." },
  { icon: CalendarDays, title: "Bookings & work", desc: "Appointments, service jobs, team assignments and due dates." },
  { icon: BarChart3, title: "Business insights", desc: "Revenue, sales activity, outstanding payments and team performance." },
  { icon: Workflow, title: "Workflow automation", desc: "Reusable reminders, status updates and connected business processes." }
];

function MonkMark({ large = false }: { large?: boolean }) {
  return <span className={large ? "monk-mark monk-mark-large" : "monk-mark"}><img src="/brand/monk-icon.svg" alt="" /></span>;
}
function Brand({ portal }: { portal?: Portal }) {
  if (portal) return <img className={`brand-lockup brand-lockup-${portal}`} src={`/brand/monk-${portal}-logo.svg`} alt={portal === "campus" ? "MONK Campus" : "MONK Business"} />;
  return <span className="public-brand"><MonkMark /> <span>MONK<span className="brand-period">.</span></span></span>;
}
function Header({ active }: { active?: Portal }) {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  return <header className="public-header"><button className="brand-button" onClick={() => navigate("/")}><Brand portal={active} /></button>
    <nav className={menu ? "public-nav open" : "public-nav"}><button className={active === "campus" ? "nav-active" : ""} onClick={() => { navigate("/campus"); setMenu(false); }}>Campus</button><button className={active === "business" ? "nav-active" : ""} onClick={() => { navigate("/business"); setMenu(false); }}>Business</button><a href="/#how-it-works" onClick={() => setMenu(false)}>How it works</a><a href="/#about" onClick={event => { event.preventDefault(); navigate("/about"); setMenu(false); }}>About MONK</a></nav>
    <div className="header-actions"><button className="login-link" onClick={() => navigate("/login")}>Log in</button><button className="header-cta" onClick={() => navigate("/login?mode=signup")}>Get started <ArrowUpRight size={15}/></button></div>
    <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMenu(v => !v)}>{menu ? <X/> : <Menu/>}</button>
  </header>;
}
function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  useEffect(() => {
    const nodes = document.querySelectorAll(".reveal:not(.is-visible)");
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  return <div className={`reveal ${className}`}>{children}</div>;
}
function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const range = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(range > 0 ? Math.min(100, Math.max(0, (window.scrollY / range) * 100)) : 0);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);
  return <div className="site-scroll-progress" aria-hidden="true"><span style={{ width: progress + "%" }}/></div>;
}

function Footer() {
  const navigate = useNavigate();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const go = (path: string) => (event: MouseEvent<HTMLAnchorElement>) => { event.preventDefault(); navigate(path); };
  const requestNewsletter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = encodeURIComponent("MONK newsletter subscription request");
    const body = encodeURIComponent("Please add this email address to MONK product updates:\n\n" + newsletterEmail.trim());
    window.location.href = `mailto:admin@monk.monster?subject=${subject}&body=${body}`;
  };
  return <Reveal className="footer-reveal"><footer className="public-footer" aria-label="MONK website footer">
    <div className="footer-top-grid">
      <section className="footer-brand-column">
        <a className="footer-brand-link" href="/" onClick={go("/")}><Brand /></a>
        <p className="footer-tagline">Connecting Campus and Commerce.</p>
        <span className="footer-overline"><span className="footer-live-dot"/> INDEPENDENTLY BUILT IN INDIA</span>
        <span className="footer-brand-stamp">MK / 001 <b>EST. 2026</b></span>
      </section>
      <nav className="footer-column" aria-label="Platform links"><h2>Platform</h2>
        <a className="footer-link" href="/" onClick={go("/")}>Home</a>
        <a className="footer-link" href="/campus" onClick={go("/campus")}>MONK Campus</a>
        <a className="footer-link" href="/business" onClick={go("/business")}>MONK Business</a>
        <a className="footer-link" href="/updates" onClick={go("/updates")}>Product updates</a>
      </nav>
      <nav className="footer-column" aria-label="Explore MONK"><h2>Explore</h2>
        <a className="footer-link" href="/about" onClick={go("/about")}>About MONK</a>
        <a className="footer-link" href="/documentation" onClick={go("/documentation")}>Documentation</a>
        <a className="footer-link" href="/faq" onClick={go("/faq")}>Frequently asked questions</a>
        <a className="footer-link" href="/contact" onClick={go("/contact")}>Contact support</a>
      </nav>
      <nav className="footer-column" aria-label="Policies"><h2>Policies</h2>
        <a className="footer-link" href="/privacy" onClick={go("/privacy")}>Privacy</a>
        <a className="footer-link" href="/terms" onClick={go("/terms")}>Terms</a>
        <a className="footer-link" href="/cookies" onClick={go("/cookies")}>Cookies</a>
        <a className="footer-link" href="/security" onClick={go("/security")}>Security</a>
      </nav>
    </div>
    <section className="footer-feature-panel" aria-labelledby="footer-feature-title">
      <div className="footer-panel-spark footer-spark-one" aria-hidden="true">✳</div>
      <div className="footer-panel-spark footer-spark-two" aria-hidden="true">✦</div>
      <div className="footer-panel-heading">
        <a className="footer-panel-wordmark" href="/" onClick={go("/")}>MONK<span>.</span><sup>®</sup></a>
        <a className="footer-panel-cta" href="/contact" onClick={go("/contact")}>Work with MONK <ArrowUpRight size={15}/></a>
      </div>
      <div className="footer-panel-content">
        <span className="footer-panel-kicker">THE NEXT CHAPTER / 2026</span>
        <h2 id="footer-feature-title">Ideas move<br/><em>everything forward.</em></h2>
        <p>Product stories, useful updates and new releases from the MONK ecosystem. Stay in the loop as we build.</p>
        <form className="footer-newsletter" onSubmit={requestNewsletter}>
          <label className="sr-only" htmlFor="monk-newsletter-email">Your email address</label>
          <input id="monk-newsletter-email" type="email" required maxLength={254} value={newsletterEmail} onChange={event=>setNewsletterEmail(event.target.value)} placeholder="Your email address" autoComplete="email"/>
          <button type="submit" aria-label="Request MONK newsletter subscription"><ArrowRight size={20}/></button>
        </form>
        <p className="footer-newsletter-note">No spam. Your email app will open with a subscription request addressed to MONK.</p>
      </div>
      <div className="footer-panel-bottom">
        <p>Have a question? <a href="mailto:admin@monk.monster">admin@monk.monster</a></p>
        <div className="footer-socials" aria-label="MONK social links">
          <a href="https://github.com/mrprashant9339-crypto/MONK-" target="_blank" rel="noreferrer" aria-label="MONK on GitHub"><Github size={19}/></a>
          <span aria-label="Instagram profile coming soon" title="Instagram profile coming soon"><Instagram size={19}/></span>
          <span aria-label="LinkedIn profile coming soon" title="LinkedIn profile coming soon"><Linkedin size={19}/></span>
          <span aria-label="YouTube channel coming soon" title="YouTube channel coming soon"><Youtube size={19}/></span>
        </div>
      </div>
    </section>
    <div className="footer-project-note"><ShieldCheck size={16}/><p><strong>Independent project in development.</strong> Product previews and features may change. Public sample records are illustrative, not live customer data.</p></div>
    <div className="footer-legal">
      <a href="/privacy" onClick={go("/privacy")}>Privacy policy</a><a href="/terms" onClick={go("/terms")}>Terms of service</a><a href="/cookies" onClick={go("/cookies")}>Cookie policy</a>
      <button type="button" onClick={() => window.dispatchEvent(new Event("monk:open-cookie-settings"))}>Cookie settings</button><a href="/refunds" onClick={go("/refunds")}>Refunds</a><a href="/disclaimer" onClick={go("/disclaimer")}>Disclaimer</a><a href="/accessibility" onClick={go("/accessibility")}>Accessibility</a><a href="/data-rights" onClick={go("/data-rights")}>Data rights</a>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} MONK. All rights reserved.</span><span className="footer-bottom-note">Built independently in India <b>·</b> Designed to move ideas forward</span></div>
  </footer></Reveal>;
}

function AboutPage() {
  const navigate = useNavigate();
  return <><Header/><main className="project-info-page about-page">
    <section className="project-info-hero">
      <span className="section-kicker">ABOUT THE PROJECT</span>
      <h1>One foundation.<br/><em>Two focused workspaces.</em></h1>
      <p>MONK is an independently developed software project bringing education and business workflows into a connected, permission-aware workspace experience.</p>
      <div className="project-info-actions"><button className="button-dark" onClick={() => navigate("/campus")}>Explore Campus <ArrowUpRight size={16}/></button><button className="button-light" onClick={() => navigate("/business")}>Explore Business <ArrowUpRight size={16}/></button></div>
    </section>
    <section className="project-info-section">
      <div className="project-info-heading"><span className="section-kicker">THE PRODUCT</span><h2>Designed around<br/><em>different kinds of work.</em></h2></div>
      <div className="about-product-grid">
        <article><span className="about-product-icon"><GraduationCap size={22}/></span><h3>MONK Campus</h3><p>Academic and institution workflows for students, faculty, departments and college administrators.</p><button onClick={() => navigate("/campus")}>Explore Campus <ArrowUpRight size={14}/></button></article>
        <article><span className="about-product-icon"><Store size={22}/></span><h3>MONK Business</h3><p>Operational workflows for growing teams, including projects, customers, sales and day-to-day execution.</p><button onClick={() => navigate("/business")}>Explore Business <ArrowUpRight size={14}/></button></article>
      </div>
    </section>
    <section className="project-info-section about-principles">
      <div className="project-info-heading"><span className="section-kicker">BUILDING PRINCIPLES</span><h2>Useful first.<br/><em>Trust by design.</em></h2></div>
      <div className="about-principle-list">
        <article><ShieldCheck size={19}/><div><h3>Permission-aware access</h3><p>Workspace roles and organisation boundaries are part of the product foundation. They are not a substitute for independent security certification.</p></div></article>
        <article><Layers3 size={19}/><div><h3>Focused experiences</h3><p>Campus and Business have separate workflows while sharing the same underlying platform foundation.</p></div></article>
        <article><Workflow size={19}/><div><h3>Transparent development</h3><p>Features that are not connected or ready are labelled as planned, preview or in development rather than presented as live services.</p></div></article>
      </div>
    </section>
    <section className="project-info-section about-creator">
      <div className="project-info-heading"><span className="section-kicker">PROJECT CREATOR</span><h2>Built independently<br/><em>by Prashant Kumar.</em></h2></div>
      <div className="about-creator-copy"><p>MONK is being designed and developed as an independent product project, with a focus on practical workflows, clear permissions and transparent product status.</p><a href="mailto:admin@monk.monster"><Mail size={15}/> Contact the project <ArrowUpRight size={14}/></a></div>
    </section>
    <section className="project-info-section about-status">
      <div><span className="section-kicker">PROJECT STATUS</span><h2>Independently built.<br/><em>Still in development.</em></h2><p>MONK is not currently presented as an incorporated company, government portal, college authority or accredited institution. Public previews may change, and sample records are illustrative unless clearly identified otherwise.</p></div>
      <div className="about-status-card"><span className="status-dot"/> <strong>Development status</strong><b>Active development</b><small>Product scope, integrations and release readiness are being verified in stages.</small><a href="https://github.com/mrprashant9339-crypto/MONK-" target="_blank" rel="noreferrer"><Github size={15}/> View public code repository <ArrowUpRight size={14}/></a></div>
    </section>
    <section className="project-info-contact"><div><span className="section-kicker">CONTACT</span><h2>Questions about MONK?</h2><p>For project, account or responsible disclosure enquiries.</p></div><a href="mailto:admin@monk.monster"><Mail size={16}/> admin@monk.monster <ArrowUpRight size={15}/></a></section>
  </main><Footer/></>;
}

function ProjectInfoPage({ page }: { page: "documentation" | "updates" | "faq" }) {
  const content = {
    documentation: { kicker: "PRODUCT DOCUMENTATION", title: "Understand the MONK workspace.", intro: "The public product guides are being prepared. The current overview pages explain the Campus and Business experiences, while detailed setup and administrator guides are still in progress.", cards: [{title:"MONK Campus",desc:"Explore the public overview of academic and institution workflows.",href:"/campus",label:"Campus overview"},{title:"MONK Business",desc:"Explore the public overview of customer, team and business workflows.",href:"/business",label:"Business overview"},{title:"Account setup",desc:"Create an account and configure an organisation workspace when registration is enabled.",href:"/login?mode=signup",label:"Account setup"}] },
    updates: { kicker: "PRODUCT UPDATES", title: "Progress, without the guesswork.", intro: "MONK is under active development. This page records the current public release position; it does not imply that planned features are already available.", cards: [{title:"Public website and footer",desc:"Four-column responsive footer, legal navigation, cookie preference controls and project contact details.",href:"/",label:"View website"},{title:"Campus and Business previews",desc:"Separate public product experiences for education and business workflows.",href:"/campus",label:"View product previews"},{title:"Trust and transparency",desc:"Privacy, terms, cookie, security, accessibility and data-rights information pages are available for review.",href:"/security",label:"Trust overview"}] },
    faq: { kicker: "FREQUENTLY ASKED QUESTIONS", title: "A clear start with MONK.", intro: "Answers based on the current public website, published policies and available product previews. Where a capability is still being developed, the answer says so.", cards: [
      {title:"Is MONK a registered company or official college portal?",desc:"MONK is an independently developed project. It does not claim to be a government portal, statutory authority, university, examination board or official representative of a college unless a relationship is separately verified and stated.",href:"/about",label:"About the project"},
      {title:"Are the public figures and records real customer data?",desc:"No. Public sample figures, profiles and workflow records are illustrative. They are not evidence of real customer activity, student records or institutional participation.",href:"/disclaimer",label:"Read disclaimer"},
      {title:"Can I create an account?",desc:"You can open the signup flow when authentication is available. Account creation may require email verification and an organization workspace setup; a public preview alone does not mean an account has been created.",href:"/login?mode=signup",label:"Open signup"},
      {title:"What is MONK Campus?",desc:"MONK Campus is the education workspace concept for institutions, departments, students, faculty and academic operations. Institution administrators control roles and access to real records.",href:"/campus",label:"Explore Campus"},
      {title:"What is MONK Business?",desc:"MONK Business is the business workspace concept for customer relationships, sales opportunities, projects and operational workflows. The public business preview uses fictional sample data.",href:"/business",label:"Explore Business"},
      {title:"Is the college directory a complete India-wide directory?",desc:"No. The current public page is labelled a Bihar Polytechnic preview and explicitly says it is not a complete live admission directory. Verify affiliation, courses and admissions with the relevant official institution or authority.",href:"/campus#college-directory",label:"View directory preview"},
      {title:"Does MONK currently charge for subscriptions?",desc:"The current public release does not offer a paid subscription, accept payment or process purchases. If paid plans are introduced, prices and terms must be shown before checkout.",href:"/refunds",label:"Read refund policy"},
      {title:"How do I submit a support or privacy request?",desc:"Use the Contact page for a server-stored support ticket. Data-rights and security-disclosure pages currently prepare an email draft for you to review and send; they do not submit those drafts to the MONK server.",href:"/contact",label:"Contact MONK"}
    ] }
  }[page];
  const navigate = useNavigate();
  return <><Header/><main className="project-info-page">
    <section className="project-info-hero compact"><span className="section-kicker">{content.kicker}</span><h1>{content.title}</h1><p>{content.intro}</p></section>
    <section className="project-info-section project-resource-grid">{content.cards.map(card=><article key={card.title}><h2>{card.title}</h2><p>{card.desc}</p><a href={card.href} onClick={event=>{if(card.href.startsWith("/")){event.preventDefault();navigate(card.href);}}}>{card.label} <ArrowUpRight size={14}/></a></article>)}</section>
  </main><Footer/></>;
}

function PortalCard({ portal, title, desc, points, onClick }: { portal: Portal; title: string; desc: string; points: string[]; onClick: () => void }) {
  const Icon = portal === "campus" ? GraduationCap : Store;
  return <button className={`portal-card ${portal}`} onClick={onClick}><span className="portal-card-top"><span className="portal-icon"><Icon size={25}/></span><span className="portal-arrow"><ArrowUpRight size={19}/></span></span><span className="portal-kicker">{portal === "campus" ? "FOR EDUCATION" : "FOR COMMERCE & TEAMS"}</span><strong>{title}</strong><span className="portal-desc">{desc}</span><span className="portal-points">{points.map(p => <span key={p}><CheckCircle2 size={14}/>{p}</span>)}</span><span className="portal-explore">Explore {portal === "campus" ? "Campus" : "Business"} <ArrowRight size={16}/></span></button>;
}
function HomePage() {
  const navigate = useNavigate();
  const capabilityCards = [
    { icon: GraduationCap, label: "01 / CAMPUS", title: "Academic life, in sync.", desc: "Bring people, classes, notices, attendance and institution workflows into one structured space.", tone: "pink" },
    { icon: Store, label: "02 / BUSINESS", title: "Daily operations, clearer.", desc: "Keep customer conversations, products, orders, bookings and team work connected.", tone: "yellow" },
    { icon: ShieldCheck, label: "03 / FOUNDATION", title: "Access with purpose.", desc: "Keep each workspace organized around roles, permissions and the information people need.", tone: "ink" }
  ];
  const workflowCards = [
    { n: "01", icon: Layers3, title: "Choose a workspace", desc: "Start with Campus or Business. Each has a focused product experience." },
    { n: "02", icon: Search, title: "Explore the flow", desc: "Understand the tools and sample journeys before creating an account." },
    { n: "03", icon: Users, title: "Bring your people", desc: "Set up your organization and invite the right teammates." },
    { n: "04", icon: Workflow, title: "Move work forward", desc: "Coordinate daily activity in one connected workspace." }
  ];
  return <><ScrollProgress/><Header/><main className="public-main">
    <section className="home-hero"><div className="hero-copy"><span className="eyebrow-pill"><span/> TWO PURPOSES. ONE CONNECTED PLATFORM.</span><h1>Make room for<br/><em>what moves you.</em></h1><h2 className="hero-product-promise">College operations and business workflows, in one clear workspace.</h2><p className="hero-lede">MONK gives institutions a focused space for academic coordination and gives businesses a clearer way to manage customers, products, orders and teams.</p><div className="hero-actions hero-audience-actions"><button className="button-dark" onClick={() => navigate("/campus")}>I run a college <span>Explore Campus</span> <ArrowRight size={17}/></button><button className="button-light" onClick={() => navigate("/business")}>I run a business <span>Explore Business</span> <ArrowRight size={17}/></button></div><div className="hero-trust"><span><ShieldCheck size={15}/> Private by design</span><span><Layers3 size={15}/> Built around your work</span></div></div>
      <div className="hero-art" aria-label="Animated MONK product preview"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-glow"/><div className="hero-m"><MonkMark large/></div><div className="float-chip chip-campus"><GraduationCap size={17}/><span><b>Campus</b><small>People · Learning</small></span></div><div className="float-chip chip-business"><Store size={17}/><span><b>Business</b><small>Customers · Growth</small></span></div><div className="float-chip chip-secure"><ShieldCheck size={15}/> Secure workspaces</div><div className="hero-spark spark-a">✳</div><div className="hero-spark spark-b">✳</div></div>
    </section>
    <section className="brand-marquee" aria-label="MONK platform principles"><div className="brand-marquee-track" aria-hidden="true">{Array.from({length:4},(_,i)=><span key={i}>MONK <i>✳</i> CONNECT <i>✳</i> ORGANIZE <i>✳</i> CREATE <i>✳</i> MOVE FORWARD <i>✳</i></span>)}</div></section>
    <section className="choose-section" id="choose-path"><Reveal><div className="section-intro"><span className="section-kicker">START WITH YOUR PURPOSE</span><h2>One first choice.<br/><em>Your own MONK experience.</em></h2><p>No account needed to explore. Choose the space that matches what you want to do.</p></div></Reveal><div className="portal-grid"><Reveal><PortalCard portal="campus" title="MONK Campus" desc="A connected digital space for colleges, polytechnics, students and faculty." points={["Institution directory & demos","Academic and campus workflows","Role-based college workspace"]} onClick={() => navigate("/campus")}/></Reveal><Reveal><PortalCard portal="business" title="MONK Business" desc="A practical operating space for local shops, service teams and growing startups." points={["Customer & sales management","Inventory, orders and invoices","Team and workflow management"]} onClick={() => navigate("/business")}/></Reveal></div></section>
    <section className="platform-story-section"><Reveal><div className="platform-story-heading"><span className="section-kicker">ONE FOUNDATION / TWO EXPERIENCES</span><h2>Different work.<br/><em>One connected way forward.</em></h2><p>MONK keeps the product focused: a dedicated experience for institutions, another for businesses, and a shared foundation designed to keep work clear.</p></div></Reveal><div className="platform-story-grid">{capabilityCards.map((card,i)=><Reveal key={card.label}><article className={`platform-story-card story-${card.tone}`}><div className="story-card-top"><span>{card.label}</span><card.icon size={22}/></div><div><h3>{card.title}</h3><p>{card.desc}</p></div><span className="story-card-index">0{i+1}</span></article></Reveal>)}</div></section>
    <section className="manifesto" id="about"><Reveal><div className="manifesto-mark"><MonkMark large/></div><div><span className="section-kicker">THE MONK IDEA</span><h2>Less scattered work.<br/><em>More meaningful progress.</em></h2><p>MONK is designed as two focused experiences sharing one dependable foundation. Your college sees academic operations. Your business sees customers and execution. Each workspace stays relevant to its purpose.</p></div></Reveal></section>
    <section className="how-section" id="how-it-works"><Reveal><span className="section-kicker">A SIMPLE START</span><h2>From first visit to<br/><em>your own workspace.</em></h2><p className="how-section-lede">A guided path from exploration to organized teamwork. Start at your own pace.</p></Reveal><div className="steps-grid">{workflowCards.map(step=><Reveal key={step.n}><article className="step-card expanded-step-card"><div className="step-card-icon"><step.icon size={18}/></div><span>{step.n}</span><h3>{step.title}</h3><p>{step.desc}</p></article></Reveal>)}</div></section>
    <section className="product-preview-section"><div className="product-preview-copy"><Reveal><span className="section-kicker">A WORKSPACE THAT FEELS CLEAR</span><h2>Less switching.<br/><em>More seeing the whole picture.</em></h2><p>Keep everyday work visible with simple overviews, helpful status cues and role-aware spaces. The previews below illustrate the product direction; they are not live customer records.</p><div className="preview-benefit-list"><span><CheckCircle2 size={16}/> Clear at-a-glance summaries</span><span><CheckCircle2 size={16}/> Focused tools for each workspace</span><span><CheckCircle2 size={16}/> Sample data clearly identified</span></div><button className="button-dark" onClick={()=>navigate("/documentation")}>Explore product guide <ArrowUpRight size={16}/></button></Reveal></div><Reveal className="product-ui-reveal"><div className="product-ui-window"><div className="product-ui-topbar"><span className="ui-window-dots"><i/><i/><i/></span><b>MONK / WORKSPACE</b><span className="ui-preview-badge">PREVIEW</span></div><div className="product-ui-body"><aside className="product-ui-sidebar"><div className="ui-sidebar-mark"><MonkMark/></div><span className="ui-sidebar-active"><Layers3 size={14}/> Overview</span><span><Users size={14}/> People</span><span><CalendarDays size={14}/> Schedule</span><span><BarChart3 size={14}/> Insights</span></aside><div className="product-ui-main"><div className="ui-welcome-row"><div><small>YOUR DAY, IN CONTEXT</small><h3>Good things move here.</h3></div><span className="ui-avatar">M</span></div><div className="ui-metric-row"><div><small>Workspace</small><b>Connected</b><i className="ui-meter meter-pink"/></div><div><small>People</small><b>In one place</b><i className="ui-meter meter-yellow"/></div></div><div className="ui-task-list"><small>WORKFLOW SNAPSHOT</small><div><i className="ui-task-check"><CheckCircle2 size={13}/></i><span><b>Plan the next milestone</b><small>Workspace planning</small></span><em>READY</em></div><div><i className="ui-task-check"><CalendarDays size={13}/></i><span><b>Coordinate the team</b><small>Shared schedule</small></span><em>IN FLOW</em></div><div><i className="ui-task-check"><BookOpen size={13}/></i><span><b>Keep resources organized</b><small>Shared knowledge</small></span><em>OPEN</em></div></div></div></div><div className="product-ui-foot"><span><ShieldCheck size={13}/> ROLE-AWARE WORKSPACE</span><span>MONK / 001</span></div></div></Reveal></section>
    <section className="principles-section"><Reveal><div className="section-intro"><span className="section-kicker">BUILT WITH INTENTION</span><h2>Useful by design.<br/><em>Clear at every step.</em></h2><p>Good software should help people understand what is happening without adding unnecessary complexity.</p></div></Reveal><div className="principles-grid"><Reveal><article><span><ShieldCheck size={20}/></span><h3>Respectful access</h3><p>Workspace information should be available to the people who need it, based on assigned permissions.</p></article></Reveal><Reveal><article><Layers3 size={20}/><h3>Focused experiences</h3><p>Campus and Business stay tailored to their different day-to-day needs.</p></article></Reveal><Reveal><article><Workflow size={20}/><h3>Connected workflows</h3><p>Bring related tasks, records and team activity into a more understandable flow.</p></article></Reveal></div></section>
    <section className="manifesto closing-manifesto"><Reveal><div><span className="section-kicker">MADE TO GROW WITH YOUR WORK</span><h2>Start simple.<br/><em>Build momentum.</em></h2><p>Explore the public previews, learn how MONK is structured and choose the workspace that fits your next step.</p></div><div className="closing-manifesto-actions"><button className="button-dark" onClick={()=>navigate("/campus")}>Explore Campus <ArrowUpRight size={16}/></button><button className="button-light" onClick={()=>navigate("/business")}>Explore Business <ArrowUpRight size={16}/></button><a href="/faq" onClick={event=>{event.preventDefault();navigate("/faq");}}>Questions? Visit the FAQ <ChevronRight size={15}/></a></div></Reveal></section>
    <section className="reviews-section" aria-labelledby="reviews-heading"><Reveal><span className="section-kicker">CUSTOMER FEEDBACK</span><h2 id="reviews-heading">Real experiences.<br/><em>Only when verified.</em></h2><p className="reviews-intro">No customer reviews are published yet. This section is reserved for genuine feedback shared by real customers with their permission.</p></Reveal><div className="review-placeholder-grid"><article className="review-placeholder"><span>REVIEW PLACEHOLDER 01</span><p>Reserved for a verified customer review.</p><small>Awaiting real review and publication permission</small></article><article className="review-placeholder"><span>REVIEW PLACEHOLDER 02</span><p>Reserved for a verified customer review.</p><small>Awaiting real review and publication permission</small></article><article className="review-placeholder"><span>REVIEW PLACEHOLDER 03</span><p>Reserved for a verified customer review.</p><small>Awaiting real review and publication permission</small></article></div></section>
    <section className="closing-cta"><Reveal><span className="section-kicker">YOUR WORK. YOUR WAY.</span><h2>Start with the work<br/>you want to improve.</h2><div><button className="button-dark" onClick={() => navigate("/campus")}>Explore Campus <ArrowUpRight size={16}/></button><button className="button-light" onClick={() => navigate("/business")}>Explore Business <ArrowUpRight size={16}/></button></div></Reveal></section>
  </main><Footer/></>;
}
function FeatureGrid({ items }: { items: Array<{ icon: LucideIcon; title: string; desc: string }> }) {
  return <div className="feature-grid">{items.map((item, i) => <Reveal key={item.title}><article className="feature-card" style={{transitionDelay:`${i * 45}ms`}}><span><item.icon size={19}/></span><h3>{item.title}</h3><p>{item.desc}</p></article></Reveal>)}</div>;
}
function CampusPage() {
  const navigate = useNavigate();
  return <><Header active="campus"/><main className="portal-page campus-page"><section className="portal-hero"><div className="portal-hero-copy"><span className="eyebrow-pill"><GraduationCap size={14}/> MONK CAMPUS</span><h1>One campus.<br/><em>Every connection.</em></h1><p>Bring students, faculty, departments and college operations into one organized digital space—built for institutions and the people who make them work.</p><div className="hero-actions"><button className="button-dark" onClick={() => navigate("/login?vertical=education&mode=signup")}>Create a college workspace <ArrowRight size={17}/></button><a href="#college-directory">Explore colleges <ChevronRight size={16}/></a></div><div className="demo-label"><span className="demo-pulse"/> IN DEVELOPMENT · PREVIEW AVAILABLE · No login required</div></div><div className="campus-preview"><div className="preview-top"><span><MonkMark/> CAMPUS OVERVIEW</span><span className="preview-status">DEMO</span></div><div className="preview-welcome">Good morning, <b>Campus team</b><small>Your institution at a glance</small></div><div className="preview-metrics"><div><strong>2,480</strong><small>Students</small></div><div><strong>86</strong><small>Faculty</small></div><div><strong>94%</strong><small>Attendance</small></div></div><div className="preview-schedule"><span>UPCOMING</span><div><b>Mechanical Engineering · 3rd Sem</b><small>Workshop practice · 10:30 AM</small></div><CalendarDays size={18}/></div><div className="preview-notice"><span><BookOpen size={15}/> Academic notice</span><b>Internal assessment schedule published</b></div><small className="preview-disclaimer">Illustrative demo data — not a live college record</small></div></section>
    <section className="portal-benefits"><div className="section-intro"><span className="section-kicker">BUILT FOR INSTITUTIONS</span><h2>Campus life, connected<br/><em>from one place.</em></h2><p>Keep everyday academic work structured, visible and permission-aware.</p></div><FeatureGrid items={campusFeatures}/></section>
    <InstitutionDirectory/>
    <section className="roles-section"><span className="section-kicker">ONE INSTITUTION. CLEAR RESPONSIBILITIES.</span><h2>Every role gets<br/><em>the right view.</em></h2><div className="role-chips">{["Principal / Admin","HOD","Faculty","Student","Office staff","Parent / Guardian"].map(role=><span key={role}><CheckCircle2 size={15}/>{role}</span>)}</div><p>Role access is configured by the institution. A role name in this preview does not grant access to real student records.</p></section>
    <section className="portal-bottom-cta"><div><span className="section-kicker">FOR YOUR INSTITUTION</span><h2>Give your campus<br/>one clear workspace.</h2><p>Start with a secure institution account, then invite the people who need access.</p></div><button className="button-dark" onClick={() => navigate("/login?vertical=education&mode=signup")}>Set up MONK Campus <ArrowUpRight size={17}/></button></section>
  </main><Footer/></>;
}
function BusinessPage() {
  const navigate = useNavigate();
  return <><Header active="business"/><main className="portal-page business-page"><section className="portal-hero"><div className="portal-hero-copy"><span className="eyebrow-pill"><Store size={14}/> MONK BUSINESS</span><h1>Run your business.<br/><em>Not the busywork.</em></h1><p>From a neighbourhood shop to a growing startup, connect customers, products, orders and people in one simple operating workspace.</p><div className="hero-actions"><button className="button-dark" onClick={() => navigate("/login?vertical=business&mode=signup")}>Create a business workspace <ArrowRight size={17}/></button><a href="#business-demo">See local business demo <ChevronRight size={16}/></a></div><div className="demo-label"><span className="demo-pulse"/> IN DEVELOPMENT · PREVIEW AVAILABLE · No login required</div></div>
    <div className="business-preview"><div className="preview-top"><span><MonkMark/> BUSINESS OVERVIEW</span><span className="preview-status">DEMO</span></div><div className="business-name"><span className="store-avatar"><Store size={21}/></span><span><b>Muzaffarpur Cycle & Auto Works</b><small>Local repair & retail · Sample business</small></span></div><div className="business-metrics"><div><small>Today's sales</small><strong>₹8,450</strong><span>Illustrative</span></div><div><small>Open orders</small><strong>12</strong><span>Sample records</span></div></div><div className="business-activity"><span>RECENT ACTIVITY</span><div><i className="activity-dot pink-dot"/><span><b>New service booking</b><small>Brake service · 10:42 AM</small></span><strong>New</strong></div><div><i className="activity-dot yellow-dot"/><span><b>Stock updated</b><small>Cycle tubes · 11:15 AM</small></span><strong>Done</strong></div></div><small className="preview-disclaimer">Fictional local demo — no real business or transaction data</small></div></section>
    <section className="portal-benefits"><div className="section-intro"><span className="section-kicker">MADE FOR EVERYDAY OPERATIONS</span><h2>From first enquiry<br/><em>to finished work.</em></h2><p>Simple tools for the real jobs that keep a business moving.</p></div><FeatureGrid items={businessFeatures}/></section>
    <section className="business-demo-section" id="business-demo"><div><span className="section-kicker">A LOCAL BUSINESS, AS A DEMO</span><h2>See how a neighbourhood<br/><em>business could run on MONK.</em></h2><p>This sample is set in Muzaffarpur to make the workflow relatable. It is a fictional example, not a claim that a local shop has joined MONK.</p><div className="demo-checks"><span><CheckCircle2 size={15}/> Customer enquiry to follow-up</span><span><CheckCircle2 size={15}/> Product and service inventory</span><span><CheckCircle2 size={15}/> Booking, invoice and payment status</span></div></div><div className="workflow-card"><div className="workflow-title"><span>ONE CUSTOMER JOURNEY</span><span className="workflow-live">SAMPLE FLOW</span></div>{[{n:"01",t:"Customer enquiry",d:"A customer asks for a cycle repair."},{n:"02",t:"Create service order",d:"Assign mechanic and promised delivery."},{n:"03",t:"Track parts & progress",d:"Record spare parts and work status."},{n:"04",t:"Invoice & close",d:"Issue bill and mark payment received."}].map((step,i)=><div className="workflow-step" key={step.n}><span>{step.n}</span><div><b>{step.t}</b><small>{step.d}</small></div>{i===3?<CheckCircle2 size={17}/>:<ChevronRight size={17}/>}</div>)}</div></section>
    <section className="roles-section"><span className="section-kicker">FROM SOLO OWNER TO TEAM</span><h2>One workspace for<br/><em>the people behind it.</em></h2><div className="role-chips">{["Owner / Admin","Manager","Sales","Accounts","Operations","Staff"].map(role=><span key={role}><CheckCircle2 size={15}/>{role}</span>)}</div><p>Business permissions are assigned by the workspace owner. Demo figures are illustrative only.</p></section>
    <section className="portal-bottom-cta"><div><span className="section-kicker">READY WHEN YOU ARE</span><h2>Make the next workday<br/>a little more organized.</h2><p>Set up your business workspace and invite your team when you are ready.</p></div><button className="button-dark" onClick={() => navigate("/login?vertical=business&mode=signup")}>Set up MONK Business <ArrowUpRight size={17}/></button></section>
  </main><Footer/></>;
}
export default function PublicSite() {
  const location = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); updatePublicPageMetadata(location.pathname); }, [location.pathname]);
  if (isSupportTrustRoute(location.pathname)) return <><SupportTrustPages/><CookieNotice/></>;
  if (location.pathname === "/about") return <><AboutPage/><CookieNotice/></>;
  if (location.pathname === "/documentation") return <><ProjectInfoPage page="documentation"/><CookieNotice/></>;
  if (location.pathname === "/updates") return <><ProjectInfoPage page="updates"/><CookieNotice/></>;
  if (location.pathname === "/faq") return <><ProjectInfoPage page="faq"/><CookieNotice/></>;
  if (location.pathname === "/campus") return <><CampusPage/><CookieNotice/></>;
  if (location.pathname === "/directory") return <><Header active="campus"/><main className="portal-page"><InstitutionDirectory/></main><Footer/><CookieNotice/></>;
  if (location.pathname === "/business") return <><BusinessPage/><CookieNotice/></>;
  if (["/privacy","/terms","/cookies","/refunds","/disclaimer","/security","/accessibility","/data-rights"].includes(location.pathname)) return <><LegalPage/><CookieNotice/></>;
  if (location.pathname === "/") return <><HomePage/><CookieNotice/></>;
  return <><SupportTrustPages/><CookieNotice/></>;
}
