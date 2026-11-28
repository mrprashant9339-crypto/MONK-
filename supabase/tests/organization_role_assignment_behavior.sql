-- Reproducible rollback-only staging test for assign_organization_member_role.
-- Creates synthetic auth users and one Business organization inside a transaction.
-- No test user, organization or membership survives the final ROLLBACK.

begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous, is_sso_user
) values
('81000000-0000-4000-8000-000000000001','authenticated','authenticated','audit-admin-probe-20261128@example.test','',now(),'{}','{}',now(),now(),false,false),
('81000000-0000-4000-8000-000000000002','authenticated','authenticated','audit-owner-probe-20261128@example.test','',now(),'{}','{}',now(),now(),false,false),
('81000000-0000-4000-8000-000000000003','authenticated','authenticated','audit-member-probe-20261128@example.test','',now(),'{}','{}',now(),now(),false,false),
('81000000-0000-4000-8000-000000000004','authenticated','authenticated','audit-targetadmin-probe-20261128@example.test','',now(),'{}','{}',now(),now(),false,false),
('81000000-0000-4000-8000-000000000005','authenticated','authenticated','audit-targetowner-probe-20261128@example.test','',now(),'{}','{}',now(),now(),false,false);

insert into public.organizations (id,name,slug,vertical)
values ('82000000-0000-4000-8000-000000000001','Audit Role Probe','audit-role-probe-20261128','business');

insert into public.organization_members (id,organization_id,user_id,role,status) values
('83000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','admin','active'),
('83000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000002','owner','active'),
('83000000-0000-4000-8000-000000000003','82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000003','contributor','active'),
('83000000-0000-4000-8000-000000000004','82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000004','admin','active'),
('83000000-0000-4000-8000-000000000005','82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000005','owner','active');

set local role authenticated;

select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

do $test$
declare v_message text;
begin
  if auth.uid() <> '81000000-0000-4000-8000-000000000001'::uuid then
    raise exception 'JWT subject was not installed correctly for admin probe';
  end if;

  begin
    perform public.assign_organization_member_role('82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000003','owner',null);
    raise exception 'Privilege escalation: admin assigned owner';
  exception when insufficient_privilege then
    get stacked diagnostics v_message = message_text;
    if v_message not like '%Owner assignment requires%' then raise exception 'Unexpected owner denial: %', v_message; end if;
  end;

  begin
    perform public.assign_organization_member_role('82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000003','admin',null);
    raise exception 'Privilege escalation: admin promoted member to admin';
  exception when insufficient_privilege then
    get stacked diagnostics v_message = message_text;
    if v_message not like '%Only the owner can assign administrator role%' then raise exception 'Unexpected admin-promotion denial: %', v_message; end if;
  end;

  begin
    perform public.assign_organization_member_role('82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000004','contributor',null);
    raise exception 'Privilege escalation: admin changed another administrator';
  exception when insufficient_privilege then
    get stacked diagnostics v_message = message_text;
    if v_message not like '%Only the owner can change an administrator role%' then raise exception 'Unexpected existing-admin denial: %', v_message; end if;
  end;

  begin
    perform public.assign_organization_member_role('82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000005','contributor',null);
    raise exception 'Privilege escalation: admin changed an owner';
  exception when insufficient_privilege then
    get stacked diagnostics v_message = message_text;
    if v_message not like '%organization owner role cannot be changed%' then raise exception 'Unexpected owner-member denial: %', v_message; end if;
  end;

  begin
    perform public.assign_organization_member_role('82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','auditor',null);
    raise exception 'Privilege escalation: admin changed own role';
  exception when insufficient_privilege then
    get stacked diagnostics v_message = message_text;
    if v_message not like '%You cannot change your own role%' then raise exception 'Unexpected self-change denial: %', v_message; end if;
  end;

  begin
    perform public.assign_organization_member_role('82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000003','teacher',null);
    raise exception 'Privilege escalation: Business workspace accepted a teacher role';
  exception when invalid_parameter_value then
    get stacked diagnostics v_message = message_text;
    if v_message not like '%Education roles require an Education workspace%' then raise exception 'Unexpected Education-role denial: %', v_message; end if;
  end;
end;
$test$;

select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000002","role":"authenticated"}',true);

do $test$
declare v_role text; v_message text;
begin
  if auth.uid() <> '81000000-0000-4000-8000-000000000002'::uuid then
    raise exception 'JWT subject was not switched correctly for owner probe';
  end if;

  perform public.assign_organization_member_role('82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000003','admin',null);
  select role into v_role from public.organization_members where id='83000000-0000-4000-8000-000000000003';
  if v_role <> 'admin' then raise exception 'Owner could not assign admin role'; end if;

  begin
    perform public.assign_organization_member_role('82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000003','owner',null);
    raise exception 'Owner assignment must remain reserved for ownership transfer';
  exception when insufficient_privilege then
    get stacked diagnostics v_message = message_text;
    if v_message not like '%Owner assignment requires%' then raise exception 'Unexpected owner-protection response: %', v_message; end if;
  end;

  begin
    perform public.assign_organization_member_role('82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000005','contributor',null);
    raise exception 'Existing owner must remain immutable';
  exception when insufficient_privilege then
    get stacked diagnostics v_message = message_text;
    if v_message not like '%organization owner role cannot be changed%' then raise exception 'Unexpected existing-owner response: %', v_message; end if;
  end;
end;
$test$;

select 'dynamic organization role-assignment behavior: PASS' as assertion;
rollback;
