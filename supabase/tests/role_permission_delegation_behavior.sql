-- Rollback-only behavior test for custom-role permission delegation.
begin;

insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous,is_sso_user
) values
('a1000000-0000-4000-8000-000000000001','authenticated','authenticated','permission-owner-probe-20261128@example.test','',now(),'{}','{}',now(),now(),false,false),
('a1000000-0000-4000-8000-000000000002','authenticated','authenticated','permission-editor-probe-20261128@example.test','',now(),'{}','{}',now(),now(),false,false);

insert into public.organizations(id,name,slug,vertical)
values('a2000000-0000-4000-8000-000000000001','Permission Delegation Probe','permission-delegation-probe-20261128','business');

insert into public.organization_roles(id,organization_id,name,description,created_by)
values('a3000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','Delegated Role Manager','Probe role','a1000000-0000-4000-8000-000000000001');

insert into public.organization_members(id,organization_id,user_id,role,status,organization_role_id)
values
('a4000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','owner','active',null),
('a4000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','contributor','active','a3000000-0000-4000-8000-000000000001');

insert into public.organization_role_permissions(organization_id,organization_role_id,permission_id)
values('a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','organization.roles.manage');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);

do $test$
declare v_message text;
begin
  if not public.has_org_permission('a2000000-0000-4000-8000-000000000001','organization.roles.manage') then
    raise exception 'Delegated role manager should have organization.roles.manage';
  end if;

  if public.has_org_permission('a2000000-0000-4000-8000-000000000001','business.finance.manage') then
    raise exception 'Probe role must not start with finance permission';
  end if;

  begin
    perform public.set_organization_role_permissions(
      'a2000000-0000-4000-8000-000000000001',
      'a3000000-0000-4000-8000-000000000001',
      array['organization.roles.manage','business.finance.manage']
    );
    raise exception 'Privilege escalation: delegated role manager self-granted finance permission';
  exception when insufficient_privilege then
    get stacked diagnostics v_message=message_text;
    if v_message not like '%You may only delegate permissions that you currently hold%' then
      raise exception 'Unexpected delegation denial: %', v_message;
    end if;
  end;

  if public.has_org_permission('a2000000-0000-4000-8000-000000000001','business.finance.manage') then
    raise exception 'Finance permission remained after rejected delegation attempt';
  end if;
end;
$test$;

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

do $test$
declare v_message text; v_has_finance boolean;
begin
  if not public.has_org_permission('a2000000-0000-4000-8000-000000000001','organization.members.update') then
    raise exception 'Owner role should include organization.members.update after matrix repair';
  end if;

  perform public.set_organization_role_permissions(
    'a2000000-0000-4000-8000-000000000001',
    'a3000000-0000-4000-8000-000000000001',
    array['organization.roles.manage','business.finance.manage','organization.members.update']
  );

  select public.has_org_permission('a2000000-0000-4000-8000-000000000001','business.finance.manage')
  into v_has_finance;

  if not v_has_finance then
    raise exception 'Owner should be able to delegate a permission the owner holds';
  end if;
end;
$test$;

select 'dynamic permission-delegation behavior: PASS' as assertion;
rollback;
