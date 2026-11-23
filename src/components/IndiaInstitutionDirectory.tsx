import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, MapPin, Search, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  INDIA_DIRECTORY_DEFAULTS,
  INDIA_STATES_AND_UTS,
  INSTITUTION_CATEGORIES,
  INSTITUTION_OWNERSHIP,
  REGULATORY_SOURCES
} from "../data/india-directory";

type Institution = {
  id: string;
  canonical_name: string;
  institution_kind: string;
  category_key: string;
  ownership_key: string;
  state_code: string | null;
  district: string | null;
  city: string | null;
  locality: string | null;
  postal_code: string | null;
  address: string | null;
  website_url: string | null;
  aishe_code: string | null;
  verification_state: "verified" | "partially_verified" | "unverified" | "stale" | "disputed" | "closed";
  verified_fields: string[];
  last_verified_at: string | null;
};

type CategoryOption = { category_key: string; label: string };
type RegionOption = { code: string; name: string; region_kind: string };

const PAGE_SIZE = INDIA_DIRECTORY_DEFAULTS.defaultPageSize;

function safeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && !parsed.username && !parsed.password ? parsed.href : null;
  } catch {
    return null;
  }
}

function labelFor(value: string | null | undefined): string {
  if (!value) return "Not listed";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function verificationLabel(state: Institution["verification_state"]): string {
  const labels: Record<Institution["verification_state"], string> = {
    verified: "Verified",
    partially_verified: "Partially verified",
    unverified: "Not yet verified",
    stale: "Review due",
    disputed: "Under review",
    closed: "Reported closed"
  };
  return labels[state] ?? "Status unavailable";
}

export default function IndiaInstitutionDirectory() {
  const requestSequence = useRef(0);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [ownership, setOwnership] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Institution[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<CategoryOption[]>(
    INSTITUTION_CATEGORIES.map((item) => ({ category_key: item.id, label: item.label }))
  );
  const [regions, setRegions] = useState<RegionOption[]>(
    INDIA_STATES_AND_UTS.map((item) => ({ code: item.code, name: item.name, region_kind: item.kind }))
  );
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [categoryResult, regionResult] = await Promise.all([
        supabase.from("monk_directory_categories")
          .select("category_key,label")
          .eq("active", true)
          .order("label", { ascending: true }),
        supabase.from("monk_directory_regions")
          .select("code,name,region_kind")
          .eq("country_code", "IN")
          .order("name", { ascending: true })
      ]);
      if (!alive) return;
      if (!categoryResult.error && categoryResult.data?.length) {
        setCategories(categoryResult.data as CategoryOption[]);
      }
      if (!regionResult.error && regionResult.data?.length) {
        setRegions(regionResult.data as RegionOption[]);
      }
    })();
    return () => { alive = false; };
  }, []);

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setBusy(true);
    setError("");
    try {
      let request = supabase.from("monk_directory_institutions")
        .select(
          "id,canonical_name,institution_kind,category_key,ownership_key,state_code,district,city,locality,postal_code,address,website_url,aishe_code,verification_state,verified_fields,last_verified_at",
          { count: "exact" }
        )
        .eq("published", true);

      if (category) request = request.eq("category_key", category);
      if (stateCode) request = request.eq("state_code", stateCode);
      if (ownership) request = request.eq("ownership_key", ownership);

      const normalizedQuery = query.normalize("NFKC")
        .replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);

      if (normalizedQuery.length >= 2) {
        const pattern = `%${normalizedQuery}%`;
        request = request.or(
          `canonical_name.ilike.${pattern},city.ilike.${pattern},district.ilike.${pattern},aishe_code.ilike.${pattern}`
        );
      }

      const from = page * PAGE_SIZE;
      const { data, error: queryError, count } = await request
        .order("canonical_name", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (queryError) throw queryError;
      if (sequence !== requestSequence.current) return;
      setRows((data ?? []) as Institution[]);
      setTotal(count ?? 0);
    } catch (cause) {
      if (sequence === requestSequence.current) {
        setRows([]);
        setTotal(0);
        setError(cause instanceof Error ? cause.message : "The institution directory could not be loaded.");
      }
    } finally {
      if (sequence === requestSequence.current) setBusy(false);
    }
  }, [category, stateCode, ownership, query, page]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { requestSequence.current += 1; }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentCategory = useMemo(
    () => INSTITUTION_CATEGORIES.find((item) => item.id === category),
    [category]
  );
  const sourceLinks = useMemo(() => {
    if (!currentCategory) return REGULATORY_SOURCES.slice(0, 6);
    return REGULATORY_SOURCES.filter((source) =>
      source.domains.some((domain) => currentCategory.domains.includes(domain))
    ).slice(0, 5);
  }, [currentCategory]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(0);
    setQuery(queryInput.trim());
  }

  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(0);
  }

  return (
    <section className="directory-demo national-directory" id="college-directory">
      <div className="directory-head">
        <div>
          <span className="section-kicker">INDIA-WIDE INSTITUTION DIRECTORY</span>
          <h2>Explore institutions.<br /><em>Across every state.</em></h2>
          <p>Search universities, engineering, medical, law, commerce, polytechnic, vocational and other institutions using published records and source-aware verification status.</p>
        </div>
        <div className="directory-count">
          <strong>{total.toLocaleString("en-IN")}</strong>
          <span>published<br />listings</span>
        </div>
      </div>

      <form className="national-directory-filters" onSubmit={submitSearch}>
        <label className="directory-search">
          <Search size={16} />
          <input
            type="search"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Institution, city, district or AISHE code"
            maxLength={80}
            aria-label="Search institutions"
          />
        </label>
        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => changeFilter(setCategory, event.target.value)}>
            <option value="">All categories</option>
            {categories.map((item) => <option key={item.category_key} value={item.category_key}>{item.label}</option>)}
          </select>
        </label>
        <label>
          <span>State / Union Territory</span>
          <select value={stateCode} onChange={(event) => changeFilter(setStateCode, event.target.value)}>
            <option value="">All India</option>
            {regions.map((region) => <option key={region.code} value={region.code}>{region.name}</option>)}
          </select>
        </label>
        <label>
          <span>Ownership</span>
          <select value={ownership} onChange={(event) => changeFilter(setOwnership, event.target.value)}>
            <option value="">All ownership types</option>
            {INSTITUTION_OWNERSHIP.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <button className="button-dark" type="submit"><Search size={15} /> Search directory</button>
      </form>

      <div className="national-directory-summary" aria-live="polite">
        <span>{busy ? "Loading published listings…" : `${total.toLocaleString("en-IN")} published institution record${total === 1 ? "" : "s"}`}</span>
        {category && <button type="button" onClick={() => changeFilter(setCategory, "")}>Clear category</button>}
        {stateCode && <button type="button" onClick={() => changeFilter(setStateCode, "")}>Clear location</button>}
        {ownership && <button type="button" onClick={() => changeFilter(setOwnership, "")}>Clear ownership</button>}
        {query && <button type="button" onClick={() => { setQuery(""); setQueryInput(""); setPage(0); }}>Clear search</button>}
      </div>

      {error && <div className="national-directory-error" role="alert">{error}</div>}

      {!error && rows.length > 0 && (
        <div className="college-grid">
          {rows.map((institution) => {
            const regionName = regions.find((region) => region.code === institution.state_code)?.name ?? institution.state_code;
            const place = [institution.locality, institution.city, institution.district, regionName, institution.postal_code]
              .filter(Boolean).join(", ");
            const website = safeHttpUrl(institution.website_url);
            const categoryName = categories.find((item) => item.category_key === institution.category_key)?.label
              ?? labelFor(institution.category_key);
            return (
              <article className="college-card national-institution-card" key={institution.id}>
                <div className="college-card-top">
                  <span>{categoryName}</span>
                  <span>{labelFor(institution.ownership_key)}</span>
                </div>
                <h3>{institution.canonical_name}</h3>
                <p><MapPin size={13} />{place || "Location not listed"}</p>
                <div className={`institution-verification ${institution.verification_state}`}>
                  <ShieldCheck size={13} />
                  <span>{verificationLabel(institution.verification_state)}</span>
                </div>
                {institution.verified_fields?.length > 0 && (
                  <small>Verified fields: {institution.verified_fields.map(labelFor).join(", ")}</small>
                )}
                {institution.aishe_code && <small>AISHE ID: {institution.aishe_code}</small>}
                {institution.last_verified_at && (
                  <small>Last reviewed: {new Date(institution.last_verified_at).toLocaleDateString("en-IN")}</small>
                )}
                {website && <a className="institution-website" href={website} target="_blank" rel="noreferrer">Official website <ArrowUpRight size={13} /></a>}
              </article>
            );
          })}
        </div>
      )}

      {!busy && !error && rows.length === 0 && (
        <div className="national-directory-empty" role="status">
          <ShieldCheck size={24} />
          <h3>{total === 0 && !query && !category && !stateCode && !ownership ? "Published listings are being prepared" : "No matching institutions found"}</h3>
          <p>
            {total === 0 && !query && !category && !stateCode && !ownership
              ? "Institution records will appear here after the source permissions, record identity and relevant verification fields have been reviewed. No institution or approval records are fabricated."
              : "Try a broader institution name, another category or a different location. Only published records are included in search."}
          </p>
        </div>
      )}

      {!busy && total > PAGE_SIZE && (
        <nav className="national-directory-pagination" aria-label="Directory pages">
          <button type="button" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}><ChevronLeft size={15} /> Previous</button>
          <span>Page {page + 1} of {totalPages}</span>
          <button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}>Next <ChevronRight size={15} /></button>
        </nav>
      )}

      <div className="directory-foot">
        <span>Only published institution records are displayed. Listing presence does not automatically confirm every course or annual intake.</span>
        <a href="https://www.education.gov.in/" target="_blank" rel="noreferrer">Official education portals <ArrowUpRight size={14} /></a>
      </div>
      <div className="national-directory-sources" aria-label="Official regulator reference portals">
        {sourceLinks.map((source) => (
          <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.name} <ArrowUpRight size={12} /></a>
        ))}
      </div>
    </section>
  );
}
