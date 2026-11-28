-- Run after migration 20261128021900_harden_organization_role_assignment.sql.
do $test$
declare
  v_def text := pg_get_functiondef(
    'public.assign_organization_member_role(uuid,uuid,text,uuid)'::regprocedure
  );
  v_admin_can_manage integer;
  v_manager_can_manage integer;
begin
  if not has_function_privilege(
    'authenticated',
    'public.assign_organization_member_role(uuid,uuid,text,uuid)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated role lost intended role-assignment RPC access';
  end if;

  if has_function_privilege(
    'anon',
    'public.assign_organization_member_role(uuid,uuid,text,uuid)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute assign_organization_member_role';
  end if;

  if v_def not ilike '%built_in_role = ''owner''%'
     or v_def not ilike '%Owner assignment requires the dedicated ownership-transfer workflow%' then
    raise exception 'Built-in owner assignment must be prohibited in this RPC';
  end if;

  if v_def not ilike '%built_in_role = ''admin'' and not public.has_org_role(target_org, array[''owner''])%' then
    raise exception 'Assigning an administrator must be owner-only';
  end if;

  if v_def not ilike '%target_row.role = ''admin'' and not public.has_org_role(target_org, array[''owner''])%' then
    raise exception 'Changing an existing administrator must be owner-only';
  end if;

  if v_def not ilike '%target_row.role = ''owner''%' then
    raise exception 'Existing owner membership must be protected';
  end if;

  if v_def not ilike '%target_row.user_id = auth.uid()%' then
    raise exception 'Self role changes must be rejected';
  end if;

  if v_def not ilike '%org_vertical <> ''education''%' then
    raise exception 'Education-only built-in roles must be restricted to Education workspaces';
  end if;

  select count(*) into v_admin_can_manage
  from public.role_permissions
  where role_id='admin' and permission_id='organization.members.manage';
  select count(*) into v_manager_can_manage
  from public.role_permissions
  where role_id='manager' and permission_id='organization.members.manage';

  if v_admin_can_manage <> 1 or v_manager_can_manage <> 0 then
    raise exception 'Expected staging admin/manager member-management permission matrix changed';
  end if;
end;
$test$;

select 'organization role assignment privilege-escalation guards: PASS' as assertion;
