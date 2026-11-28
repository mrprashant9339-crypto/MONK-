-- Rollback-only staging regression: deleted workspaces must not be switchable,
-- visible through tenant RLS, or writable through tenant permission policies.

begin;

insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous,is_sso_user
) values (
  '21000000-0000-4000-8000-000000000001',
  'authenticated','authenticated','soft-delete-guard-20261128@example.test','',now(),
  '{}','{}',now(),now(),false,false
);

insert into public.organizations(id,name,slug,vertical,created_at,deleted_at) values
(
  '22000000-0000-4000-8000-000000000001',
  'Soft Deleted Guard Probe',
  'soft-delete-guard-probe-20261128',
  'business',
  now(),
  now()
),
(
  '22000000-0000-4000-8000-000000000002',
  'Active Guard Probe',
  'active-guard-probe-20261128',
  'business',
  now() - interval '1 hour',
  null
);

insert into public.organization_members(id,organization_id,user_id,role,status) values
(
  '23000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000001',
  'owner','active'
),
(
  '23000000-0000-4000-8000-000000000002',
  '22000000-0000-4000-8000-000000000002',
  '21000000-0000-4000-8000-000000000001',
  'owner','active'
);

insert into public.user_settings(user_id,active_organization_id)
values (
  '21000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000001'
)
on conflict (user_id) do update
set active_organization_id='22000000-0000-4000-8000-000000000001',
    updated_at=now();

insert into public.teams(id,organization_id,name,description,team_type,is_active,created_by) values
(
  '24000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000001',
  'Deleted tenant private row','must not be readable','functional',true,
  '21000000-0000-4000-8000-000000000001'
),
(
  '24000000-0000-4000-8000-000000000002',
  '22000000-0000-4000-8000-000000000002',
  'Active tenant visible row','expected active tenant row','functional',true,
  '21000000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','21000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"21000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

do $test$
declare
  v_visible_deleted integer;
  v_visible_active integer;
  v_current_org uuid;
  v_message text;
begin
  if public.is_org_member('22000000-0000-4000-8000-000000000001') then
    raise exception 'Soft-deleted workspace must not count as a current membership';
  end if;
  if public.has_org_role('22000000-0000-4000-8000-000000000001',array['owner']) then
    raise exception 'Soft-deleted workspace must not grant a role';
  end if;
  if public.has_org_permission('22000000-0000-4000-8000-000000000001','teams.manage') then
    raise exception 'Soft-deleted workspace must not grant permissions';
  end if;

  if not public.is_org_member('22000000-0000-4000-8000-000000000002')
     or not public.has_org_role('22000000-0000-4000-8000-000000000002',array['owner'])
     or not public.has_org_permission('22000000-0000-4000-8000-000000000002','teams.manage') then
    raise exception 'Active workspace membership and owner permissions must remain available';
  end if;

  v_current_org := public.current_organization_id();
  if v_current_org <> '22000000-0000-4000-8000-000000000002' then
    raise exception 'Stale deleted workspace selection should fall back to active workspace; got %',v_current_org;
  end if;

  begin
    perform public.switch_organization('22000000-0000-4000-8000-000000000001');
    raise exception 'Soft-deleted workspace unexpectedly accepted by switch_organization';
  exception when no_data_found then
    get stacked diagnostics v_message = message_text;
    if v_message not like '%Organization not found%' then
      raise exception 'Unexpected deleted-workspace switch rejection: %',v_message;
    end if;
  end;

  select count(*) into v_visible_deleted
  from public.teams
  where id='24000000-0000-4000-8000-000000000001';
  if v_visible_deleted <> 0 then
    raise exception 'RLS exposed % team rows from a soft-deleted workspace',v_visible_deleted;
  end if;

  select count(*) into v_visible_active
  from public.teams
  where id='24000000-0000-4000-8000-000000000002';
  if v_visible_active <> 1 then
    raise exception 'Active workspace team row should remain visible';
  end if;

  begin
    insert into public.teams(
      id,organization_id,name,description,team_type,is_active,created_by
    ) values (
      '24000000-0000-4000-8000-000000000003',
      '22000000-0000-4000-8000-000000000001',
      'Blocked deleted tenant write','must fail','functional',true,
      '21000000-0000-4000-8000-000000000001'
    );
    raise exception 'RLS allowed a write into a soft-deleted workspace';
  exception when insufficient_privilege then
    null;
  end;

  if public.switch_organization('22000000-0000-4000-8000-000000000002')
     <> '22000000-0000-4000-8000-000000000002' then
    raise exception 'Switching to an active workspace should still work';
  end if;

  if public.current_organization_id() <> '22000000-0000-4000-8000-000000000002' then
    raise exception 'Active workspace should remain selected after switching';
  end if;
end;
$test$;

select 'soft-deleted organization authorization boundary: PASS' as assertion;
rollback;
