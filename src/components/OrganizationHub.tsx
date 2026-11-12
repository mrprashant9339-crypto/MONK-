import { FormEvent, useEffect, useState } from "react";
import { ArrowLeftRight, Building2, Copy, GraduationCap, LogOut, Plus, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";\nimport WorkspaceDashboard from "./WorkspaceDashboard";

type Membership = { organization_id: string; role: string; organizations: { id: string; name: string; slug: string; vertical: string } | null };
type Invitation = { id: string; email: string; role: string; expires_at: string; accepted_at: string | null; revoked_at: string | null };
type Props = { onSignOut: () => Promise<void>; onWorkspaceReady?: () => void };
export default function OrganizationHub({ onSignOut }: Props) {
  const [memberships,setMemberships]=useState<Membership[]>([]);
  const [invitations,setInvitations]=useState<Invitation[]>([]);
  const [activeId,setActiveId]=useState("");
  const [name,setName]=useState("");
  const [vertical,setVertical]=useState<"education"|"business">("business");
  const [email,setEmail]=useState("");
  const [role,setRole]=useState("contributor");
  const [inviteLink,setInviteLink]=useState("");
  const [canInvite,setCanInvite]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");\n  const [workspaceOpen,setWorkspaceOpen]=useState(false);
  async function load(){
    if(!supabase || !isSupabaseConfigured)return;
    setBusy(true);setError("");
    try{
      const [m,a]=await Promise.all([
        supabase.from("organization_members").select("organization_id,role,organizations(id,name,slug,vertical)").eq("status","active"),
        supabase.rpc("current_organization_id")
      ]);
      if(m.error)throw m.error;if(a.error)throw a.error;
      const rows=(m.data??[]) as unknown as Membership[];
      setMemberships(rows);setActiveId(a.data??rows[0]?.organization_id??"");
      if(a.data){
        const permission=await supabase.rpc("has_org_permission",{target_org:a.data,permission_key:"organization.members.invite"});
        setCanInvite(!permission.error && permission.data===true);
        const inv=await supabase.from("invitations").select("id,email,role,expires_at,accepted_at,revoked_at").eq("organization_id",a.data).order("created_at",{ascending:false}).limit(20);
        if(!inv.error)setInvitations((inv.data??[]) as Invitation[]);else setInvitations([]);
      }else {setInvitations([]);setCanInvite(false);}
    }catch(e){setError(e instanceof Error?e.message:"Unable to load organizations.");}
    finally{setBusy(false);}
  }
  useEffect(()=>{void load();},[]);
  useEffect(()=>{
    const token=new URLSearchParams(window.location.search).get("invite");
    if(!token||!supabase||!isSupabaseConfigured)return;
    let cancelled=false;
    (async()=>{setBusy(true);setError("");try{const {error}=await supabase.rpc("accept_organization_invitation",{invite_token:token});if(error)throw error;if(!cancelled){window.history.replaceState({}, "", window.location.pathname);setNotice("Invitation accepted. Your organization access is active.");await load();}}catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Invitation could not be accepted.");}finally{if(!cancelled)setBusy(false)}})();
    return()=>{cancelled=true};
  },[]);
  async function switchOrg(id:string){if(!supabase)return;setBusy(true);setError("");try{const {error}=await supabase.rpc("switch_organization",{target_org:id});if(error)throw error;setActiveId(id);await load();setNotice("Organization switched.");}catch(e){setError(e instanceof Error?e.message:"Could not switch organization.");}finally{setBusy(false)}}
  async function createOrg(e:FormEvent){e.preventDefault();if(!supabase)return;const slug=name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48);if(!slug){setError("Enter a valid organization name.");return;}setBusy(true);setError("");try{const {error}=await supabase.rpc("create_organization",{org_name:name.trim(),org_slug:slug,org_country:"IN",org_timezone:"Asia/Kolkata",org_currency:"INR",org_locale:"en-IN",org_industry:vertical==="education"?"Education":"Professional services",org_vertical:vertical});if(error)throw error;setName("");setNotice("Organization created.");await load();}catch(e){setError(e instanceof Error?e.message:"Could not create organization.");}finally{setBusy(false)}}
  async function invite(e:FormEvent){e.preventDefault();if(!supabase||!activeId)return;setBusy(true);setError("");setInviteLink("");try{const {data,error}=await supabase.rpc("create_organization_invitation",{target_org:activeId,invite_email:email.trim(),invite_role:role,expires_in_days:7});if(error)throw error;const row=Array.isArray(data)?data[0]:data;if(!row?.invitation_token)throw new Error("Invitation was created but its token was not returned.");const link=new URL(window.location.href);link.searchParams.set("invite",row.invitation_token);setInviteLink(link.toString());setEmail("");setNotice("Invitation token created. Share the secure link with the invited person.");await load();}catch(e){setError(e instanceof Error?e.message:"Could not create invitation.");}finally{setBusy(false)}}
  async function revoke(id:string){if(!supabase)return;setBusy(true);setError("");try{const {error}=await supabase.rpc("revoke_organization_invitation",{invitation_id:id});if(error)throw error;await load();setNotice("Invitation revoked.");}catch(e){setError(e instanceof Error?e.message:"Could not revoke invitation.");}finally{setBusy(false)}}
  const active=memberships.find(x=>x.organization_id===activeId);
  return <div className="org-hub">
    <div className="org-hub-head"><div><div className="auth-kicker">MONK ORGANIZATION CORE</div><h2>Your <em>workspaces.</em></h2><p className="auth-intro">Switch between organizations and manage access from one place.</p></div><button className="auth-back" onClick={()=>void onSignOut()}><LogOut size={15}/> Sign out</button></div>
    {error&&<p className="auth-message" role="alert">{error}</p>}{notice&&<p className="auth-message" role="status">{notice}</p>}
    <section className="org-hub-section"><h3><Building2 size={17}/> Your organizations</h3>{memberships.length===0&&<p className="auth-intro">You are not a member of an organization yet.</p>}{memberships.map(m=><article className={m.organization_id===activeId?"org-row selected":"org-row"} key={m.organization_id}><div className="org-avatar">{m.organizations?.vertical==="education"?<GraduationCap/>:<Building2/>}</div><div className="org-row-copy"><b>{m.organizations?.name??"Organization"}</b><small>{m.organizations?.vertical??"business"} · {m.role}</small></div>{m.organization_id===activeId?<span className="org-active">ACTIVE</span>:<button className="org-action" disabled={busy} onClick={()=>void switchOrg(m.organization_id)}><ArrowLeftRight size={14}/> Switch</button>}</article>)}</section>
    {active&&<section className="org-hub-section"><button className="auth-submit" onClick={()=>setWorkspaceOpen(true)}>Open MONK workspace <ArrowLeftRight size={15}/></button></section>}\n    <section className="org-hub-section"><h3><Plus size={17}/> Create another organization</h3><form className="org-create-form" onSubmit={createOrg}><input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Organization name"/><select value={vertical} onChange={e=>setVertical(e.target.value as "education"|"business")}><option value="business">Business</option><option value="education">Education</option></select><button className="auth-submit" disabled={busy}>Create <Plus size={15}/></button></form></section>
    {active&&canInvite&&<section className="org-hub-section"><h3><Users size={17}/> Invite members <span className="org-role-note">Role access is enforced by database RPCs</span></h3><form className="org-create-form" onSubmit={invite}><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="person@example.com"/><select value={role} onChange={e=>setRole(e.target.value)}><option value="contributor">Contributor</option><option value="manager">Manager</option><option value="sales">Sales</option><option value="auditor">Auditor</option><option value="client">Client</option><option value="vendor">Vendor</option>{active.role==="owner"&&<option value="admin">Admin (owner only)</option>}</select><button className="auth-submit" disabled={busy}>Create invite <Plus size={15}/></button></form>{inviteLink&&<div className="invite-link"><span>Invitation link generated — share privately</span><button className="org-action" onClick={()=>void navigator.clipboard.writeText(inviteLink)}><Copy size={14}/> Copy link</button></div>}
    <div className="invitation-list">{invitations.map(i=><article className="org-row" key={i.id}><div className="org-row-copy"><b>{i.email}</b><small>{i.role} · expires {new Date(i.expires_at).toLocaleDateString()}</small></div><span className="org-active">{i.accepted_at?"ACCEPTED":i.revoked_at?"REVOKED":new Date(i.expires_at)<new Date()?"EXPIRED":"PENDING"}</span>{!i.accepted_at&&!i.revoked_at&&new Date(i.expires_at)>new Date()&&<button className="org-action" disabled={busy} onClick={()=>void revoke(i.id)}>Revoke</button>}</article>)}</div></section>}
    <div className="org-hub-foot"><ShieldCheck size={14}/> Secure organization access · <button onClick={()=>void load()} disabled={busy}><RefreshCw size={13}/> Refresh</button></div>
  </div>;
}
