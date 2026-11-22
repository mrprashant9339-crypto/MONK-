import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import "../public-site.css";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, GraduationCap, Store, Users, BookOpen, ShieldCheck, BarChart3, CalendarDays, ClipboardList, Package, Receipt, Menu, X, CheckCircle2, MapPin, Search, Layers3, Workflow, ChevronRight } from "lucide-react";

type Portal = "campus" | "business";
const governmentColleges = [
  { code: "117", name: "Government Polytechnic, Muzaffarpur", city: "Muzaffarpur", branches: "Civil · Mechanical · Electrical · CSE · Electronics", tag: "North Bihar" },
  { code: "112", name: "Government Polytechnic, Bhagalpur", city: "Bhagalpur", branches: "Civil · Mechanical · Electrical · CSE · Textile", tag: "Eastern Bihar" },
  { code: "115", name: "Government Polytechnic, Gaya", city: "Gaya", branches: "Civil · Mechanical · Electrical · CSE · Textile", tag: "South Bihar" },
  { code: "118", name: "Government Polytechnic, Patna-7", city: "Patna", branches: "Civil · Mechanical · Electrical · CSE · Printing", tag: "Central Bihar" },
  { code: "119", name: "Government Polytechnic, Purnea", city: "Purnea", branches: "Civil · Mechanical · Electrical · CSE · Electronics", tag: "North-East Bihar" },
  { code: "120", name: "Government Polytechnic, Saharsa", city: "Saharsa", branches: "Civil · Mechanical · Electrical · CSE · Automobile", tag: "Kosi region" }
];
const privateColleges = [
  { name: "Badiuzzama Khan Polytechnic Institute", city: "Pupri, Sitamarhi", branches: "Civil · Mechanical · Electrical · CSE", tag: "Private demo" },
  { name: "Maulana Azad College of Engineering & Technology", city: "Neora, Patna", branches: "Civil · Electrical · CSE", tag: "Private demo" },
  { name: "MPS Polytechnic College", city: "Muzaffarpur", branches: "SBTE directory listing", tag: "Private demo" }
];
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
  return <span className={large ? "monk-mark monk-mark-large" : "monk-mark"} aria-label="MONK logo"><svg viewBox="0 0 48 48" role="img" aria-hidden="true"><path className="mark-path" d="M8 36V12l16 17L40 12v24" /><path className="mark-spark" d="M24 4v5M21.5 6.5h5" /></svg></span>;
}
function Brand() { return <span className="public-brand"><MonkMark /> <span>MONK<span className="brand-period">.</span></span></span>; }
function Header({ active }: { active?: Portal }) {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  return <header className="public-header"><button className="brand-button" onClick={() => navigate("/")}><Brand /></button>
    <nav className={menu ? "public-nav open" : "public-nav"}><button className={active === "campus" ? "nav-active" : ""} onClick={() => { navigate("/campus"); setMenu(false); }}>Campus</button><button className={active === "business" ? "nav-active" : ""} onClick={() => { navigate("/business"); setMenu(false); }}>Business</button><a href="/#how-it-works" onClick={() => setMenu(false)}>How it works</a><a href="/#about" onClick={() => setMenu(false)}>About MONK</a></nav>
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
function Footer() {
  const navigate = useNavigate();
  return <footer className="public-footer"><div className="footer-top"><div><Brand/><p>One platform. Two ways to move forward.</p></div><div className="footer-links"><button onClick={() => navigate("/campus")}>MONK Campus</button><button onClick={() => navigate("/business")}>MONK Business</button><a href="https://sbte.bihar.gov.in/" target="_blank" rel="noreferrer">SBTE Bihar</a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} MONK. All rights reserved.</span><span>Designed for people building what matters.</span></div></footer>;
}
function PortalCard({ portal, title, desc, points, onClick }: { portal: Portal; title: string; desc: string; points: string[]; onClick: () => void }) {
  const Icon = portal === "campus" ? GraduationCap : Store;
  return <button className={`portal-card ${portal}`} onClick={onClick}><span className="portal-card-top"><span className="portal-icon"><Icon size={25}/></span><span className="portal-arrow"><ArrowUpRight size={19}/></span></span><span className="portal-kicker">{portal === "campus" ? "FOR EDUCATION" : "FOR COMMERCE & TEAMS"}</span><strong>{title}</strong><span className="portal-desc">{desc}</span><span className="portal-points">{points.map(p => <span key={p}><CheckCircle2 size={14}/>{p}</span>)}</span><span className="portal-explore">Explore {portal === "campus" ? "Campus" : "Business"} <ArrowRight size={16}/></span></button>;
}
function HomePage() {
  const navigate = useNavigate();
  return <><Header/><main className="public-main">
    <section className="home-hero"><div className="hero-copy"><span className="eyebrow-pill"><span/> TWO PURPOSES. ONE CONNECTED PLATFORM.</span><h1>Make room for<br/><em>what moves you.</em></h1><p className="hero-lede">Whether you run a college or grow a business, MONK brings your people, processes and progress into one clear workspace.</p><div className="hero-actions"><button className="button-dark" onClick={() => navigate("/campus")}>Explore MONK <ArrowRight size={17}/></button><a href="#choose-path">Choose your workspace <ChevronRight size={16}/></a></div><div className="hero-trust"><span><ShieldCheck size={15}/> Private by design</span><span><Layers3 size={15}/> Built around your work</span></div></div>
      <div className="hero-art" aria-label="Animated MONK product preview"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-glow"/><div className="hero-m"><MonkMark large/></div><div className="float-chip chip-campus"><GraduationCap size={17}/><span><b>Campus</b><small>People · Learning</small></span></div><div className="float-chip chip-business"><Store size={17}/><span><b>Business</b><small>Customers · Growth</small></span></div><div className="float-chip chip-secure"><ShieldCheck size={15}/> Secure workspaces</div><div className="hero-spark spark-a">✳</div><div className="hero-spark spark-b">✳</div></div>
    </section>
    <section className="choose-section" id="choose-path"><Reveal><div className="section-intro"><span className="section-kicker">START WITH YOUR PURPOSE</span><h2>One first choice.<br/><em>Your own MONK experience.</em></h2><p>No account needed to explore. Choose the space that matches what you want to do.</p></div></Reveal><div className="portal-grid"><Reveal><PortalCard portal="campus" title="MONK Campus" desc="A connected digital space for colleges, polytechnics, students and faculty." points={["Institution directory & demos","Academic and campus workflows","Role-based college workspace"]} onClick={() => navigate("/campus")}/></Reveal><Reveal><PortalCard portal="business" title="MONK Business" desc="A practical operating space for local shops, service teams and growing startups." points={["Customer & sales management","Inventory, orders and invoices","Team and workflow management"]} onClick={() => navigate("/business")}/></Reveal></div></section>
    <section className="manifesto" id="about"><Reveal><div className="manifesto-mark"><MonkMark large/></div><div><span className="section-kicker">THE MONK IDEA</span><h2>Less scattered work.<br/><em>More meaningful progress.</em></h2><p>MONK is designed as two focused experiences sharing one dependable foundation. Your college sees academic operations. Your business sees customers and execution. Each workspace stays relevant to its purpose.</p></div></Reveal></section>
    <section className="how-section" id="how-it-works"><Reveal><span className="section-kicker">A SIMPLE START</span><h2>From first visit to<br/><em>your own workspace.</em></h2></Reveal><div className="steps-grid">{[{n:"01",title:"Choose your path",desc:"Select Campus or Business. Browse public pages and sample workflows first."},{n:"02",title:"Explore the demo",desc:"See how the product fits a college or a local business before creating an account."},{n:"03",title:"Create your workspace",desc:"Sign in, choose your organization type and invite the right people."}].map(s=><Reveal key={s.n}><article className="step-card"><span>{s.n}</span><h3>{s.title}</h3><p>{s.desc}</p></article></Reveal>)}</div></section>
    <section className="closing-cta"><Reveal><span className="section-kicker">YOUR WORK. YOUR WAY.</span><h2>Start with the work<br/>you want to improve.</h2><div><button className="button-dark" onClick={() => navigate("/campus")}>Explore Campus <ArrowUpRight size={16}/></button><button className="button-light" onClick={() => navigate("/business")}>Explore Business <ArrowUpRight size={16}/></button></div></Reveal></section>
  </main><Footer/></>;
}
function DirectoryDemo() {
  const [type, setType] = useState<"government" | "private">("government");
  const [query, setQuery] = useState("");
  const items = type === "government" ? governmentColleges : privateColleges;
  const filtered = useMemo(() => items.filter(c => (c.name + c.city + c.branches).toLowerCase().includes(query.toLowerCase())), [items, query]);
  return <section className="directory-demo" id="college-directory"><div className="directory-head"><div><span className="section-kicker">BIHAR POLYTECHNIC EXPLORER</span><h2>Find your college.<br/><em>Know your options.</em></h2><p>Preview of the college discovery experience. Official affiliation and course details should be verified against SBTE Bihar.</p></div><div className="directory-count"><strong>46</strong><span>Government<br/>polytechnic institutes</span></div></div>
    <div className="directory-toolbar"><div className="directory-tabs"><button className={type === "government" ? "selected" : ""} onClick={() => setType("government")}>Government</button><button className={type === "private" ? "selected" : ""} onClick={() => setType("private")}>Private</button></div><label className="directory-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search college or city"/></label></div>
    <div className="college-grid">{filtered.map((college: any, i) => <article className="college-card" key={college.code ?? college.name} style={{animationDelay:`${i * 70}ms`}}><div className="college-card-top"><span>{college.tag}</span><span>{college.code ? `SBTE · ${college.code}` : "Directory preview"}</span></div><h3>{college.name}</h3><p><MapPin size={13}/>{college.city}</p><small>{college.branches}</small></article>)}</div>
    {!filtered.length && <p className="no-results">No matching demo entry. Try another college or city.</p>}
    <div className="directory-foot"><span>Sample preview · Not a complete live admission directory</span><a href={type === "government" ? "https://sbte.bihar.gov.in/government-institute" : "https://sbte.bihar.gov.in/private-institutes"} target="_blank" rel="noreferrer">Open official SBTE directory <ArrowUpRight size={15}/></a></div>
  </section>;
}
function FeatureGrid({ items }: { items: Array<{ icon: LucideIcon; title: string; desc: string }> }) {
  return <div className="feature-grid">{items.map((item, i) => <Reveal key={item.title}><article className="feature-card" style={{transitionDelay:`${i * 45}ms`}}><span><item.icon size={19}/></span><h3>{item.title}</h3><p>{item.desc}</p></article></Reveal>)}</div>;
}
function CampusPage() {
  const navigate = useNavigate();
  return <><Header active="campus"/><main className="portal-page campus-page"><section className="portal-hero"><div className="portal-hero-copy"><span className="eyebrow-pill"><GraduationCap size={14}/> MONK CAMPUS</span><h1>One campus.<br/><em>Every connection.</em></h1><p>Bring students, faculty, departments and college operations into one organized digital space—built for institutions and the people who make them work.</p><div className="hero-actions"><button className="button-dark" onClick={() => navigate("/login?vertical=education&mode=signup")}>Create a college workspace <ArrowRight size={17}/></button><a href="#college-directory">Explore colleges <ChevronRight size={16}/></a></div><div className="demo-label"><span className="demo-pulse"/> Public preview · No login required</div></div><div className="campus-preview"><div className="preview-top"><span><MonkMark/> CAMPUS OVERVIEW</span><span className="preview-status">DEMO</span></div><div className="preview-welcome">Good morning, <b>Campus team</b><small>Your institution at a glance</small></div><div className="preview-metrics"><div><strong>2,480</strong><small>Students</small></div><div><strong>86</strong><small>Faculty</small></div><div><strong>94%</strong><small>Attendance</small></div></div><div className="preview-schedule"><span>UPCOMING</span><div><b>Mechanical Engineering · 3rd Sem</b><small>Workshop practice · 10:30 AM</small></div><CalendarDays size={18}/></div><div className="preview-notice"><span><BookOpen size={15}/> Academic notice</span><b>Internal assessment schedule published</b></div><small className="preview-disclaimer">Illustrative demo data — not a live college record</small></div></section>
    <section className="portal-benefits"><div className="section-intro"><span className="section-kicker">BUILT FOR INSTITUTIONS</span><h2>Campus life, connected<br/><em>from one place.</em></h2><p>Keep everyday academic work structured, visible and permission-aware.</p></div><FeatureGrid items={campusFeatures}/></section>
    <DirectoryDemo/>
    <section className="roles-section"><span className="section-kicker">ONE INSTITUTION. CLEAR RESPONSIBILITIES.</span><h2>Every role gets<br/><em>the right view.</em></h2><div className="role-chips">{["Principal / Admin","HOD","Faculty","Student","Office staff","Parent / Guardian"].map(role=><span key={role}><CheckCircle2 size={15}/>{role}</span>)}</div><p>Role access is configured by the institution. A role name in this preview does not grant access to real student records.</p></section>
    <section className="portal-bottom-cta"><div><span className="section-kicker">FOR YOUR INSTITUTION</span><h2>Give your campus<br/>one clear workspace.</h2><p>Start with a secure institution account, then invite the people who need access.</p></div><button className="button-dark" onClick={() => navigate("/login?vertical=education&mode=signup")}>Set up MONK Campus <ArrowUpRight size={17}/></button></section>
  </main><Footer/></>;
}

