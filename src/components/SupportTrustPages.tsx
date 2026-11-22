import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2, CircleHelp, Clock3,
  FileText, LifeBuoy, Mail, MessageSquare, RefreshCw, ShieldCheck, WifiOff,
  AlertTriangle, LockKeyhole, Copy, Activity, Bug, ClipboardList, Home, Server
} from "lucide-react";
import "../support-trust.css";

type Ticket = { id: string; subject: string; category: string; message: string; email: string; createdAt: string; status: "Saved locally"; };
const TICKET_KEY = "monk-support-tickets-v1";
const REQUEST_KEY = "monk-privacy-requests-v1";
const readList = <T,>(key: string): T[] => {
  try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value as T[] : []; }
  catch { return []; }
};
const storeList = <T,>(key: string, value: T[]) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
};
const emailAddress = "admin@monk.monster";

function Shell({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  useEffect(() => { document.title = `${title} | MONK`; const meta = document.querySelector('meta[name="description"]'); if (meta) meta.setAttribute("content", intro.slice(0, 155)); }, [title, intro]);
  return <main className="st-shell">
    <header className="st-header">
      <Link to="/" className="st-brand"><span className="st-mark">M</span><span>MONK<span>.</span></span></Link>
      <nav><Link to="/contact">Contact</Link><Link to="/support/tickets">Support tickets</Link><Link to="/security-center">Security</Link></nav>
      <Link to="/" className="st-back"><ArrowLeft size={15}/> Website</Link>
    </header>
    <div className="st-wrap">
      <div className="st-crumb"><Link to="/">Home</Link><span>/</span><span>Trust &amp; Support</span></div>
      <section className="st-hero"><span className="st-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{intro}</p></section>
      {children}
      <footer className="st-footer"><span>© {new Date().getFullYear()} MONK · Independent project in development</span><div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/cookies">Cookies</Link><a href={`mailto:${emailAddress}`}>{emailAddress}</a></div></footer>
    </div>
  </main>;
}

function ContactPage() {
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [topic,setTopic]=useState("General enquiry"); const [message,setMessage]=useState(""); const [copied,setCopied]=useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && name.trim().length>=2 && message.trim().length>=10;
  function submit(e:FormEvent) { e.preventDefault(); if(!valid) return; const subject=encodeURIComponent(`MONK — ${topic}`); const body=encodeURIComponent(`Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`); window.location.href=`mailto:${emailAddress}?subject=${subject}&body=${body}`; }
  return <Shell eyebrow="CONTACT SUPPORT" title="A clear path to the right help." intro="Send a project, account, privacy or security enquiry. The form prepares an email in your mail app; it does not silently submit or claim that a ticket has been received.">
    <div className="st-grid st-contact-grid"><form className="st-card st-form" onSubmit={submit}>
      <div className="st-card-title"><MessageSquare/><div><h2>Write to the MONK team</h2><p>Required fields are marked with an asterisk.</p></div></div>
      <label>Your name *<input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Full name"/></label>
      <label>Email address *<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <label>What is this about? *<select value={topic} onChange={e=>setTopic(e.target.value)}><option>General enquiry</option><option>Account access</option><option>Workspace or product issue</option><option>Privacy or data request</option><option>Security vulnerability</option><option>Accessibility issue</option></select></label>
      <label>Message *<textarea required minLength={10} maxLength={4000} rows={6} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Describe what you need help with. Do not include passwords, OTPs, API keys or sensitive student records."/></label>
      <div className="st-note"><ShieldCheck size={17}/> Never send passwords, one-time passcodes, full payment-card details or unnecessary identity documents.</div>
      <button className="st-primary" type="submit" disabled={!valid}><Mail size={16}/> Prepare support email <ArrowUpRight size={16}/></button>
    </form><aside className="st-card st-side-card"><span className="st-icon"><LifeBuoy/></span><h2>Other support routes</h2>
      <Link to="/support/tickets"><ClipboardList/> Support tickets <ArrowRight/></Link><a href="https://wa.me/919288435641" target="_blank" rel="noreferrer"><MessageSquare/> WhatsApp support <ArrowUpRight/></a><Link to="/security-center"><ShieldCheck/> Security center <ArrowRight/></Link><Link to="/privacy-center"><LockKeyhole/> Privacy center <ArrowRight/></Link><Link to="/status"><Activity/> Service status <ArrowRight/></Link>
      <div className="st-divider"/><p className="st-small">Prefer email? Use the published support address.</p><div className="st-email"><a href={`mailto:${emailAddress}`}>{emailAddress}</a><button type="button" aria-label="Copy support email" onClick={()=>{void navigator.clipboard?.writeText(emailAddress);setCopied(true);}}><Copy size={15}/></button></div>{copied&&<small className="st-success">Email address copied when clipboard permission is available.</small>}
    </aside></div>
  </Shell>;
}

function TicketListPage() {
  const [tickets,setTickets]=useState<Ticket[]>(()=>readList<Ticket>(TICKET_KEY));
  const [subject,setSubject]=useState(""); const [category,setCategory]=useState("Technical issue"); const [email,setEmail]=useState(""); const [message,setMessage]=useState(""); const [created,setCreated]=useState<string|null>(null);
  const valid=subject.trim().length>=4 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && message.trim().length>=10;
  function create(e:FormEvent){e.preventDefault();if(!valid)return;const ticket:Ticket={id:`LOCAL-${Date.now().toString(36).toUpperCase()}`,subject:subject.trim(),category,message:message.trim(),email:email.trim(),createdAt:new Date().toISOString(),status:"Saved locally"};const next=[ticket,...tickets];if(storeList(TICKET_KEY,next)){setTickets(next);setCreated(ticket.id);setSubject("");setMessage("");}else setCreated("storage-error");}
  return <Shell eyebrow="SUPPORT TICKETS" title="Keep every support request organized." intro="Create and review ticket drafts on this device. Until a support backend is connected, these records are private local drafts—not tickets delivered to MONK.">
    {created&&<div className={created==="storage-error"?"st-alert":"st-success-panel"} role="status">{created==="storage-error"?"This browser could not save the ticket. Check available device storage.":<>Local ticket draft created: <strong>{created}</strong>. It has not been sent to support.</>}</div>}
    <div className="st-grid st-ticket-grid"><form className="st-card st-form" onSubmit={create}><div className="st-card-title"><ClipboardList/><div><h2>Create a ticket draft</h2><p>Use a working email address for your own reference.</p></div></div>
      <label>Subject *<input required minLength={4} maxLength={120} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Briefly describe the issue"/></label>
      <label>Category *<select value={category} onChange={e=>setCategory(e.target.value)}><option>Technical issue</option><option>Account access</option><option>Billing or refund</option><option>Campus workspace</option><option>Business workspace</option><option>Privacy request</option><option>Security concern</option><option>Other</option></select></label>
      <label>Email address *<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <label>Details *<textarea required minLength={10} maxLength={4000} rows={5} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Steps to reproduce, expected result and what happened."/></label>
      <button className="st-primary" disabled={!valid}><ClipboardList size={16}/> Save ticket draft</button>
      <p className="st-footnote">Local-only storage. Do not enter sensitive personal data, passwords, tokens or student records.</p>
    </form><section className="st-card"><div className="st-card-title"><Clock3/><div><h2>Your saved drafts</h2><p>Only drafts stored in this browser are shown.</p></div></div>
      {tickets.length? <div className="st-ticket-list">{tickets.map(t=><Link to={`/support/tickets/${encodeURIComponent(t.id)}`} key={t.id}><span className="st-ticket-id">{t.id}</span><strong>{t.subject}</strong><small>{t.category} · {new Date(t.createdAt).toLocaleString()}</small><span className="st-local-status">Saved on this device</span></Link>)}</div>:<div className="st-empty"><ClipboardList/><strong>No saved ticket drafts</strong><p>Create a draft to keep the issue details on this device.</p></div>}
    </section></div>
  </Shell>;
}

function TicketDetailPage({id}:{id:string}) {
  const ticket=useMemo(()=>readList<Ticket>(TICKET_KEY).find(t=>t.id===id),[id]);
  return <Shell eyebrow="TICKET DETAILS" title={ticket?ticket.subject:"Ticket draft not found"} intro="This view displays locally saved information only. There is no server-side ticket status or support conversation yet.">
    {ticket?<section className="st-card st-detail"><div className="st-detail-top"><span className="st-ticket-id">{ticket.id}</span><span className="st-local-status">Saved on this device</span></div><dl><div><dt>Category</dt><dd>{ticket.category}</dd></div><div><dt>Contact email</dt><dd>{ticket.email}</dd></div><div><dt>Created</dt><dd>{new Date(ticket.createdAt).toLocaleString()}</dd></div><div><dt>Status</dt><dd>Local draft · Not submitted</dd></div></dl><h2>Issue description</h2><p className="st-message">{ticket.message}</p><a className="st-primary st-link-button" href={`mailto:${emailAddress}?subject=${encodeURIComponent("Support: "+ticket.subject)}&body=${encodeURIComponent(ticket.message+"\n\nReference: "+ticket.id)}`}><Mail size={16}/> Send by email <ArrowUpRight size={16}/></a></section>:<section className="st-card st-empty"><AlertTriangle/><h2>We could not find this local ticket</h2><p>It may have been cleared from browser storage or saved on another device.</p><Link className="st-primary st-link-button" to="/support/tickets">Back to support tickets <ArrowRight size={16}/></Link></section>}
  </Shell>;
}

function StatusPage() {
  return <Shell eyebrow="SYSTEM STATUS" title="Service health, without guesswork." intro="Live uptime monitoring is not connected yet. This page deliberately reports monitoring as unavailable instead of displaying an invented green status.">
    <div className="st-alert st-alert-neutral"><AlertTriangle/><div><strong>Live status is currently unavailable</strong><p>MONK has not connected a public uptime monitor or incident feed to this page. Current service health is therefore unknown.</p></div></div>
    <section className="st-status-grid">{[{name:"Public website",desc:"Website delivery and page access"},{name:"Authentication",desc:"Account sign-in and session services"},{name:"Workspace API",desc:"Projects, tasks and organisation data"},{name:"Email delivery",desc:"Support and transactional messages"}].map(item=><article className="st-card st-service" key={item.name}><span className="st-status-unknown"><span/> Status unknown</span><h2>{item.name}</h2><p>{item.desc}</p></article>)}</section>
    <div className="st-actions"><Link className="st-secondary" to="/incidents">Incident history <ArrowRight size={16}/></Link><button className="st-secondary" onClick={()=>window.location.reload()}><RefreshCw size={15}/> Refresh page</button></div>
    <p className="st-footnote">A browser page cannot independently prove server uptime. Check again after monitoring is configured.</p>
  </Shell>;
}

function IncidentHistoryPage() {
  return <Shell eyebrow="INCIDENT HISTORY" title="A transparent record of service events." intro="No verified incident feed is connected yet. We will publish incident timelines here when monitoring and incident management are operational.">
    <section className="st-card st-empty"><Activity/><h2>No verified incident records available</h2><p>This does not mean that no incidents have occurred. The public incident history is not yet connected to an authoritative monitoring source.</p><Link to="/status" className="st-secondary">View current status <ArrowRight size={16}/></Link></section>
    <div className="st-note"><ShieldCheck size={17}/> We will distinguish confirmed incidents, investigations, mitigations and resolved events. Planned maintenance will be labelled separately.</div>
  </Shell>;
}

function SecurityCenterPage() {
  const cards=[{icon:LockKeyhole,title:"Account safety",desc:"Use a unique password, keep recovery details current and sign out on shared devices.",href:"/security"},{icon:Bug,title:"Report a vulnerability",desc:"Read the responsible disclosure scope and send a private report.",href:"/security/vulnerability-disclosure"},{icon:FileText,title:"Security overview",desc:"Review the controls MONK currently documents and the work still outstanding.",href:"/security"},{icon:Activity,title:"Service status",desc:"Check whether an authoritative uptime monitor is connected.",href:"/status"}];
  return <Shell eyebrow="SECURITY CENTER" title="Security is a process, not a badge." intro="Review account-safety guidance, responsible disclosure and the current limits of MONK's security posture. This page does not claim a certification or completed independent audit.">
    <div className="st-resource-grid">{cards.map(c=><Link className="st-card st-resource" to={c.href} key={c.title}><c.icon/><h2>{c.title}</h2><p>{c.desc}</p><span>Open page <ArrowUpRight size={15}/></span></Link>)}</div>
    <section className="st-card st-security-note"><ShieldCheck/><div><h2>What users should know</h2><p>Do not share passwords, OTPs, access tokens or real student/customer records in public reports. Never test a system or account without explicit authorization. Security controls and certifications are described only when verified.</p><Link to="/security">Read the security overview <ArrowRight size={15}/></Link></div></section>
  </Shell>;
}

function DisclosurePage() {
  const [type,setType]=useState("Web application vulnerability");const [details,setDetails]=useState("");const [contact,setContact]=useState("");
  const ready=details.trim().length>=30 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  return <Shell eyebrow="VULNERABILITY DISCLOSURE" title="Help us investigate safely." intro="Report suspected security weaknesses privately. Do not access, change, download or disclose another person's data. This is a disclosure channel, not permission to conduct testing.">
    <div className="st-grid st-contact-grid"><section className="st-card"><h2>Responsible disclosure rules</h2><ul className="st-check-list"><li>Test only systems and accounts you own or are explicitly authorized to assess.</li><li>Do not perform denial-of-service, phishing, social engineering or destructive testing.</li><li>Do not access or retain personal, student, customer or financial records.</li><li>Share minimal reproduction steps and redact tokens, cookies and personal data.</li><li>Allow time for triage and remediation before public disclosure.</li></ul><div className="st-note"><AlertTriangle size={17}/> No safe-harbour authorization is granted by this page. Obtain written permission before testing.</div></section>
    <form className="st-card st-form" onSubmit={e=>{e.preventDefault();if(!ready)return;window.location.href=`mailto:${emailAddress}?subject=${encodeURIComponent("[Security disclosure] "+type)}&body=${encodeURIComponent("Researcher contact: "+contact+"\n\n"+details)}`;}}><h2>Prepare a private report</h2><label>Issue type<select value={type} onChange={e=>setType(e.target.value)}><option>Web application vulnerability</option><option>Authentication or session issue</option><option>Authorization or tenant isolation</option><option>Data exposure</option><option>Other security concern</option></select></label><label>Contact email *<input type="email" required value={contact} onChange={e=>setContact(e.target.value)} placeholder="researcher@example.com"/></label><label>Technical details *<textarea required minLength={30} maxLength={5000} rows={7} value={details} onChange={e=>setDetails(e.target.value)} placeholder="Affected URL, impact and minimal reproduction steps. Remove all secrets and personal data."/></label><button className="st-primary" disabled={!ready}><ShieldCheck size={16}/> Prepare disclosure email <ArrowUpRight size={16}/></button></form></div>
  </Shell>;
}

function PrivacyCenterPage() {
  return <Shell eyebrow="PRIVACY CENTER" title="Understand and manage your information." intro="Find the privacy policy, browser preferences and data-request routes in one place. Data access, correction or deletion requests require verification and may involve the organisation that manages the workspace.">
    <div className="st-resource-grid">{[{icon:FileText,title:"Privacy policy",desc:"What the current public notice says about information and processing.",href:"/privacy"},{icon:LockKeyhole,title:"Cookie preferences",desc:"Review essential browser storage and optional analytics preferences.",href:"/cookies/preferences"},{icon:ClipboardList,title:"Data rights request",desc:"Prepare a request about access, correction or deletion of personal information.",href:"/data-rights"},{icon:ShieldCheck,title:"Security overview",desc:"Review current security controls and limitations.",href:"/security"}].map(c=><Link className="st-card st-resource" to={c.href} key={c.title}><c.icon/><h2>{c.title}</h2><p>{c.desc}</p><span>Open page <ArrowUpRight size={15}/></span></Link>)}</div>
  </Shell>;
}

function CookiePreferencesPage() {
  const [analytics,setAnalytics]=useState(false);const [saved,setSaved]=useState(false);const [loaded,setLoaded]=useState(false);
  useEffect(()=>{try{const v=JSON.parse(localStorage.getItem("monk-cookie-preferences-v1")||"{}");setAnalytics(v.analytics===true);}catch{setAnalytics(false);}setLoaded(true);},[]);
  function save(value:boolean){try{localStorage.setItem("monk-cookie-preferences-v1",JSON.stringify({necessary:true,analytics:value,updatedAt:new Date().toISOString(),version:1}));setAnalytics(value);setSaved(true);}catch{setSaved(false);}}
  return <Shell eyebrow="COOKIE PREFERENCES" title="You control optional browser preferences." intro="Essential storage supports sign-in and basic site operation. Optional analytics are not connected in the current public frontend; this setting records your preference only.">
    <section className="st-card st-cookie"><div className="st-cookie-row"><div><h2>Essential storage</h2><p>Required for authentication and basic operation. Always active.</p></div><span className="st-required">Required</span></div><div className="st-cookie-row"><div><h2>Optional analytics</h2><p>Preference only. No analytics provider is currently active.</p></div><label className="st-switch"><input type="checkbox" checked={analytics} onChange={e=>{setAnalytics(e.target.checked);setSaved(false);}}/><span/></label></div><button className="st-primary" disabled={!loaded} onClick={()=>save(analytics)}>Save preferences</button>{saved&&<p className="st-success"><CheckCircle2 size={16}/> Your preference was saved in this browser.</p>}<p className="st-footnote">Clearing browser storage may reset these preferences. Read the <Link to="/cookies">cookie policy</Link>.</p></section>
  </Shell>;
}

function DataRequestPage() {
  const [type,setType]=useState("Access my personal information");const [email,setEmail]=useState("");const [details,setDetails]=useState("");const [saved,setSaved]=useState(false);
  const valid=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&details.trim().length>=10;
  function submit(e:FormEvent){e.preventDefault();if(!valid)return;const entry={type,email,details,createdAt:new Date().toISOString(),status:"Draft — not submitted"};const next=[entry,...readList<any>(REQUEST_KEY)];if(storeList(REQUEST_KEY,next))setSaved(true);}
  return <Shell eyebrow="DATA RIGHTS" title="Make a clear, privacy-aware request." intro="Prepare a request concerning personal information. This local form does not submit data to MONK; use the email action after reviewing the draft. Identity and authority may need to be verified before any request is actioned.">
    <form className="st-card st-form st-request-form" onSubmit={submit}><label>Request type<select value={type} onChange={e=>{setType(e.target.value);setSaved(false);}}><option>Access my personal information</option><option>Correct inaccurate information</option><option>Delete personal information</option><option>Withdraw consent where applicable</option><option>Raise a privacy complaint</option><option>Ask a question about processing</option></select></label><label>Account email *<input type="email" required value={email} onChange={e=>{setEmail(e.target.value);setSaved(false);}} placeholder="The email associated with your account"/></label><label>Request details *<textarea required minLength={10} maxLength={3000} rows={6} value={details} onChange={e=>{setDetails(e.target.value);setSaved(false);}} placeholder="Describe the data or workspace involved. Do not attach identity documents or passwords here."/></label><div className="st-note"><ShieldCheck size={17}/> Do not send passwords, OTPs, full identity documents or another person's personal data.</div><button className="st-primary" disabled={!valid}><ClipboardList size={16}/> Save request draft</button>{saved&&<div className="st-success-panel">Draft saved in this browser only. It has not been submitted.</div>}<a className="st-secondary st-mail-link" href={`mailto:${emailAddress}?subject=${encodeURIComponent("MONK data rights request: "+type)}&body=${encodeURIComponent("Account email: "+email+"\n\n"+details)}`}><Mail size={16}/> Prepare email to support <ArrowUpRight size={15}/></a></form>
  </Shell>;
}

function SystemFallbackPage({kind}:{kind:"offline"|"maintenance"|"error"|"not-found"}) {
  const config={
    offline:{icon:WifiOff,kicker:"NETWORK CONNECTION",title:"You appear to be offline.",body:"MONK could not confirm a network connection. Check Wi-Fi or mobile data, then retry. Unsaved form entries may not be recoverable.",action:"Try again"},
    maintenance:{icon:Server,kicker:"MAINTENANCE",title:"MONK is temporarily unavailable.",body:"A maintenance page does not prove that a maintenance window is active. Check the status page for verified information when monitoring is connected.",action:"Check status"},
    error:{icon:AlertTriangle,kicker:"UNEXPECTED ERROR",title:"Something did not load as expected.",body:"Try reloading the page. If the problem continues, contact support and include the page and approximate time. Do not share passwords or tokens.",action:"Reload page"},
    "not-found":{icon:CircleHelp,kicker:"404 · PAGE NOT FOUND",title:"This page does not exist.",body:"The address may be incorrect, the page may have moved, or the link may be out of date.",action:"Return home"}
  }[kind];const Icon=config.icon;const navigate=useNavigate();const [online,setOnline]=useState(typeof navigator==="undefined"?true:navigator.onLine);
  useEffect(()=>{document.title = `${config.title} | MONK`;const on=()=>setOnline(true);const off=()=>setOnline(false);window.addEventListener("online",on);window.addEventListener("offline",off);return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off);};},[]);
  return <main className="st-system"><Link to="/" className="st-brand"><span className="st-mark">M</span><span>MONK<span>.</span></span></Link><section className="st-system-card"><span className="st-system-icon"><Icon size={28}/></span><span className="st-eyebrow">{config.kicker}</span><h1>{config.title}</h1><p>{kind==="offline"&&!online?"Your device currently reports no network connection. ":kind==="offline"&&online?"Your device is online again. ":""}{config.body}</p>{kind==="offline"&&<span className={online?"st-online":"st-offline"}><i/> {online?"Device reports online":"Device reports offline"}</span>}<div className="st-system-actions"><button className="st-primary" onClick={()=>kind==="maintenance"?navigate("/status"):kind==="not-found"?navigate("/"):window.location.reload()}>{kind==="maintenance"?<Activity size={16}/>:kind==="not-found"?<Home size={16}/>:<RefreshCw size={16}/>} {config.action}</button><Link to="/contact" className="st-secondary">Contact support <ArrowRight size={15}/></Link></div></section><footer>MONK · Independent project in development</footer></main>;
}

