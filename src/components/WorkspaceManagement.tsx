import { FormEvent, useCallback, useEffect, useState } from "react";
import { Activity, Archive, Building2, Check, ChevronDown, Copy, MailPlus, Pencil, Plus, RefreshCw, Shield, Trash2, Users } from "lucide-react";
import { supabase } from "../lib/supabase";

type Project = { id: string; name: string; code: string; description?: string | null; due_date?: string | null; visibility?: "internal" | "client_visible"; status?: "draft" | "active" | "at_risk" | "in_review" | "completed" };
type Member = { member_id: string; user_id: string; email: string; full_name: string; role: string; status: string; created_at: string };
type Invitation = { invitation_id: string; email: string; role: string; expires_at: string; accepted_at: string | null; revoked_at: string | null; created_at: string };
type Organization = { id: string; name: string; slug: string };
type AuditEntry = { id: number; action: string; resource_type: string; resource_id: string | null; actor_user_id: string | null; before_diff: Record<string, unknown> | null; after_diff: Record<string, unknown> | null; created_at: string };

const assignableRoles = ["admin", "manager", "sales", "contributor", "auditor", "client", "vendor"];

type Props = {
  view: "Projects" | "Team" | "Activity";
  organizationId: string;
  projects: Project[];
  projectId: string;
  setProjectId: (id: string) => void;
  onReload: () => Promise<void>;
};

