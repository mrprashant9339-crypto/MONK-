-- Prevent privilege escalation through assign_organization_member_role.
-- Owner assignment is reserved for a separate, explicitly controlled ownership-transfer flow.
create or replace function public.assign_organization_member_role(
  target_org uuid,
  target_member uuid,
  built_in_role text default null,
  custom_role uuid default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $function$
declare
  target_row public.organization_members;
  org_vertical text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.has_org_permission(target_org, 'organization.members.manage') then
    raise exception 'Permission denied' using errcode = '42501';
  end if;

  if (built_in_role is null) = (custom_role is null) then
    raise exception 'Choose exactly one built-in or custom role' using errcode = '22023';
  end if;

  select vertical into org_vertical
  from public.organizations
  where id = target_org and deleted_at is null;

  if org_vertical is null then
    raise exception 'Organization not found' using errcode = 'P0002';
  end if;

  select * into target_row
  from public.organization_members
  where id = target_member
    and organization_id = target_org
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active member not found in organization' using errcode = 'P0002';
  end if;

  if target_row.user_id = auth.uid() then
    raise exception 'You cannot change your own role' using errcode = '42501';
  end if;

  if target_row.role = 'owner' then
    raise exception 'The organization owner role cannot be changed through role assignment' using errcode = '42501';
  end if;

  if target_row.role = 'admin' and not public.has_org_role(target_org, array['owner']) then
    raise exception 'Only the owner can change an administrator role' using errcode = '42501';
  end if;

  if built_in_role is not null then
    if not exists (
      select 1 from public.roles
      where id = built_in_role and is_system
    ) then
      raise exception 'Unknown built-in role' using errcode = '22023';
    end if;

    if built_in_role = 'owner' then
      raise exception 'Owner assignment requires the dedicated ownership-transfer workflow' using errcode = '42501';
    end if;

    if built_in_role = 'admin' and not public.has_org_role(target_org, array['owner']) then
      raise exception 'Only the owner can assign administrator role' using errcode = '42501';
    end if;

    if built_in_role in ('principal','hod','teacher','student','parent') then
      if org_vertical <> 'education' then
        raise exception 'Education roles require an Education workspace' using errcode = '22023';
      end if;

      if built_in_role in ('principal','hod')
         and not public.has_org_role(target_org, array['owner','admin','principal']) then
        raise exception 'Only institution leadership can assign principal or HOD roles' using errcode = '42501';
      end if;

      if built_in_role = 'principal'
         and not public.has_org_role(target_org, array['owner','admin']) then
        raise exception 'Only the owner or administrator can appoint a principal' using errcode = '42501';
      end if;

      if built_in_role in ('teacher','student','parent')
         and not public.has_org_role(target_org, array['owner','admin','manager','principal']) then
        raise exception 'Only institution leadership can assign education members' using errcode = '42501';
      end if;
    end if;
  else
    if not exists (
      select 1 from public.organization_roles
      where id = custom_role
        and organization_id = target_org
        and is_active
    ) then
      raise exception 'Unknown custom role' using errcode = '22023';
    end if;
  end if;

  update public.organization_members
  set role = coalesce(built_in_role, 'contributor'),
      organization_role_id = custom_role,
      updated_at = now()
  where id = target_member
    and organization_id = target_org
    and status = 'active';

  if not found then
    raise exception 'Member not found in organization' using errcode = 'P0002';
  end if;

  insert into public.activities(
    organization_id,actor_user_id,resource_type,resource_id,kind,body
  )
  values(
    target_org,auth.uid(),'organization_member',target_member,'system','Updated organization member role'
  );
end;
$function$;
