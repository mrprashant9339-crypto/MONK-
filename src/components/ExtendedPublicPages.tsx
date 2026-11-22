import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight, BookOpen, BriefcaseBusiness, Building2, ChevronDown, CircleHelp, Code2, Compass, GraduationCap, Layers3, Mail, Newspaper, Search, ShieldCheck, Sparkles, Store, Workflow } from "lucide-react";
import "../extended-public.css";

type Card = { icon: typeof BookOpen; title: string; description: string; href?: string; tag?: string };
const featureCards: Card[] = [
  {icon:Building2,title:"Workspace foundation",description:"Organise people, teams and work in a shared workspace with clear boundaries.",tag:"Core"},
  {icon:Workflow,title:"Projects and tasks",description:"Plan work, assign owners, track progress and keep next actions visible.",tag:"Core"},
  {icon:GraduationCap,title:"Campus operations",description:"A dedicated experience for institutions, academic teams and learners.",href:"/campus",tag:"Campus"},
  {icon:Store,title:"Business operations",description:"Connect customer activity, sales, inventory and everyday execution.",href:"/business",tag:"Business"},
  {icon:ShieldCheck,title:"Access and accountability",description:"Design workflows around roles, organisation boundaries and reviewable actions.",tag:"Platform"},
  {icon:Sparkles,title:"AI-assisted workflows",description:"A planned layer for guided assistance, with human review for consequential actions.",tag:"Planned"},
  {icon:Layers3,title:"Documents and knowledge",description:"A planned organised home for files, shared resources and workspace knowledge.",tag:"Planned"},
  {icon:Code2,title:"Integrations and developer tools",description:"A planned connection layer for APIs, automation and approved third-party apps.",tag:"Planned"}
];
const solutionCards: Card[] = [
  {icon:GraduationCap,title:"Colleges and polytechnics",description:"Coordinate departments, student services, faculty workflows and academic operations.",href:"/campus"},
  {icon:Building2,title:"Education groups",description:"Build a consistent operating model across institutions and campuses.",href:"/campus"},
  {icon:Store,title:"Local businesses",description:"Bring enquiries, customers, orders, inventory and staff tasks into one place.",href:"/business"},
  {icon:BriefcaseBusiness,title:"Growing startups",description:"Create repeatable processes for projects, customer follow-up and team execution.",href:"/business"}
];
const integrationCards: Card[] = [
  {icon:ShieldCheck,title:"Supabase",description:"Authentication and data services used by the current application foundation.",tag:"Existing foundation"},
  {icon:Mail,title:"Email delivery",description:"Email provider configuration is separate from the public frontend and must be verified before launch.",tag:"Configuration-dependent"},
  {icon:Code2,title:"Developer APIs",description:"API access, webhooks and OAuth app management are planned product surfaces.",tag:"Planned"},
  {icon:Workflow,title:"Automation tools",description:"Workflow triggers and third-party connections require explicit permissions and backend execution.",tag:"Planned"}
];
const faqItems = [
  ["What is MONK?","MONK is an independently developed software project for focused Campus and Business workspace experiences."],
  ["Is MONK ready for production?","Not all modules are production-ready. Public pages distinguish implemented foundations, previews and planned capabilities."],
  ["Are the college and business records real?","Public examples are illustrative unless a record is explicitly sourced and verified. A preview must not be treated as an authoritative directory."],
  ["Does MONK have fixed public pricing?","No verified public price list is published here. Pricing will be shown only after plans, limits, taxes and billing terms are finalised."],
  ["Can I connect external services?","Only integrations explicitly enabled and configured for the product should be treated as available. Other integrations are labelled planned."],
  ["How do I report a security issue?","Use the private vulnerability disclosure page. Do not test systems without written authorisation."]
] as const;
const resources: Card[] = [
  {icon:BookOpen,title:"Product documentation",description:"Public product guide hub and current setup notes.",href:"/documentation"},
  {icon:Newspaper,title:"Product updates",description:"Read the current public development position.",href:"/updates"},
  {icon:ShieldCheck,title:"Security and trust",description:"Review security guidance, privacy routes and current limitations.",href:"/security-center"},
  {icon:CircleHelp,title:"Frequently asked questions",description:"Answers about product scope, status and support.",href:"/faq"}
];
const blogItems = [
  {slug:"building-with-clarity",title:"Building software with clarity",category:"Product principles",summary:"Why clear status labels, permissions and recovery paths matter in a growing product."},
  {slug:"campus-workflows",title:"A connected view of campus workflows",category:"Campus",summary:"How academic teams can think about connected operations without losing role boundaries."},
  {slug:"small-business-operations",title:"Reducing scattered work in small businesses",category:"Business",summary:"A practical look at enquiries, orders, stock and follow-up as one operating flow."}
];
const caseStudies = [
  {slug:"campus-workflow-example",title:"A campus workflow example",sector:"Education",summary:"An illustrative journey connecting academic notices, class schedules and department coordination."},
  {slug:"local-business-example",title:"A local business workflow example",sector:"Business",summary:"An illustrative journey from customer enquiry to service order and invoice review."}
];

