import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Building2, ExternalLink, MapPin, Search, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import "./institution-directory.css";

type Region = { code: string; name: string; region_kind: string };
type Category = { category_key: string; label: string };
type Institution = {
  id: string;
  canonical_name: string;
  city: string | null;
  district: string | null;
  state_code: string | null;
  institution_kind: string;
  category_key: string;
  ownership_key: string;
  aishe_code: string | null;
  website_url: string | null;
  verification_state: string;
};

const PAGE_SIZE = 24;
const categoryLabels: Record<string, string> = {
  university: "University", engineering: "Engineering", medical: "Medical",
  dental: "Dental", law: "Law", pharmacy: "Pharmacy", nursing: "Nursing",
  polytechnic: "Polytechnic", education: "Teacher education", agriculture: "Agriculture",
  commerce: "Commerce", arts_science: "Arts & science", management: "Management",
  architecture: "Architecture", ayush: "AYUSH", vocational: "Vocational",
  allied_health: "Allied health", rehabilitation: "Rehabilitation", research: "Research",
  iti: "ITI", design: "Design", veterinary: "Veterinary", other: "Other"
};
const kindLabels: Record<string, string> = {
  university: "University", college: "College", standalone_institute: "Standalone institute",
  academy: "Academy", coaching_centre: "Coaching centre", vocational_centre: "Vocational centre",
  research_centre: "Research centre"
};
const ownershipLabels: Record<string, string> = {
  central_government: "Central government", state_government: "State government",
  local_body: "Local body", government_aided: "Government aided", private: "Private",
  deemed: "Deemed", autonomous: "Autonomous", trust_society: "Trust / society", other: "Other"
};

export default function InstitutionDirectory() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rows, setRows] = useState<Institution[]>([]);
  const [query, setQuery] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    void Promise.all([
      supabase.from("monk_directory_regions").select("code,name,region_kind").order("name"),
      supabase.from("monk_directory_categories").select("category_key,label").eq("active", true).order("label")
    ]).then(([regionResult, categoryResult]) => {
      if (!alive) return;
      setRegions((regionResult.data ?? []) as Region[]);
      setCategories((categoryResult.data ?? []) as Category[]);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      let request = supabase
        .from("monk_directory_institutions")
        .select("id,canonical_name,city,district,state_code,institution_kind,category_key,ownership_key,aishe_code,website_url,verification_state", { count: "exact" })
        .eq("published", true)
        .order("canonical_name", { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (stateCode) request = request.eq("state_code", stateCode);
      if (category) request = request.eq("category_key", category);
      const cleaned = query.trim().replace(/[%_]/g, "").slice(0, 80);
      if (cleaned.length >= 2) {
        const safe = cleaned.replace(/[(),]/g, " ").replace(/\s+/g, " ").trim();
        if (safe) request = request.or("canonical_name.ilike.%"+safe+"%,city.ilike.%"+safe+"%,district.ilike.%"+safe+"%");
      }
      const result = await request;
      if (!alive) return;
      if (result.error) {
        setError("The institution directory is temporarily unavailable. Please try again.");
        setRows([]);
        setTotal(0);
      } else {
        setRows((result.data ?? []) as Institution[]);
        setTotal(result.count ?? 0);
      }
      setLoading(false);
    }, 220);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [query, stateCode, category, page]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const regionNames = useMemo(() => new Map(regions.map(region => [region.code, region.name])), [regions]);

  return <section className="institution-directory" id="college-directory">
    <div className="institution-directory-head">
      <div><span className="section-kicker">INDIA-WIDE INSTITUTION DIRECTORY</span><h2>Find the right<br/><em>institution.</em></h2><p>Search universities, colleges and specialist institutions across Indian states and union territories.</p></div>
      <div className="institution-directory-stat"><Building2 size={20}/><strong>{total.toLocaleString("en-IN")}</strong><span>published listings</span></div>
    </div>
    <div className="institution-directory-filters">
      <label className="institution-directory-search"><Search size={17}/><input value={query} onChange={event => {setQuery(event.target.value);setPage(0);}} placeholder="Search institution, city or district" aria-label="Search institutions"/></label>
      <select value={stateCode} onChange={event => {setStateCode(event.target.value);setPage(0);}} aria-label="Filter by state"><option value="">All states & UTs</option>{regions.map(region=><option key={region.code} value={region.code}>{region.name}</option>)}</select>
      <select value={category} onChange={event => {setCategory(event.target.value);setPage(0);}} aria-label="Filter by category"><option value="">All institution categories</option>{categories.map(item=><option key={item.category_key} value={item.category_key}>{item.label}</option>)}</select>
    </div>
    {error && <p className="institution-directory-error" role="alert">{error}</p>}
    {loading ? <div className="institution-directory-empty"><span className="directory-spinner"/>Loading verified directory records…</div>
      : rows.length ? <>
        <div className="institution-directory-grid">{rows.map(institution => {
          const verification = institution.verification_state === "verified"
            ? {label:"Verified",kind:"verified"}
            : institution.verification_state === "partially_verified"
              ? {label:"Official listing",kind:"listed"}
              : {label:"Review required",kind:"review"};
          return <article className="institution-directory-card" key={institution.id}>
            <div className="institution-directory-card-top"><span className="institution-directory-kind">{kindLabels[institution.institution_kind] ?? "Institution"}</span><span className={"institution-verification "+verification.kind}><ShieldCheck size={13}/>{verification.label}</span></div>
            <h3>{institution.canonical_name}</h3>
            <p className="institution-location"><MapPin size={14}/>{[institution.city,institution.district,regionNames.get(institution.state_code ?? "")].filter(Boolean).join(", ") || "India"}</p>
            <div className="institution-directory-tags"><span>{categoryLabels[institution.category_key] ?? institution.category_key}</span><span>{ownershipLabels[institution.ownership_key] ?? "Institution"}</span></div>
            {institution.aishe_code && <small className="institution-aishe">AISHE ID: {institution.aishe_code}</small>}
            {institution.website_url && <a className="institution-website" href={institution.website_url.startsWith("http") ? institution.website_url : "https://"+institution.website_url} target="_blank" rel="noreferrer">Official website <ExternalLink size={13}/></a>}
          </article>;
        })}</div>
        <div className="institution-directory-pagination"><span>Showing {page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,total)} of {total.toLocaleString("en-IN")}</span><div><button type="button" disabled={page===0} onClick={()=>setPage(value=>Math.max(0,value-1))}>Previous</button><button type="button" disabled={page+1>=pageCount} onClick={()=>setPage(value=>Math.min(pageCount-1,value+1))}>Next</button></div></div>
      </> : <div className="institution-directory-empty"><Building2 size={25}/><strong>{total === 0 ? "Official directory records are being prepared" : "No matching institutions"}</strong><span>{total === 0 ? "MONK is connecting regulator and government datasets. Listings will appear only after source and reuse checks." : "Try another institution name, state or category."}</span></div>}
    <p className="institution-directory-note"><ShieldCheck size={14}/> An official institution listing does not automatically mean every course is approved. Course recognition and intake are checked separately by regulator and academic year.</p>
    <div className="institution-directory-source-link"><a href="https://dashboard.aishe.gov.in/hedirectory/#/institutionDirectory" target="_blank" rel="noreferrer">Check the official AISHE directory <ArrowUpRight size={14}/></a></div>
  </section>;
}
