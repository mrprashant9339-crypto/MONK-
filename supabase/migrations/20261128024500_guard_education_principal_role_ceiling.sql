-- Keep Education principals inside the Education role boundary.
-- A principal may manage institution roles, but must not grant broader platform
-- roles such as manager/sales through the generic member update or invite RPCs.

create or replace function public.update_organization_member_role(
  target_member_id uuid,
  next_role text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $function$
declare
  org_id uuid := public.current_organization_id();
  target_row public.organization_members;
  org_vertical text;
begin
  if auth.uid() is null or org_id is null
     or not public.has_org_permission(org_id, 'organization.members.update') then
    raise exception 'Permission denied' using errcode = '42501';
  end if;

  select vertical into org_vertical
  from public.organizations
  where id = org_id and deleted_at is null;

  if org_vertical is null then
    raise exception 'Organization not found' using errcode = 'P0002';
  end if;

  if next_role in ('admin','manager','sales','contributor','auditor','client','vendor') then
    null;
  elsif next_role in ('principal','hod','teacher','student','parent') then
    if org_vertical <> 'education' then
      raise exception 'Education roles require an Education workspace' using errcode = '22023';
    end if;
    if next_role in ('principal','hod')
       and not public.has_org_role(org_id, array['owner','admin','principal']) then
      raise exception 'Only institution leadership can assign principal or HOD roles' using errcode = '42501';
    end if;
    if next_role in ('teacher','student','parent')
       and not public.has_org_role(org_id, array['owner','admin','manager','principal']) then
      raise exception 'Only institution leadership can assign education members' using errcode = '42501';
    end if;
    if next_role = 'principal'
       and not public.has_org_role(org_id, array['owner','admin']) then
      raise exception 'Only owner or administrator can appoint a principal' using errcode = '42501';
    end if;
  else
    raise exception 'Invalid assignable role' using errcode = '22023';
  end if;

  -- Principals may assign Education roles only. Keep the existing special
  -- admin/principal checks below so their denials remain explicit.
  if org_vertical = 'education'
     and public.has_org_role(org_id, array['principal'])
     and not public.has_org_role(org_id, array['owner','admin'])
     and next_role not in ('admin','principal','hod','teacher','student','parent') then
    raise exception 'Institution principals may only assign Education roles' using errcode = '42501';
  end if;

  select * into target_row
  from public.organization_members
  where id = target_member_id
    and organization_id = org_id
    and status = 'active'
  for update;

  if target_row.id is null then
    raise exception 'Active member not found' using errcode = 'P0002';
  end if;

  if target_row.user_id = auth.uid() then
    raise exception 'You cannot change your own role' using errcode = '42501';
  end if;

  if target_row.role = 'owner' then
    raise exception 'The organization owner role cannot be changed' using errcode = '42501';
  end if;

  if target_row.role = 'admin'
     and not public.has_org_role(org_id, array['owner']) then
    raise exception 'Only the owner can change an administrator role' using errcode = '42501';
  end if;

  if next_role = 'admin'
     and not public.has_org_role(org_id, array['owner']) then
    raise exception 'Only the owner can assign administrator role' using errcode = '42501';
  end if;

  update public.organization_members
  set role = next_role, updated_at = now()
  where id = target_member_id and organization_id = org_id;

  perform public.record_audit(
    org_id,
    'organization.member.role_changed',
    'organization_member',
    target_member_id::text,
    jsonb_build_object('role', target_row.role),
    jsonb_build_object('role', next_role, 'user_id', target_row.user_id)
  );

  return true;
end;
$function$;

create or replace function public.create_organization_invitation(
  target_org uuid,
  invite_email text,
  invite_role text,
  expires_in_days integer default 7
)
returns table(
  invitation_id uuid,
  invitation_token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $function$
declare
  raw_token text;
  normalized_email text;
  expiry timestamptz;
  target_vertical text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  normalized_email := lower(trim(coalesce(invite_email,'')));
  if normalized_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$' then
    raise exception 'Enter a valid email address' using errcode = '22023';
  end if;

  select vertical into target_vertical
  from public.organizations
  where id = target_org and deleted_at is null;

  if target_vertical is null then
    raise exception 'Organization not found' using errcode = 'P0002';
  end if;

  if invite_role in ('admin','manager','sales','contributor','auditor','client','vendor') then
    null;
  elsif invite_role in ('principal','hod','teacher','student','parent') then
    if target_vertical <> 'education' then
      raise exception 'Education roles can only be invited to Education workspaces' using errcode = '22023';
    end if;
    if not public.has_org_permission(target_org, 'education.institution.update') then
      raise exception 'You do not have permission to invite education members' using errcode = '42501';
    end if;
    if invite_role = 'principal'
       and not public.has_org_role(target_org, array['owner','admin']) then
      raise exception 'Only the owner or administrator can appoint a principal' using errcode = '42501';
    end if;
    if invite_role = 'hod'
       and not public.has_org_role(target_org, array['owner','admin','principal']) then
      raise exception 'Only institution leadership can appoint an HOD' using errcode = '42501';
    end if;
    if invite_role in ('teacher','student','parent')
       and not public.has_org_role(target_org, array['owner','admin','manager','principal']) then
      raise exception 'Only institution leadership can invite teachers, students or parents' using errcode = '42501';
    end if;
  else
    raise exception 'This role cannot be assigned through an invitation' using errcode = '22023';
  end if;

  -- Principals may invite Education roles only. Owner/admin invitations retain
  -- their existing authority, including manager invitations where appropriate.
  if target_vertical = 'education'
     and public.has_org_role(target_org, array['principal'])
     and not public.has_org_role(target_org, array['owner','admin'])
     and invite_role not in ('admin','principal','hod','teacher','student','parent') then
    raise exception 'Institution principals may only invite Education roles' using errcode = '42501';
  end if;

  if not public.has_org_permission(target_org, 'organization.members.invite') then
    raise exception 'You do not have permission to invite members' using errcode = '42501';
  end if;

  if invite_role = 'admin'
     and not public.has_org_role(target_org, array['owner']) then
    raise exception 'Only the organization owner can invite an administrator' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.organization_members om
    join auth.users u on u.id = om.user_id
    where om.organization_id = target_org
      and lower(u.email) = normalized_email
      and om.status = 'active'
  ) then
    raise exception 'This person is already an active organization member' using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.invitations i
    where i.organization_id = target_org
      and lower(i.email::text) = normalized_email
      and i.accepted_at is null
      and i.revoked_at is null
      and i.expires_at > now()
  ) then
    raise exception 'An active invitation already exists for this email' using errcode = '23505';
  end if;

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  expiry := now() + make_interval(days => greatest(1, least(coalesce(expires_in_days,7),30)));

  insert into public.invitations(
    organization_id,email,role,token_hash,invited_by,expires_at
  )
  values (
    target_org,normalized_email::citext,invite_role,
    encode(extensions.digest(raw_token,'sha256'),'hex'),auth.uid(),expiry
  )
  returning id into invitation_id;

  invitation_token := raw_token;
  expires_at := expiry;

  perform public.record_audit(
    target_org,
    'organization.invitation.created',
    'invitation',
    invitation_id::text,
    null,
    jsonb_build_object('email',normalized_email,'role',invite_role,'expires_at',expiry),
    null,
    false
  );

  return next;
end;
$function$;