export default function WorkspaceManagement({ view, organizationId, projects, projectId, setProjectId, onReload }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activity, setActivity] = useState<AuditEntry[]>([]);
  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("contributor");
  const [inviteUrl, setInviteUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadOrganizations = useCallback(async () => {
    if (!supabase) return;
    const { data, error: queryError } = await supabase.from("organizations").select("id,name,slug").is("deleted_at", null).order("name");
    if (queryError) throw queryError;
    setOrganizations((data ?? []) as Organization[]);
  }, []);

  const loadMembers = useCallback(async () => {
    if (!supabase) return;
    const { data, error: queryError } = await supabase.rpc("list_organization_members");
    if (queryError) throw queryError;
    setMembers((data ?? []) as Member[]);
  }, []);

  const loadInvitations = useCallback(async () => {
    if (!supabase) return;
    const { data, error: queryError } = await supabase.rpc("list_organization_invitations");
    if (queryError) throw queryError;
    setInvitations((data ?? []) as Invitation[]);
  }, []);

  const loadActivity = useCallback(async () => {
    if (!supabase) return;
    const { data, error: queryError } = await supabase.from("audit_logs")
      .select("id,action,resource_type,resource_id,actor_user_id,before_diff,after_diff,created_at")
      .eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(60);
    if (queryError) throw queryError;
    setActivity((data ?? []) as AuditEntry[]);
  }, [organizationId]);

  const refresh = useCallback(async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      await loadOrganizations();
      if (view === "Team") await Promise.all([loadMembers(), loadInvitations()]);
      if (view === "Activity") await loadActivity();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load workspace management data.");
    } finally {
      setBusy(false);
    }
  }, [view, organizationId, loadOrganizations, loadMembers, loadInvitations, loadActivity]);

  useEffect(() => { void refresh(); }, [refresh]);


  async function switchOrganization(nextId: string) {
    if (!supabase || !nextId || nextId === organizationId) return;
    setBusy(true); setError(""); setNotice("");
    const { error: rpcError } = await supabase.rpc("switch_organization", { target_org: nextId });
    if (rpcError) { setError(rpcError.message); setBusy(false); return; }
    setProjectId("");
    await onReload();
    setNotice("Workspace switched.");
    setBusy(false);
  }

  async function createProject(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !projectName.trim() || !projectCode.trim()) return;
    setBusy(true); setError(""); setNotice("");
    const { error: rpcError } = await supabase.rpc("create_project", {
      project_name: projectName.trim(), project_code: projectCode.trim().toUpperCase(),
      project_description: projectDescription.trim() || null, project_client_company_id: null,
      project_due_date: null, project_visibility: "internal"
    });
    if (rpcError) setError(rpcError.message);
    else { setProjectName(""); setProjectCode(""); setProjectDescription(""); setNotice("Project created."); await onReload(); }
    setBusy(false);
  }

  async function editProject(project: Project) {
    if (!supabase) return;
    const name = window.prompt("Project name", project.name);
    if (name === null) return;
    const code = window.prompt("Project code", project.code);
    if (code === null) return;
    const description = window.prompt("Project description (leave blank to clear)", project.description ?? "");
    if (description === null) return;
    setBusy(true); setError(""); setNotice("");
    const { error: rpcError } = await supabase.rpc("update_project_details", {
      target_project_id: project.id, next_name: name.trim(), next_code: code.trim().toUpperCase(),
      next_description: description, next_due_date: project.due_date ?? null, next_visibility: project.visibility ?? "internal", next_status: project.status ?? "active"
    });
    if (rpcError) setError(rpcError.message);
    else { setNotice("Project updated."); await onReload(); }
    setBusy(false);
  }

  async function archiveProject(project: Project) {
    if (!supabase || !window.confirm(`Archive project “${project.name}”? Active tasks will remain preserved.`)) return;
    setBusy(true); setError(""); setNotice("");
    const { error: rpcError } = await supabase.rpc("archive_project", { target_project_id: project.id });
    if (rpcError) setError(rpcError.message);
    else { setNotice("Project archived."); await onReload(); }
    setBusy(false);
  }

  async function inviteMember(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !inviteEmail.trim()) return;
    setBusy(true); setError(""); setNotice(""); setInviteUrl("");
    const { data, error: rpcError } = await supabase.rpc("create_organization_invitation", {
      target_org: organizationId, invite_email: inviteEmail.trim().toLowerCase(), invite_role: inviteRole, expires_in_days: 7
    });
    if (rpcError) setError(rpcError.message);
    else {
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.invitation_token) setError("Invitation was created, but no one-time token was returned. Check the invitation list before retrying.");
      else {
        const url = `${window.location.origin}/#invite=${encodeURIComponent(row.invitation_token)}`;
        setInviteUrl(url); setInviteEmail(""); setNotice("Invitation created. Copy the one-time link and send it to the invited email address.");
        await loadInvitations();
      }
    }
    setBusy(false);
  }

  async function copyInvitation() {
    if (!inviteUrl) return;
    try { await navigator.clipboard.writeText(inviteUrl); setNotice("Invitation link copied."); }
    catch { setError("Clipboard access was denied. Select and copy the invitation link manually."); }
  }

  async function revokeInvitation(invitation: Invitation) {
    if (!supabase || !window.confirm(`Revoke invitation for ${invitation.email}?`)) return;
    setBusy(true); setError(""); setNotice("");
    const { error: rpcError } = await supabase.rpc("revoke_organization_invitation", { invitation_id: invitation.invitation_id });
    if (rpcError) setError(rpcError.message);
    else { setNotice("Invitation revoked."); await loadInvitations(); }
    setBusy(false);
  }

  async function changeRole(member: Member, role: string) {
    if (!supabase || role === member.role) return;
    setBusy(true); setError(""); setNotice("");
    const { error: rpcError } = await supabase.rpc("update_organization_member_role", { target_member_id: member.member_id, next_role: role });
    if (rpcError) setError(rpcError.message);
    else { setNotice(`Role updated for ${member.email}.`); await loadMembers(); }
    setBusy(false);
  }

  async function removeMember(member: Member) {
    if (!supabase || !window.confirm(`Remove ${member.email} from this organization? Their historical audit records will remain.`)) return;
    setBusy(true); setError(""); setNotice("");
    const { error: rpcError } = await supabase.rpc("remove_organization_member", { target_member_id: member.member_id });
    if (rpcError) setError(rpcError.message);
    else { setNotice(`Removed ${member.email} from the organization.`); await Promise.all([loadMembers(), onReload()]); }
    setBusy(false);
  }

  const currentOrganization = organizations.find(org => org.id === organizationId);
  return (
    <section className="management">
      <header className="management-heading">
        <div><p className="eyebrow">WORKSPACE CONTROL</p><h2>{view === "Projects" ? "Projects" : view === "Team" ? "Team & access" : "Activity timeline"}</h2><p className="muted">{view === "Projects" ? "Create, update and archive organization projects." : view === "Team" ? "Manage members, roles and secure invitations." : "Recent organization audit events, newest first."}</p></div>
        <label className="org-switch"><Building2 size={15}/><select aria-label="Switch organization" value={organizationId} disabled={busy || organizations.length < 2} onChange={event => void switchOrganization(event.target.value)}>{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select><ChevronDown size={13}/></label>
      </header>
      {error && <div className="management-alert error" role="alert">{error}</div>}
      {notice && <div className="management-alert" role="status">{notice}</div>}
      {busy && <p className="management-loading"><RefreshCw size={13}/> Updating workspace…</p>}

      {view === "Projects" && <>
        <form className="management-form project-create" onSubmit={createProject}>
          <label>Project name<input required maxLength={120} value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Project name"/></label>
          <label>Project code<input required maxLength={20} value={projectCode} onChange={e => setProjectCode(e.target.value.toUpperCase())} placeholder="MONK-002"/></label>
          <label className="wide-field">Description<input maxLength={500} value={projectDescription} onChange={e => setProjectDescription(e.target.value)} placeholder="What is this project for?"/></label>
          <button className="primary" disabled={busy}><Plus size={15}/> Create project</button>
        </form>
        <div className="management-list">{projects.map(project => <article className={project.id === projectId ? "management-row selected" : "management-row"} key={project.id}>
          <button className="management-row-main" onClick={() => setProjectId(project.id)}><span className="management-icon"><Building2 size={16}/></span><span><b>{project.name}</b><small>{project.code} · {project.id === projectId ? "Selected project" : "Open project"}</small></span></button>
          <div className="management-actions"><button aria-label={`Edit ${project.name}`} disabled={busy} onClick={() => void editProject(project)}><Pencil size={14}/></button><button aria-label={`Archive ${project.name}`} disabled={busy} onClick={() => void archiveProject(project)}><Archive size={14}/></button></div>
        </article>)}{projects.length === 0 && <p className="management-empty">No active projects in this organization.</p>}</div>
      </>}

      {view === "Team" && <>
        <div className="management-subheading"><div><Users size={16}/><b>Organization members</b></div><span>{members.filter(member => member.status === "active").length} active</span></div>
        <div className="management-list">{members.map(member => <article className="management-row" key={member.member_id}>
          <span className="member-avatar">{(member.full_name || member.email || "?").slice(0,1).toUpperCase()}</span><span className="member-info"><b>{member.full_name || member.email || "Unnamed member"}</b><small>{member.email} · {member.status}</small></span>
          {member.role === "owner" ? <span className="role-pill"><Shield size={12}/> Owner</span> : member.status !== "active" ? <span className="role-pill">{member.role}</span> : <><select aria-label={`Role for ${member.email}`} value={member.role} disabled={busy} onChange={e => void changeRole(member,e.target.value)}>{assignableRoles.map(role => <option key={role} value={role}>{role}</option>)}</select><button className="danger-icon" aria-label={`Remove ${member.email}`} disabled={busy} onClick={() => void removeMember(member)}><Trash2 size={14}/></button></>}
        </article>)}{members.length === 0 && <p className="management-empty">No member records returned for this workspace or your account lacks team permissions.</p>}</div>
        <div className="management-subheading invite-heading"><div><MailPlus size={16}/><b>Invite a member</b></div><span>Link expires in 7 days</span></div>
        <form className="management-form invite-form" onSubmit={inviteMember}>
          <label>Email address<input required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="person@company.com"/></label>
          <label>Organization role<select value={inviteRole} onChange={e => setInviteRole(e.target.value)}>{assignableRoles.filter(role => role !== "admin").map(role => <option key={role} value={role}>{role}</option>)}</select></label>
          <button className="primary" disabled={busy}><MailPlus size={15}/> Create invitation</button>
        </form>
        {inviteUrl && <div className="invite-link"><input readOnly aria-label="Invitation link" value={inviteUrl}/><button onClick={() => void copyInvitation()}><Copy size={14}/> Copy link</button></div>}
        <div className="management-subheading invite-heading"><div><MailPlus size={16}/><b>Invitations</b></div><span>{invitations.length} records</span></div>
        <div className="management-list">{invitations.map(invitation => <article className="management-row" key={invitation.invitation_id}>
          <span className="member-info"><b>{invitation.email}</b><small>{invitation.role} · expires {new Date(invitation.expires_at).toLocaleDateString()}</small></span>
          <span className={invitation.accepted_at ? "status-pill accepted" : invitation.revoked_at || new Date(invitation.expires_at) < new Date() ? "status-pill expired" : "status-pill"}>{invitation.accepted_at ? "Accepted" : invitation.revoked_at ? "Revoked" : new Date(invitation.expires_at) < new Date() ? "Expired" : "Pending"}</span>
          {!invitation.accepted_at && !invitation.revoked_at && new Date(invitation.expires_at) > new Date() && <button className="danger-icon" aria-label={`Revoke invitation for ${invitation.email}`} disabled={busy} onClick={() => void revokeInvitation(invitation)}><Trash2 size={14}/></button>}
        </article>)}{invitations.length === 0 && <p className="management-empty">No invitations available.</p>}</div>
      </>}

      {view === "Activity" && <>
        <div className="management-subheading"><div><Activity size={16}/><b>Audit events</b></div><span>Last 60 events</span></div>
        <div className="timeline">{activity.map(entry => <article className="timeline-item" key={entry.id}>
          <span className="timeline-dot"><Check size={11}/></span><div className="timeline-content"><b>{entry.action.replaceAll("."," · ")}</b><p>{entry.resource_type}{entry.resource_id ? ` · ${entry.resource_id}` : ""}</p><small>{entry.actor_user_id ? `User ${entry.actor_user_id.slice(0,8)}` : "System"} · {new Date(entry.created_at).toLocaleString()}</small></div>
        </article>)}{activity.length === 0 && <p className="management-empty">No audit events are visible to this account. Audit access is restricted by organization permissions.</p>}</div>
      </>}
      <div className="management-footer"><span>{currentOrganization?.name ?? "Current organization"}</span><button onClick={() => void refresh()} disabled={busy}><RefreshCw size={13}/> Refresh</button></div>
    </section>
  );
}
