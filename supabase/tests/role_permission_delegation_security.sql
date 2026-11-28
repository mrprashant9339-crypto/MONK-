-- Run after migration 20261128023000_harden_custom_role_permission_delegation.sql.
do $test$
declare
  v_def text := pg_get_functiondef(
    'public.set_organization_role_permissions(uuid,uuid,text[])'::regprocedure
  );
  v_owner_update integer;
  v_admin_update integer;
  v_total_permissions integer;
begin
  if not has_function_privilege('authenticated',
    'public.set_organization_role_permissions(uuid,uuid,text[])','EXECUTE') then
    raise exception 'Authenticated role lost intended custom-role permission management RPC';
  end if;

  if has_function_privilege('anon',
    'public.set_organization_role_permissions(uuid,uuid,text[])','EXECUTE') then
    raise exception 'anon must not execute custom-role permission management';
  end if;

  if v_def not ilike '%public.has_org_permission(target_org, requested.permission_id)%' then
    raise exception 'Permission delegation ceiling is missing';
  end if;

  if v_def not ilike '%for update%' then
    raise exception 'Target custom role must be row-locked during permission replacement';
  end if;

  select count(*) into v_owner_update
  from public.role_permissions
  where role_id='owner' and permission_id='organization.members.update';
  select count(*) into v_admin_update
  from public.role_permissions
  where role_id='admin' and permission_id='organization.members.update';
  select count(*) into v_total_permissions from public.permissions;

  if v_owner_update <> 1 or v_admin_update <> 1 then
    raise exception 'Owner and admin roles must include organization.members.update';
  end if;

  if (select count(*) from public.role_permissions where role_id='owner') <> v_total_permissions
     or (select count(*) from public.role_permissions where role_id='admin') <> v_total_permissions then
    raise exception 'Owner and admin must hold the complete current permission catalog';
  end if;
end;
$test$;

select 'custom-role permission delegation ceiling and owner/admin matrix: PASS' as assertion;
