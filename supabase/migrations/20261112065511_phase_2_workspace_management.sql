-- MONK Phase 2: secure project lifecycle, team administration, invitation listing and audit reads.
-- No direct table write privileges are added. All mutations are permission-checked SECURITY DEFINER RPCs.

create or replace function public.update_project_details(
  target_project_id uuid,
  next_name text,
  next_code text,
  next_description text,
  next_due_date date,
  next_visibility text,
  next_status text
)
returns public.projects
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  org_id uuid := public.current_organization_id();
  before_row public.projects;
  after_row public.projects;
begin
  if auth.uid() is null or org_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if not public.has_org_permission(org_id,'projects.project.update') then
    raise exception 'Permission denied' using errcode='42501';
  end if;
  select * into before_row from public.projects
   where id=target_project_id and organization_id=org_id and deleted_at is null
   for update;
  if before_row.id is null or not public.can_read_project(target_project_id,org_id) then
    raise exception 'Project not found' using errcode='P0002';
  end if;
  if next_name is null or length(trim(next_name)) not between 2 and 120 then
    raise exception 'Project name must contain between 2 and 120 characters' using errcode='22023';
  end if;
  if next_code is null or trim(next_code) !~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,19}$' then
    raise exception 'Project code must be 2–20 letters, numbers, underscores or hyphens' using errcode='22023';
  end if;
  if next_visibility not in ('internal','client_visible') then
    raise exception 'Invalid project visibility' using errcode='22023';
  end if;
  if next_status not in ('draft','active','at_risk','in_review','completed') then
    raise exception 'Invalid project status' using errcode='22023';
  end if;
  update public.projects
     set name=trim(next_name), code=upper(trim(next_code)),
         description=nullif(trim(coalesce(next_description,'')),''),
         due_date=next_due_date, visibility=next_visibility, status=next_status, updated_at=now()
   where id=target_project_id and organization_id=org_id
   returning * into after_row;
  perform public.record_audit(org_id,'project.updated','project',target_project_id::text,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end;
$function$;

create or replace function public.archive_project(target_project_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  org_id uuid := public.current_organization_id();
  before_row public.projects;
begin
  if auth.uid() is null or org_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if not public.has_org_permission(org_id,'projects.project.update') then
    raise exception 'Permission denied' using errcode='42501';
  end if;
  select * into before_row from public.projects
   where id=target_project_id and organization_id=org_id and deleted_at is null
   for update;
  if before_row.id is null or not public.can_read_project(target_project_id,org_id) then
    raise exception 'Project not found' using errcode='P0002';
  end if;
  update public.projects set deleted_at=now(),status='archived',updated_at=now()
   where id=target_project_id and organization_id=org_id;
  perform public.record_audit(org_id,'project.archived','project',target_project_id::text,to_jsonb(before_row),
    jsonb_build_object('status','archived','deleted_at',now()));
  return true;
end;
$function$;

create or replace function public.list_organization_members()
returns table(member_id uuid,user_id uuid,email text,full_name text,role text,status text,created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare org_id uuid := public.current_organization_id();
begin
  if auth.uid() is null or org_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if not (public.has_org_permission(org_id,'organization.members.invite')
       or public.has_org_permission(org_id,'organization.members.update')) then
    raise exception 'Permission denied' using errcode='42501';
  end if;
  return query
  select om.id,om.user_id,coalesce(u.email,''),coalesce(p.full_name,''),om.role,om.status,om.created_at
    from public.organization_members om
    join auth.users u on u.id=om.user_id
    left join public.profiles p on p.id=om.user_id
   where om.organization_id=org_id
   order by case when om.role='owner' then 0 else 1 end,om.created_at;
end;
$function$;

create or replace function public.update_organization_member_role(target_member_id uuid,next_role text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  org_id uuid := public.current_organization_id();
  target_row public.organization_members;
begin
  if auth.uid() is null or org_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if not public.has_org_permission(org_id,'organization.members.update') then
    raise exception 'Permission denied' using errcode='42501';
  end if;
  if next_role not in ('admin','manager','sales','contributor','auditor','client','vendor') then
    raise exception 'Invalid assignable role' using errcode='22023';
  end if;
  select * into target_row from public.organization_members
   where id=target_member_id and organization_id=org_id and status='active'
   for update;
  if target_row.id is null then raise exception 'Active member not found' using errcode='P0002'; end if;
  if target_row.user_id=auth.uid() then raise exception 'You cannot change your own role' using errcode='42501'; end if;
  if target_row.role='owner' then raise exception 'The organization owner role cannot be changed' using errcode='42501'; end if;
  if target_row.role='admin' and not public.has_org_role(org_id,array['owner']) then
    raise exception 'Only the owner can change an administrator role' using errcode='42501';
  end if;
  if next_role='admin' and not public.has_org_role(org_id,array['owner']) then
    raise exception 'Only the owner can assign administrator role' using errcode='42501';
  end if;
  update public.organization_members set role=next_role,updated_at=now()
   where id=target_member_id and organization_id=org_id;
  perform public.record_audit(org_id,'organization.member.role_changed','organization_member',target_member_id::text,
    jsonb_build_object('role',target_row.role),jsonb_build_object('role',next_role,'user_id',target_row.user_id));
  return true;
end;
$function$;

create or replace function public.remove_organization_member(target_member_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  org_id uuid := public.current_organization_id();
  target_row public.organization_members;
begin
  if auth.uid() is null or org_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if not public.has_org_permission(org_id,'organization.members.update') then
    raise exception 'Permission denied' using errcode='42501';
  end if;
  select * into target_row from public.organization_members
   where id=target_member_id and organization_id=org_id and status='active'
   for update;
  if target_row.id is null then raise exception 'Active member not found' using errcode='P0002'; end if;
  if target_row.user_id=auth.uid() then raise exception 'You cannot remove yourself from the organization' using errcode='42501'; end if;
  if target_row.role='owner' then raise exception 'The organization owner cannot be removed' using errcode='42501'; end if;
  if target_row.role='admin' and not public.has_org_role(org_id,array['owner']) then
    raise exception 'Only the owner can remove an administrator' using errcode='42501';
  end if;
  update public.organization_members set status='removed',updated_at=now()
   where id=target_member_id and organization_id=org_id;
  perform public.record_audit(org_id,'organization.member.removed','organization_member',target_member_id::text,
    jsonb_build_object('role',target_row.role,'status',target_row.status),
    jsonb_build_object('role',target_row.role,'status','removed','user_id',target_row.user_id));
  return true;
end;
$function$;

create or replace function public.list_organization_invitations()
returns table(invitation_id uuid,email text,role text,expires_at timestamptz,accepted_at timestamptz,revoked_at timestamptz,created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare org_id uuid := public.current_organization_id();
begin
  if auth.uid() is null or org_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if not public.has_org_permission(org_id,'organization.members.invite') then
    raise exception 'Permission denied' using errcode='42501';
  end if;
  return query
  select i.id,i.email::text,i.role,i.expires_at,i.accepted_at,i.revoked_at,i.created_at
    from public.invitations i
   where i.organization_id=org_id
   order by i.created_at desc
   limit 100;
end;
$function$;

revoke all on function public.update_project_details(uuid,text,text,text,date,text,text) from public,anon;
revoke all on function public.archive_project(uuid) from public,anon;
revoke all on function public.list_organization_members() from public,anon;
revoke all on function public.update_organization_member_role(uuid,text) from public,anon;
revoke all on function public.remove_organization_member(uuid) from public,anon;
revoke all on function public.list_organization_invitations() from public,anon;
grant execute on function public.update_project_details(uuid,text,text,text,date,text,text) to authenticated;
grant execute on function public.archive_project(uuid) to authenticated;
grant execute on function public.list_organization_members() to authenticated;
grant execute on function public.update_organization_member_role(uuid,text) to authenticated;
grant execute on function public.remove_organization_member(uuid) to authenticated;
grant execute on function public.list_organization_invitations() to authenticated;
