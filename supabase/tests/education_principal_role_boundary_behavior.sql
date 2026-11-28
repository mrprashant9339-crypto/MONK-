-- Rollback-only staging regression for Education principal role ceilings.
-- Synthetic users, org, memberships, invitations and audit rows are removed by
-- the final ROLLBACK. Database-state assertions run as the transaction owner
-- after RESET ROLE so RLS does not hide other members' rows from the test.

begin;

insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous,is_sso_user
) values
('61000000-0000-4000-8000-000000000001','authenticated','authenticated','principal-ceiling-probe-20261128@example.test','',now(),'{}','{}',now(),now(),false,false),
('61000000-0000-4000-8000-000000000002','authenticated','authenticated','principal-target-probe-20261128@example.test','',now(),'{}','{}',now(),now(),false,false),
('61000000-0000-4000-8000-000000000003','authenticated','authenticated','principal-owner-probe-20261128@example.test','',now(),'{}','{}',now(),now(),false,false);

insert into public.organizations (id,name,slug,vertical)
values ('62000000-0000-4000-8000-000000000001','Principal Ceiling Probe','principal-ceiling-probe-20261128','education');

insert into public.organization_members (id,organization_id,user_id,role,status) values
('63000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001','principal','active'),
('63000000-0000-4000-8000-000000000002','62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','contributor','active'),
('63000000-0000-4000-8000-000000000003','62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000003','owner','active');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

do $principal$
declare
  v_message text;
  v_invitation_id uuid;
begin
  if not public.has_org_role('62000000-0000-4000-8000-000000000001',array['principal']) then
    raise exception 'Probe principal role was not active';
  end if;
  if not public.has_org_permission('62000000-0000-4000-8000-000000000001','organization.members.update')
     or not public.has_org_permission('62000000-0000-4000-8000-000000000001','organization.members.invite') then
    raise exception 'Probe principal lacks the expected member permissions';
  end if;

  begin
    perform public.update_organization_member_role(
      '63000000-0000-4000-8000-000000000002','manager'
    );
    raise exception 'Privilege escalation: principal promoted a member to manager';
  exception when insufficient_privilege then
    get stacked diagnostics v_message = message_text;
    if v_message not like '%Institution principals may only assign Education roles%' then
      raise exception 'Unexpected manager-assignment denial: %', v_message;
    end if;
  end;

  begin
    perform 1 from public.create_organization_invitation(
      '62000000-0000-4000-8000-000000000001',
      'manager-denied-probe-20261128@example.test',
      'manager',
      7
    );
    raise exception 'Privilege escalation: principal created a manager invitation';
  exception when insufficient_privilege then
    get stacked diagnostics v_message = message_text;
    if v_message not like '%Institution principals may only invite Education roles%' then
      raise exception 'Unexpected manager-invitation denial: %', v_message;
    end if;
  end;

  perform public.update_organization_member_role(
    '63000000-0000-4000-8000-000000000002','teacher'
  );

  select invitation_id into v_invitation_id
  from public.create_organization_invitation(
    '62000000-0000-4000-8000-000000000001',
    'teacher-allowed-probe-20261128@example.test',
    'teacher',
    7
  );

  if v_invitation_id is null then
    raise exception 'Principal teacher invitation did not return an invitation id';
  end if;
end;
$principal$;

-- Verify affected rows with transaction-owner privileges, not authenticated RLS.
reset role;

do $principal_state$
declare v_member_role text;
begin
  select role into v_member_role
  from public.organization_members
  where id='63000000-0000-4000-8000-000000000002';

  if v_member_role <> 'teacher' then
    raise exception 'Principal should retain the ability to assign Education teacher role';
  end if;

  if exists (
    select 1 from public.invitations
    where organization_id='62000000-0000-4000-8000-000000000001'
      and lower(email::text)='manager-denied-probe-20261128@example.test'
  ) then
    raise exception 'Rejected manager invitation left an invitation row';
  end if;

  if not exists (
    select 1 from public.invitations
    where organization_id='62000000-0000-4000-8000-000000000001'
      and lower(email::text)='teacher-allowed-probe-20261128@example.test'
      and role='teacher'
  ) then
    raise exception 'Principal should retain the ability to invite Education teacher role';
  end if;
end;
$principal_state$;

-- Re-enter authenticated role for a separate owner positive-control probe.
set local role authenticated;
select set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"61000000-0000-4000-8000-000000000003","role":"authenticated"}',true);

do $owner$
declare v_invitation_id uuid;
begin
  perform public.update_organization_member_role(
    '63000000-0000-4000-8000-000000000002','manager'
  );

  select invitation_id into v_invitation_id
  from public.create_organization_invitation(
    '62000000-0000-4000-8000-000000000001',
    'manager-allowed-probe-20261128@example.test',
    'manager',
    7
  );

  if v_invitation_id is null then
    raise exception 'Owner manager invitation did not return an invitation id';
  end if;

  perform set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000002',true);
  perform set_config('request.jwt.claims','{"sub":"61000000-0000-4000-8000-000000000002","role":"authenticated"}',true);

  if not public.has_org_permission('62000000-0000-4000-8000-000000000001','business.inventory.manage')
     or not public.has_org_permission('62000000-0000-4000-8000-000000000001','teams.manage') then
    raise exception 'Owner-assigned manager should retain the manager permission set';
  end if;
end;
$owner$;

reset role;

do $owner_state$
declare v_member_role text;
begin
  select role into v_member_role
  from public.organization_members
  where id='63000000-0000-4000-8000-000000000002';

  if v_member_role <> 'manager' then
    raise exception 'Owner should retain the ability to assign manager role';
  end if;

  if not exists (
    select 1 from public.invitations
    where organization_id='62000000-0000-4000-8000-000000000001'
      and lower(email::text)='manager-allowed-probe-20261128@example.test'
      and role='manager'
  ) then
    raise exception 'Owner should retain the ability to invite manager role';
  end if;
end;
$owner_state$;

select 'dynamic education principal role-boundary behavior: PASS' as assertion;
rollback;