type NearbyPlace = {
  providerPlaceId: string;
  name: string;
  address: string | null;
  category: string | null;
  businessStatus: string | null;
  distanceMeters: number | null;
  mapsUrl: string | null;
};

function LocalBusinessFinder() {
  const [category, setCategory] = useState("all");
  const [radius, setRadius] = useState("5000");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function requestNearby(latitude: number, longitude: number) {
    setLoading(true); setError(""); setSearched(true);
    try {
      const response = await fetch("/api/businesses/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude, radiusMeters: Number(radius), placeType: category })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Nearby search is unavailable.");
      setPlaces(payload.results ?? []);
    } catch (reason) {
      setPlaces([]);
      setError(reason instanceof Error ? reason.message : "Nearby search is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  function useMyLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("Location is not supported by this browser. Search by locality or PIN code instead.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        const nextLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setLocation(nextLocation);
        void requestNearby(nextLocation.latitude, nextLocation.longitude);
      },
      positionError => {
        setLoading(false);
        setError(positionError.code === positionError.PERMISSION_DENIED
          ? "Location permission was denied. Search by locality, city or PIN code instead."
          : "Your location could not be determined. Search by locality, city or PIN code instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
    );
  }

  async function searchByText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const searchText = query.trim();
    if (searchText.length < 2) { setError("Enter a business category, locality, city or PIN code."); return; }
    setLoading(true); setError(""); setSearched(true);
    try {
      const response = await fetch("/api/businesses/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchText,
          ...(location ? { latitude: location.latitude, longitude: location.longitude, radiusMeters: Number(radius) } : {})
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Business search is unavailable.");
      setPlaces(payload.results ?? []);
    } catch (reason) {
      setPlaces([]);
      setError(reason instanceof Error ? reason.message : "Business search is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return <section className="local-finder" id="nearby-businesses">
    <div className="local-finder-head">
      <span className="section-kicker">DISCOVER YOUR AREA</span>
      <h2>Find businesses<br/><em>around your location.</em></h2>
      <p>Use your location only when you request nearby results, or search manually by business, locality, city or PIN code.</p>
    </div>
    <div className="local-finder-controls">
      <div className="local-finder-filters">
        <label>Business category<select value={category} onChange={event => setCategory(event.target.value)}>
          <option value="all">All categories</option><option value="restaurant">Restaurants</option><option value="cafe">Cafés</option><option value="hospital">Hospitals</option><option value="pharmacy">Pharmacies</option><option value="bank">Banks</option><option value="atm">ATMs</option><option value="school">Schools</option><option value="university">Universities</option><option value="car_repair">Vehicle repair</option><option value="gas_station">Fuel stations</option><option value="grocery_store">Grocery stores</option><option value="supermarket">Supermarkets</option><option value="hardware_store">Hardware stores</option><option value="store">Shops</option>
        </select></label>
        <label>Search radius<select value={radius} onChange={event => setRadius(event.target.value)}><option value="1000">1 km</option><option value="3000">3 km</option><option value="5000">5 km</option><option value="10000">10 km</option><option value="25000">25 km</option></select></label>
        <button type="button" className="button-dark" onClick={useMyLocation} disabled={loading}><MapPin size={16}/>{loading ? "Searching…" : "Use my location"}</button>
      </div>
      <form className="local-manual-search" onSubmit={searchByText}>
        <label className="directory-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="e.g. pharmacy in Muzaffarpur or 842001"/></label>
        <button className="button-light" type="submit" disabled={loading}>Search area <ArrowRight size={15}/></button>
      </form>
    </div>
    {error && <p className="local-finder-message" role="alert">{error}</p>}
    {loading && <p className="local-finder-message" aria-live="polite">Finding current business listings…</p>}
    {!loading && searched && !error && places.length === 0 && <p className="local-finder-message">No matching places were returned for this search. Try a wider radius or another category.</p>}
    {places.length > 0 && <div className="nearby-place-grid">{places.map(place => <article className="nearby-place" key={place.providerPlaceId}>
      <div><span className="nearby-place-category">{(place.category ?? "local business").replace(/_/g, " ")}</span><h3>{place.name}</h3><p><MapPin size={13}/>{place.address ?? "Address unavailable"}</p></div>
      <div className="nearby-place-bottom"><span>{place.distanceMeters !== null ? `${(place.distanceMeters / 1000).toFixed(1)} km away` : place.businessStatus ?? "Listed place"}</span>{place.mapsUrl && <a href={place.mapsUrl} target="_blank" rel="noreferrer">Open in Google Maps <ArrowUpRight size={13}/></a>}</div>
    </article>)}</div>}
    <div className="local-finder-foot"><span>Location is requested only after you select “Use my location”.</span><span>Place information provided by Google Maps.</span></div>
  </section>;
}

function BusinessPage() {
  const navigate = useNavigate();
  return <><Header active="business"/><main className="portal-page business-page"><section className="portal-hero"><div className="portal-hero-copy"><span className="eyebrow-pill"><Store size={14}/> MONK BUSINESS</span><h1>Run your business.<br/><em>Not the busywork.</em></h1><p>From a neighbourhood shop to a growing startup, connect customers, products, orders and people in one simple operating workspace.</p><div className="hero-actions"><button className="button-dark" onClick={() => navigate("/login?vertical=business&mode=signup")}>Create a business workspace <ArrowRight size={17}/></button><a href="#business-demo">See local business demo <ChevronRight size={16}/></a></div><div className="demo-label"><span className="demo-pulse"/> Sample workspace · No login required</div></div>
    <div className="business-preview"><div className="preview-top"><span><MonkMark/> BUSINESS OVERVIEW</span><span className="preview-status">DEMO</span></div><div className="business-name"><span className="store-avatar"><Store size={21}/></span><span><b>Muzaffarpur Cycle & Auto Works</b><small>Local repair & retail · Sample business</small></span></div><div className="business-metrics"><div><small>Today's sales</small><strong>₹8,450</strong><span>Illustrative</span></div><div><small>Open orders</small><strong>12</strong><span>Sample records</span></div></div><div className="business-activity"><span>RECENT ACTIVITY</span><div><i className="activity-dot pink-dot"/><span><b>New service booking</b><small>Brake service · 10:42 AM</small></span><strong>New</strong></div><div><i className="activity-dot yellow-dot"/><span><b>Stock updated</b><small>Cycle tubes · 11:15 AM</small></span><strong>Done</strong></div></div><small className="preview-disclaimer">Fictional local demo — no real business or transaction data</small></div></section>
    <section className="portal-benefits"><div className="section-intro"><span className="section-kicker">MADE FOR EVERYDAY OPERATIONS</span><h2>From first enquiry<br/><em>to finished work.</em></h2><p>Simple tools for the real jobs that keep a business moving.</p></div><FeatureGrid items={businessFeatures}/></section><LocalBusinessFinder/>
    <section className="business-demo-section" id="business-demo"><div><span className="section-kicker">A LOCAL BUSINESS, AS A DEMO</span><h2>See how a neighbourhood<br/><em>business could run on MONK.</em></h2><p>This sample is set in Muzaffarpur to make the workflow relatable. It is a fictional example, not a claim that a local shop has joined MONK.</p><div className="demo-checks"><span><CheckCircle2 size={15}/> Customer enquiry to follow-up</span><span><CheckCircle2 size={15}/> Product and service inventory</span><span><CheckCircle2 size={15}/> Booking, invoice and payment status</span></div></div><div className="workflow-card"><div className="workflow-title"><span>ONE CUSTOMER JOURNEY</span><span className="workflow-live">SAMPLE FLOW</span></div>{[{n:"01",t:"Customer enquiry",d:"A customer asks for a cycle repair."},{n:"02",t:"Create service order",d:"Assign mechanic and promised delivery."},{n:"03",t:"Track parts & progress",d:"Record spare parts and work status."},{n:"04",t:"Invoice & close",d:"Issue bill and mark payment received."}].map((step,i)=><div className="workflow-step" key={step.n}><span>{step.n}</span><div><b>{step.t}</b><small>{step.d}</small></div>{i===3?<CheckCircle2 size={17}/>:<ChevronRight size={17}/>}</div>)}</div></section>
    <section className="roles-section"><span className="section-kicker">FROM SOLO OWNER TO TEAM</span><h2>One workspace for<br/><em>the people behind it.</em></h2><div className="role-chips">{["Owner / Admin","Manager","Sales","Accounts","Operations","Staff"].map(role=><span key={role}><CheckCircle2 size={15}/>{role}</span>)}</div><p>Business permissions are assigned by the workspace owner. Demo figures are illustrative only.</p></section>
    <section className="portal-bottom-cta"><div><span className="section-kicker">READY WHEN YOU ARE</span><h2>Make the next workday<br/>a little more organized.</h2><p>Set up your business workspace and invite your team when you are ready.</p></div><button className="button-dark" onClick={() => navigate("/login?vertical=business&mode=signup")}>Set up MONK Business <ArrowUpRight size={17}/></button></section>
  </main><Footer/></>;
}
export default function PublicSite() {
  const location = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [location.pathname]);
  if (location.pathname === "/campus") return <CampusPage/>;
  if (location.pathname === "/business") return <BusinessPage/>;
  return <HomePage/>;
}