function BrandMark() { return <span className="ep-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M8 36V12l16 17L40 12v24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M24 4v5M21.5 6.5h5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg></span>; }
function SiteHeader() {
  const [open,setOpen]=useState(false);
  return <header className="ep-header"><Link to="/" className="ep-brand"><BrandMark/> MONK<span>.</span></Link><nav className={open?"ep-nav is-open":"ep-nav"}><Link to="/features" onClick={()=>setOpen(false)}>Features</Link><Link to="/solutions" onClick={()=>setOpen(false)}>Solutions</Link><Link to="/pricing" onClick={()=>setOpen(false)}>Pricing</Link><Link to="/integrations" onClick={()=>setOpen(false)}>Integrations</Link><Link to="/resources" onClick={()=>setOpen(false)}>Resources</Link><Link to="/faq" onClick={()=>setOpen(false)}>FAQ</Link><Link to="/roadmap" onClick={()=>setOpen(false)}>Roadmap</Link><Link to="/security-center" onClick={()=>setOpen(false)}>Trust</Link></nav><div className="ep-actions"><Link to="/login">Log in</Link><Link className="ep-cta" to="/login?mode=signup">Get started <ArrowUpRight size={15}/></Link></div><button className="ep-menu" aria-label="Toggle navigation" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?"Close":"Menu"}</button></header>;
}
function SiteFooter() {
  return <footer className="ep-footer"><div><Link to="/" className="ep-brand"><BrandMark/> MONK<span>.</span></Link><p>Connecting Campus and Commerce.</p><small>Independent project in development. Public previews may change.</small></div><div className="ep-footer-links"><Link to="/documentation">Documentation</Link><Link to="/faq">FAQ</Link><Link to="/contact">Contact</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/status">System status</Link></div><small>© {new Date().getFullYear()} MONK. All rights reserved.</small></footer>;
}
function CardGrid({items}:{items:Card[]}) {
  return <div className="ep-grid">{items.map(item=><article className="ep-card" key={item.title}><span className="ep-card-icon"><item.icon size={20}/></span>{item.tag&&<span className="ep-tag">{item.tag}</span>}<h2>{item.title}</h2><p>{item.description}</p>{item.href&&<Link to={item.href}>Explore <ArrowUpRight size={14}/></Link>}</article>)}</div>;
}
function Page({eyebrow,title,description,children}:{eyebrow:string;title:string;description:string;children:React.ReactNode}) {
  useEffect(()=>{ document.title = `${title} | MONK`; const meta = document.querySelector('meta[name="description"]'); if(meta) meta.setAttribute("content",description.slice(0,155)); const canonical = document.querySelector('link[rel="canonical"]'); if(canonical) canonical.setAttribute("href",window.location.origin+window.location.pathname); },[title,description]);
  return <><SiteHeader/><main className="ep-page"><section className="ep-hero"><span className="ep-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></section>{children}</main><SiteFooter/></>;
}
function HomeAction({label,href}:{label:string;href:string}) { return <Link className="ep-button" to={href}>{label} <ArrowRight size={16}/></Link>; }
function FeaturesPage() {
  const [filter,setFilter]=useState("All");
  const filters=["All","Core","Campus","Business","Platform","Planned"];
  const shown=filter==="All"?featureCards:featureCards.filter(x=>x.tag===filter);
  return <Page eyebrow="THE MONK PLATFORM" title="One foundation for focused work." description="Explore the current product direction across Campus, Business and shared workspace capabilities. Each item is labelled according to its current maturity."><section className="ep-section"><div className="ep-filter" role="group" aria-label="Filter features">{filters.map(x=><button key={x} className={filter===x?"active":""} onClick={()=>setFilter(x)}>{x}</button>)}</div><CardGrid items={shown}/></section><section className="ep-callout"><h2>Start with the workspace that fits your work.</h2><div><HomeAction label="Explore Campus" href="/campus"/><HomeAction label="Explore Business" href="/business"/></div></section></Page>;
}
function SolutionsPage() {
  return <Page eyebrow="SOLUTIONS" title="Different work. A focused place to manage it." description="MONK separates education and business experiences while keeping a consistent platform foundation. Choose the workflow that matches your organisation."><section className="ep-section"><CardGrid items={solutionCards}/></section></Page>;
}
function PricingPage({compare=false}:{compare?:boolean}) {
  const rows=[["Workspace setup","Organisation profile and core workspace foundation","Included in product foundation"],["Projects and tasks","Plan and track day-to-day work","Availability depends on release"],["Campus workflows","Institution-specific academic operations","Campus product area"],["Business workflows","Customer and operational workflows","Business product area"],["Advanced automation","AI and workflow execution capabilities","Planned / configuration-dependent"],["Support and administration","Help, account and organisation controls","Scope to be published"]];
  return <Page eyebrow={compare?"PLAN COMPARISON":"PLANS & PRICING"} title={compare?"Compare capabilities, not guesses.":"Straightforward plans are coming after verification."} description="MONK does not publish invented prices or unconfirmed plan limits. This page explains the current capability areas; final commercial terms will be published only after they are approved."><section className="ep-section"><div className="ep-pricing-note"><ShieldCheck/><div><strong>No fabricated prices or checkout.</strong><p>There is no payment action on this page. A plan or price is not an offer until the final terms are published.</p></div></div><div className="ep-table-wrap"><table className="ep-table"><thead><tr><th>Capability</th><th>What it covers</th><th>Current position</th></tr></thead><tbody>{rows.map(row=><tr key={row[0]}>{row.map(cell=><td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div><div className="ep-actions"><HomeAction label="Contact the project" href="/contact"/><HomeAction label="View product updates" href="/updates"/></div></section></Page>;
}
function IntegrationsPage() {
  const [query,setQuery]=useState("");
  const filtered=integrationCards.filter(x=>(x.title+" "+x.description+" "+x.tag).toLowerCase().includes(query.toLowerCase()));
  return <Page eyebrow="INTEGRATIONS" title="Connect services with clear permission boundaries." description="This catalogue distinguishes current application foundations from integrations that are planned or require operator configuration. A card does not mean an integration is enabled for your account."><section className="ep-section"><label className="ep-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search integrations" aria-label="Search integrations"/></label><CardGrid items={filtered}/>{filtered.length===0&&<p className="ep-empty">No matching integration. Try another search term.</p>}</section></Page>;
}
function ResourcesPage() {
  return <Page eyebrow="RESOURCES" title="Useful information for every stage." description="Start with product guides, release information and trust resources. Detailed administrator documentation is being expanded as the product matures."><section className="ep-section"><CardGrid items={resources}/></section></Page>;
}
function BlogPage({slug}:{slug?:string}) {
  const item=blogItems.find(x=>x.slug===slug);
  if(slug&&!item)return <RecoveryPage kind="not-found"/>;
  if(item)return <Page eyebrow={item.category.toUpperCase()} title={item.title} description={item.summary}><section className="ep-section ep-article"><p>This is an editorial overview for the MONK product direction. It is not a customer case study or a claim of measured business outcomes.</p><h2>Start with a clear workflow</h2><p>Define the people involved, the information each role needs, the actions they can take and the recovery path when a step fails. Keep sample data separate from verified operational records.</p><h2>Make maturity visible</h2><p>Label features as available, preview, configuration-dependent or planned. Users should never need to guess whether a button will save data or whether a status indicator is live.</p><Link to="/resources">Back to resources <ArrowRight size={15}/></Link></section></Page>;
  return <Page eyebrow="MONK JOURNAL" title="Ideas for more organised work." description="Product notes and practical workflow explainers. Articles describe design principles and illustrative workflows, not customer outcomes."><section className="ep-section"><div className="ep-grid">{blogItems.map(x=><article className="ep-card" key={x.slug}><span className="ep-tag">{x.category}</span><h2>{x.title}</h2><p>{x.summary}</p><Link to={"/blog/"+x.slug}>Read article <ArrowUpRight size={14}/></Link></article>)}</div></section></Page>;
}
function CaseStudiesPage({slug}:{slug?:string}) {
  const item=caseStudies.find(x=>x.slug===slug);
  if(slug&&!item)return <RecoveryPage kind="not-found"/>;
  if(item)return <Page eyebrow={"ILLUSTRATIVE "+item.sector.toUpperCase()+" WORKFLOW"} title={item.title} description={item.summary}><section className="ep-section ep-article"><div className="ep-pricing-note"><ShieldCheck/><div><strong>Illustrative scenario — not a customer case study.</strong><p>No real customer, institution, metric or outcome is represented here.</p></div></div><h2>Workflow outline</h2><ol><li>Identify the people and roles involved.</li><li>Define the information each role is allowed to access.</li><li>Record work items and ownership clearly.</li><li>Provide review, error and recovery paths.</li></ol><Link to="/case-studies">Back to examples <ArrowRight size={15}/></Link></section></Page>;
  return <Page eyebrow="WORKFLOW EXAMPLES" title="See the workflow, not invented results." description="These are illustrative scenarios created to explain product direction. MONK does not present them as verified customer deployments or measured outcomes."><section className="ep-section"><CardGrid items={caseStudies.map(x=>({icon:Compass,title:x.title,description:x.summary,href:"/case-studies/"+x.slug,tag:"Illustrative"}))}/></section></Page>;
}
function RoadmapPage() {
  const milestones=[["Available foundation","Public product pages, account entry foundation, workspace shell, project/task foundations and trust information.","Current"],["In development","Expanded public documentation, page-level interactions, responsive refinement and quality automation.","In progress"],["Planned","Broader Campus and Business modules, AI-assisted workflows, developer tools and marketplace surfaces.","Planned"]];
  return <Page eyebrow="PRODUCT ROADMAP" title="A visible roadmap with honest status." description="This roadmap describes product direction, not a delivery promise. Status changes only when implementation and verification evidence are available."><section className="ep-section ep-roadmap">{milestones.map(([title,desc,status])=><article className="ep-roadmap-item" key={title}><span className="ep-tag">{status}</span><div><h2>{title}</h2><p>{desc}</p></div></article>)}</section></Page>;
}
function CareersPage() {
  return <Page eyebrow="CAREERS" title="Build thoughtful software with us." description="MONK is an independent product project. No verified vacancies are currently published, and this page does not imply an active hiring process."><section className="ep-section ep-empty-state"><BriefcaseBusiness size={28}/><h2>No open roles at this time</h2><p>When a role is approved, this page will include its responsibilities, required skills, location, employment type and application process.</p><a href="mailto:admin@monk.monster?subject=MONK%20career%20interest">Send a general expression of interest <ArrowUpRight size={15}/></a></section></Page>;
}
function PartnersPage() {
  return <Page eyebrow="PARTNERS" title="A partner programme built on trust." description="MONK is exploring responsible collaboration with education, technology and implementation partners. No partner status is implied by appearing on this page."><section className="ep-section"><CardGrid items={[{icon:GraduationCap,title:"Education ecosystem",description:"Institutions and academic technology providers interested in responsible workflow design."},{icon:Code2,title:"Technology partners",description:"Developers and service providers building secure, permission-aware integrations."},{icon:BriefcaseBusiness,title:"Implementation partners",description:"Consultants and operators helping organisations adopt structured digital workflows."}]}/><div className="ep-callout"><h2>Discuss a potential collaboration.</h2><a href="mailto:admin@monk.monster?subject=MONK%20partnership%20enquiry">Contact the project <ArrowUpRight size={15}/></a></div></section></Page>;
}
function FaqPage() {
  const [query,setQuery]=useState("");
  const [open,setOpen]=useState<number|null>(0);
  const shown=useMemo(()=>faqItems.map((x,i)=>({...x,index:i})).filter(x=>(x[0]+" "+x[1]).toLowerCase().includes(query.toLowerCase())),[query]);
  return <Page eyebrow="HELP CENTRE" title="Answers before you need to ask." description="Search common questions about MONK's product scope, account setup, integrations and current development status."><section className="ep-section"><label className="ep-search"><Search size={17}/><input aria-label="Search frequently asked questions" value={query} onChange={e=>{setQuery(e.target.value);setOpen(null);}} placeholder="Search questions"/></label><div className="ep-faq">{shown.map(x=><article key={x.index}><button aria-expanded={open===x.index} onClick={()=>setOpen(open===x.index?null:x.index)}><span>{x[0]}</span><ChevronDown className={open===x.index?"rotated":""}/></button>{open===x.index&&<p>{x[1]}</p>}</article>)}</div>{shown.length===0&&<p className="ep-empty">No matching question. Contact support for help.</p>}<Link to="/contact" className="ep-inline-link">Still need help? Contact MONK <ArrowRight size={15}/></Link></section></Page>;
}
function RecoveryPage({kind}:{kind:"forbidden"|"server"|"session"|"not-found"}) {
  const config={forbidden:["403 · ACCESS RESTRICTED","You do not have permission to view this page.","The page may require a different account role or organisation membership. Sign in with the correct account or contact the workspace administrator."],server:["500 · UNEXPECTED ERROR","The request could not be completed.","The service returned an unexpected response. Wait briefly, retry once, and avoid repeating a payment or data-changing action until its status is confirmed."],session:["SESSION EXPIRED","Your session needs to be refreshed.","Sign in again to continue. Unsaved changes may not be recoverable. Never share a password or one-time code with support."], "not-found":["404 · PAGE NOT FOUND","This page could not be found.","The address may be incorrect or the page may have moved. Return to the home page or use the main navigation."]}[kind];
  return <main className="ep-recovery"><Link to="/" className="ep-brand"><BrandMark/> MONK<span>.</span></Link><section><span className="ep-eyebrow">{config[0]}</span><h1>{config[1]}</h1><p>{config[2]}</p><div className="ep-actions"><Link className="ep-button" to={kind==="session"?"/login":"/"}>{kind==="session"?"Sign in again":"Go to home"} <ArrowRight size={15}/></Link><Link to="/contact">Contact support</Link>{kind==="server"&&<button onClick={()=>window.location.reload()}>Retry page</button>}</div></section><small>MONK · Independent project in development</small></main>;
}
export default function ExtendedPublicPages() {
  const {pathname}=useLocation();
  if(pathname==="/faq")return <FaqPage/>;
  if(pathname==="/features")return <FeaturesPage/>;
  if(pathname==="/solutions")return <SolutionsPage/>;
  if(pathname==="/pricing")return <PricingPage/>;
  if(pathname==="/compare-plans")return <PricingPage compare/>;
  if(pathname==="/integrations")return <IntegrationsPage/>;
  if(pathname==="/resources")return <ResourcesPage/>;
  if(pathname==="/blog")return <BlogPage/>;
  if(pathname.startsWith("/blog/"))return <BlogPage slug={pathname.split("/").pop()}/>;
  if(pathname==="/case-studies")return <CaseStudiesPage/>;
  if(pathname.startsWith("/case-studies/"))return <CaseStudiesPage slug={pathname.split("/").pop()}/>;
  if(pathname==="/roadmap")return <RoadmapPage/>;
  if(pathname==="/careers")return <CareersPage/>;
  if(pathname==="/partners")return <PartnersPage/>;
  if(pathname==="/403")return <RecoveryPage kind="forbidden"/>;
  if(pathname==="/500")return <RecoveryPage kind="server"/>;
  if(pathname==="/session-expired")return <RecoveryPage kind="session"/>;
  return <FaqPage/>;
}
