import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Building2, Copy, LogOut, MailPlus, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { supabase } from "../lib/supabase";

type Organization = { id: string; name: string; slug: string; vertical: "education" | "business"; industry: string; role: string };
type Invitation = { id: string; email: string; role: string; expires_at: string; accepted_at: string | null; revoked_at: string | null };
type Props = { onSignOut: () => Promise<void> };

const roleLabels: Record<string,string> = { owner:"Owner",admin:"Administrator",manager:"Manager",sales:"Sales",contributor:"Contributor",auditor:"Auditor",client:"Client",vendor:"Vendor" };

export default function OrganizationConsole({ onSignOut }: Props) {
  const [organizations,setOrganizations] = useState<Organization[]>([]);
  const [activeId,setActiveId] = useState("");
  const [permissions,setPermissions] = useState<string[]>([]);
  const [invitations,setInvitations] = useState<Invitation[]>([]);
  const [name,setName] = useState("");
  const [vertical,setVertical] = useState<"education"|"business">("business");
  const [inviteEmail,setInviteEmail] = useState("");
  const [inviteRole,setInviteRole] = useState("contributor");
  const [inviteLink,setInviteLink] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");

  const active = organizations.find(o=>o.id===activeId) ?? organizations[0] ?? null;
  const canInvite = permissions.includes("organization.members.invite");
  const canManage = permissions.includes("organization.members.update");

  const load = useCallback(async () => {
    if(!supabase) return;
    setBusy(true); setError("");
    try {
      const {data:memberRows,error:memberError}=await supabase.from("organization_members")
        .select("organization_id,role,organizations(id,name,slug,vertical,industry)")
        .eq("status","active");
      if(memberError) throw memberError;
      const list:Organization[]=(memberRows??[]).flatMap((row:any)=>{
        const org=Array.isArray(row.organizations)?row.organizations[0]:row.organizations;
        return org?[{...org,vertical:org.vertical==="education"?"education":"business",role:row.role}]:[];
      });
      setOrganizations(list);
      const {data:current,error:currentError}=await supabase.rpc("current_organization_id");
      if(currentError) throw currentError;
      const selected=list.some(o=>o.id===current)?current:(list[0]?.id??"");
      setActiveId(selected);
      if(selected){
        const role=list.find(o=>o.id===selected)?.role;
        const {data:permRows,error:permError}=await supabase.from("role_permissions").select("permission_id").eq("role_id",role);
        if(permError) throw permError;
        setPermissions((permRows??[]).map((p:any)=>p.permission_id));
        if(role==="owner"||role==="admin"){
          const {data:invRows,error:invError}=await supabase.from("invitations").select("id,email,role,expires_at,accepted_at,revoked_at").eq("organization_id",selected).order("created_at",{ascending:false}).limit(30);
          if(invError) throw invError;
          setInvitations((invRows??[]) as Invitation[]);
        } else setInvitations([]);
      } else {setPermissions([]);setInvitations([]);}
    } catch(e) { setError(e instanceof Error?e.message:"Unable to load organization access."); }
    finally {setBusy(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  useEffect(()=>{
    if(!supabase) return;
    const token=new URLSearchParams(window.location.search).get("invite");
    if(!token) return;
    let cancelled=false;
    (async()=>{
      setBusy(true);setError("");setNotice("");
      const {error:acceptError}=await supabase.rpc("accept_organization_invitation",{invite_token:token});
      if(cancelled)return;
      if(acceptError)setError(acceptError.message);
      else {setNotice("Invitation accepted. Organization access is active.");window.history.replaceState({}, "", window.location.pathname);await load();}
      setBusy(false);
    })();
    return()=>{cancelled=true;};
  },[load]);

  async function switchOrg(id:string){
    if(!supabase||id===activeId)return;
    setBusy(true);setError("");setNotice("");
    const {error:e}=await supabase.rpc("switch_organization",{target_org:id});
    if(e)setError(e.message);else {setActiveId(id);setNotice("Organization switched.");await load();}
    setBusy(false);
  }

  async function createOrg(e:FormEvent){
    e.preventDefault();if(!supabase)return;
    const slug=name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48);
    if(slug.length<3){setError("Organization name must produce a URL slug of at least 3 characters.");return;}
    setBusy(true);setError("");setNotice("");
    const {error:e2}=await supabase.rpc("create_organization",{org_name:name.trim(),org_slug:slug,org_country:"IN",org_timezone:"Asia/Kolkata",org_currency:"INR",org_locale:"en-IN",org_industry:vertical==="education"?"Education":"Professional services",org_vertical:vertical});
    if(e2)setError(e2.message);else {setName("");setNotice("Organization created and selected.");await load();}
    setBusy(false);
  }

  async function createInvite(e:FormEvent){
    e.preventDefault();if(!supabase||!active)return;
    setBusy(true);setError("");setNotice("");setInviteLink("");
    const {data,error:e2}=await supabase.rpc("create_organization_invitation",{target_org:active.id,invite_email:inviteEmail.trim().toLowerCase(),invite_role:inviteRole,expires_in_days:7});
    if(e2)setError(e2.message);else {
      const row=Array.isArray(data)?data[0]:data;
      const link=new URL(window.location.origin);link.searchParams.set("invite",row.invitation_token);
      setInviteLink(link.toString());setInviteEmail("");setNotice("Invitation created. Share the secure link with the invited email address.");
      await load();
    }
    setBusy(false);
  }

  async function revoke(id:string){
    if(!supabase)return;
    setBusy(true);const {error:e}=await supabase.rpc("revoke_organization_invitation",{invitation_id:id});
    if(e)setError(e.message);else {setNotice("Invitation revoked.");await load();}
    setBusy(false);
  }

  const activeInvites=useMemo(()=>invitations.filter(i=>!i.accepted_at&&!i.revoked_at&&new Date(i.expires_at)>new Date()),[invitations]);

  return <section className="org-console" aria-label="Organization workspace">
    <header className="org-console-head"><div><span className="auth-kicker">MONK ORGANIZATION CORE</span><h2>Your <em>workspaces.</em></h2></div><button className="auth-back" onClick={()=>void onSignOut()}><LogOut size={15}/> Sign out</button></header>
    {error&&<p className="auth-message" role="alert">{error}</p>}{notice&&<p className="auth-message" role="status">{notice}</p>}
    <div className="org-card"><div className="org-card-title"><Building2 size={17}/> Organizations <button onClick={()=>void load()} disabled={busy} aria-label="Refresh organizations"><RefreshCw size={15}/></button></div>
      {organizations.length===0?<p className="auth-intro">You do not belong to an organization yet. Create your first workspace below or accept an invitation link.</p>:organizations.map(o=><button key={o.id} className={"org-row "+(active?.id===o.id?"selected":"")} onClick={()=>void switchOrg(o.id)} disabled={busy}><span className="org-avatar">{o.vertical==="education"?"E":"B"}</span><span className="org-row-main"><b>{o.name}</b><small>{o.vertical==="education"?"Education":"Business"} · {roleLabels[o.role]??o.role}</small></span>{active?.id===o.id?<ShieldCheck size={17}/>:<ArrowLeftRight size={16}/>}</button>)}
    </div>
    <form className="org-card org-create" onSubmit={createOrg}><div className="org-card-title"><Building2 size={17}/> Create another organization</div><label>Organization name<input required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Organization name"/></label><label>Workspace type<select value={vertical} onChange={e=>setVertical(e.target.value as "education"|"business")}><option value="business">Business</option><option value="education">Education</option></select></label><button className="auth-submit" disabled={busy}>Create workspace</button></form>
    {active&&<div className="org-card"><div className="org-card-title"><Users size={17}/> Team access <span className="org-role">{roleLabels[active.role]??active.role}</span></div>
      {canInvite?<form onSubmit={createInvite} className="invite-form"><label>Invite by email<input type="email" required value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="person@example.com"/></label><label>Role<select value={inviteRole} onChange={e=>setInviteRole(e.target.value)}>{["manager","sales","contributor","auditor","client","vendor"].map(r=><option key={r} value={r}>{roleLabels[r]}</option>)}</select></label><button className="auth-submit" disabled={busy}><MailPlus size={16}/> Create invitation</button></form>:<p className="auth-intro">Your role does not have permission to invite members.</p>}
      {inviteLink&&<div className="invite-link"><input readOnly value={inviteLink}/><button type="button" onClick={()=>void navigator.clipboard.writeText(inviteLink)} aria-label="Copy invitation link"><Copy size={16}/></button></div>}
      {activeInvites.length>0&&<div className="invite-list"><b>Pending invitations</b>{activeInvites.map(i=><div className="invite-row" key={i.id}><span>{i.email}<small>{roleLabels[i.role]??i.role} · expires {new Date(i.expires_at).toLocaleDateString()}</small></span>{canManage&&<button type="button" onClick={()=>void revoke(i.id)} disabled={busy}>Revoke</button>}</div>)}</div>}
    </div>}
    {busy&&<p className="auth-intro">Processing…</p>}
  </section>;
}
