import { FormEvent, useCallback, useEffect, useState } from "react";
import { Building2, RefreshCw, Save } from "lucide-react";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string; name: string; domain: string | null; industry: string | null;
  size_band: string | null; address: string | null; phone: string | null; website: string | null;
};

export default function BusinessProfile({ organizationId }: { organizationId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [sizeBand, setSizeBand] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!supabase || !organizationId) return;
    setBusy(true); setError("");
    const { data, error: queryError } = await supabase.from("companies")
      .select("id,name,domain,industry,size_band,address,phone,website,custom")
      .eq("organization_id", organizationId)
      .contains("custom", { monk_workspace_profile: "true" })
      .is("deleted_at", null).maybeSingle();
    if (queryError) setError(queryError.message);
    else if (data) {
      const row = data as Profile;
      setProfile(row); setName(row.name); setDomain(row.domain ?? "");
      setIndustry(row.industry ?? ""); setSizeBand(row.size_band ?? "");
      setAddress(row.address ?? ""); setPhone(row.phone ?? ""); setWebsite(row.website ?? "");
    }
    setBusy(false);
  }, [organizationId]);

  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(""); setNotice("");
    const { data, error: saveError } = await supabase.rpc("upsert_business_workspace_profile", {
      p_name: name.trim(), p_domain: domain.trim() || null,
      p_industry: industry.trim() || null, p_size_band: sizeBand || null,
      p_address: address.trim() || null, p_phone: phone.trim() || null,
      p_website: website.trim() || null
    });
    if (saveError) setError(saveError.message);
    else {
      setProfile(data as Profile);
      setNotice("Business profile saved securely.");
      await load();
    }
    setBusy(false);
  }

  return <section className="education-page">
    <header className="education-heading">
      <div><p className="eyebrow">MONK BUSINESS</p><h2>Company profile</h2>
        <p className="muted">Manage the official identity and contact details for this workspace.</p></div>
      <button className="education-refresh" type="button" onClick={() => void load()} disabled={busy}><RefreshCw size={14}/> Refresh</button>
    </header>
    {error && <div className="education-alert error" role="alert">{error}</div>}
    {notice && <div className="education-alert" role="status">{notice}</div>}
    <div className="education-grid">
      <form className="education-card education-form" onSubmit={save}>
        <div className="education-card-heading"><Building2 size={17}/><div><b>Business identity</b><small>Workspace-owned company profile</small></div></div>
        <label>Registered / trading name<input required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)} placeholder="Company or business name"/></label>
        <div className="education-two">
          <label>Industry<input maxLength={120} value={industry} onChange={e=>setIndustry(e.target.value)} placeholder="e.g. Engineering"/></label>
          <label>Team size<select value={sizeBand} onChange={e=>setSizeBand(e.target.value)}><option value="">Select size</option>{["1-10","11-50","51-200","201-500","501-1000","1000+"].map(v=><option key={v} value={v}>{v} employees</option>)}</select></label>
        </div>
        <label>Company domain<input value={domain} onChange={e=>setDomain(e.target.value)} maxLength={253} placeholder="example.com"/></label>
        <label>Website<input type="url" value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://example.com"/></label>
        <label>Business address<textarea rows={3} maxLength={500} value={address} onChange={e=>setAddress(e.target.value)} placeholder="Registered or primary office address"/></label>
        <label>Business phone<input type="tel" maxLength={30} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91…"/></label>
        <button className="primary" disabled={busy}><Save size={15}/>{busy ? "Saving…" : profile ? "Update company profile" : "Save company profile"}</button>
      </form>
      <aside className="education-card education-guidance">
        <h3>Profile checklist</h3>
        <p><span className={name.trim().length >= 2 ? "done" : ""}>{name.trim().length >= 2 ? "✓" : "1"}</span> Add registered or trading name</p>
        <p><span className={industry.trim() ? "done" : ""}>{industry.trim() ? "✓" : "2"}</span> Set business industry</p>
        <p><span className={website.trim() ? "done" : ""}>{website.trim() ? "✓" : "3"}</span> Add official website</p>
        <p><span className={address.trim() ? "done" : ""}>{address.trim() ? "✓" : "4"}</span> Add office address</p>
        <p className="muted">This profile is separate from customer CRM records. Access is enforced by the organization profile permission.</p>
      </aside>
    </div>
  </section>;
}