export function isSupportTrustRoute(path:string) {
  return ["/contact","/support/tickets","/status","/incidents","/security-center","/security/vulnerability-disclosure","/privacy-center","/cookies/preferences","/data-rights","/offline","/maintenance","/error"].includes(path) || /^\/support\/tickets\/[^/]+$/.test(path);
}
export default function SupportTrustPages() {
  const {pathname}=useLocation();
  if(pathname==="/contact")return <ContactPage/>;
  if(pathname==="/support/tickets")return <TicketListPage/>;
  if(pathname.startsWith("/support/tickets/"))return <TicketDetailPage id={decodeURIComponent(pathname.split("/").pop()||"")}/>;
  if(pathname==="/status")return <StatusPage/>;
  if(pathname==="/incidents")return <IncidentHistoryPage/>;
  if(pathname==="/security-center")return <SecurityCenterPage/>;
  if(pathname==="/security/vulnerability-disclosure")return <DisclosurePage/>;
  if(pathname==="/privacy-center")return <PrivacyCenterPage/>;
  if(pathname==="/cookies/preferences")return <CookiePreferencesPage/>;
  if(pathname==="/data-rights")return <DataRequestPage/>;
  if(pathname==="/offline")return <SystemFallbackPage kind="offline"/>;
  if(pathname==="/maintenance")return <SystemFallbackPage kind="maintenance"/>;
  if(pathname==="/error")return <SystemFallbackPage kind="error"/>;
  return <SystemFallbackPage kind="not-found"/>;
}
