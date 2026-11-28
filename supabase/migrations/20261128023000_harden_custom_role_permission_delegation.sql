-- Restore the expected owner/admin permission matrix, then prevent custom role managers
-- from delegating permissions they do not themselves hold.
insert into public.role_permissions(role_id, permission_id)
select r.id, 'organization.members.update'
from public.roles r
where r.is_system and r.id in ('owner','admin')
on conflict (role_id, permission_id) do nothing;

create or replace function public.set_organization_role_permissions(
  target_org uuid,
  target_role uuid,
  permission_keys text[]
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $function$
declare
  inserted_count integer;
  v_target_role public.organization_roles;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  if not public.has_org_permission(target_org,'organization.roles.manage') then
    raise exception 'Permission denied' using errcode='42501';
  end if;

  select * into v_target_role
  from public.organization_roles
  where id=target_role
    and organization_id=target_org
    and is_active
  for update;

  if not found then
    raise exception 'Role not found' using errcode='P0002';
  end if;

  if exists (
    select 1
    from unnest(coalesce(permission_keys,'{}'::text[])) requested(permission_id)
    where not public.has_org_permission(target_org, requested.permission_id)
  ) then
    raise exception 'You may only delegate permissions that you currently hold'
      using errcode='42501';
  end if;

  if exists (
    select 1
    from unnest(coalesce(permission_keys,'{}'::text[])) requested(permission_id)
    where not exists (
      select 1 from public.permissions p where p.id=requested.permission_id
    )
  ) then
    raise exception 'Unknown permission key' using errcode='22023';
  end if;

  delete from public.organization_role_permissions
  where organization_id=target_org
    and organization_role_id=target_role;

  insert into public.organization_role_permissions(organization_id,organization_role_id,permission_id)
  select target_org,target_role,requested.permission_id
  from (
    select distinct unnest(coalesce(permission_keys,'{}'::text[])) as permission_id
  ) requested;

  get diagnostics inserted_count=row_count;
  return inserted_count;
end;
$function$;
