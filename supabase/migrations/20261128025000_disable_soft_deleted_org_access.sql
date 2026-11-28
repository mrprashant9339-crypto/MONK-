-- A soft-deleted organization must no longer be considered an active tenant.
-- Enforce the same invariant in all shared membership/role/permission helpers so
-- both PostgREST RLS policies and SECURITY DEFINER RPCs inherit the guard.

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $function$
  select exists (
    select 1
    from public.organization_members om
    join public.organizations o
      on o.id = om.organization_id
     and o.deleted_at is null
    where om.organization_id = target_org
      and om.user_id = (select auth.uid())
      and om.status = 'active'
  );
$function$;

create or replace function public.has_org_role(target_org uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $function$
  select exists (
    select 1
    from public.organization_members om
    join public.organizations o
      on o.id = om.organization_id
     and o.deleted_at is null
    where om.organization_id = target_org
      and om.user_id = (select auth.uid())
      and om.status = 'active'
      and om.role = any(allowed_roles)
  );
$function$;

create or replace function public.has_org_permission(target_org uuid, permission_key text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $function$
  select exists (
    select 1
    from public.organization_members om
    join public.organizations o
      on o.id = om.organization_id
     and o.deleted_at is null
    where om.organization_id = target_org
      and om.user_id = (select auth.uid())
      and om.status = 'active'
      and (
        exists (
          select 1 from public.role_permissions rp
          where rp.role_id = om.role
            and rp.permission_id = permission_key
        )
        or exists (
          select 1
          from public.organization_role_permissions orp
          join public.organization_roles org_role
            on org_role.id = orp.organization_role_id
           and org_role.organization_id = orp.organization_id
          where orp.organization_id = om.organization_id
            and orp.organization_role_id = om.organization_role_id
            and orp.permission_id = permission_key
            and org_role.is_active
        )
      )
  );
$function$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $function$
  select coalesce(
    (
      select us.active_organization_id
      from public.user_settings us
      join public.organization_members om
        on om.organization_id = us.active_organization_id
       and om.user_id = us.user_id
       and om.status = 'active'
      join public.organizations o
        on o.id = om.organization_id
       and o.deleted_at is null
      where us.user_id = (select auth.uid())
    ),
    (
      select om.organization_id
      from public.organization_members om
      join public.organizations o
        on o.id = om.organization_id
       and o.deleted_at is null
      where om.user_id = (select auth.uid())
        and om.status = 'active'
      order by om.created_at
      limit 1
    )
  );
$function$;

create or replace function public.switch_organization(target_org uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organizations o
    where o.id = target_org
      and o.deleted_at is null
  ) or not public.is_org_member(target_org) then
    raise exception 'Organization not found' using errcode = 'P0002';
  end if;

  update public.user_settings
  set active_organization_id = target_org,
      updated_at = now()
  where user_id = auth.uid();

  if not found then
    raise exception 'User settings not found' using errcode = 'P0002';
  end if;

  return target_org;
end;
$function$;
