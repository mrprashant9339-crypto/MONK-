-- Rollback-only JWT regression: invitation acceptance must stop before
-- creating/reactivating a membership when its organization is soft-deleted.

begin;

insert into auth.users(
  id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous,is_sso_user
) values(
  '91000000-0000-4000-8000-000000000001',
  'authenticated','authenticated','deleted-invite-accept-20261128@example.test','',now(),
  '{}','{}',now(),now(),false,false
);

insert into public.organizations(id,name,slug,vertical,created_at,deleted_at)
values(
  '92000000-0000-4000-8000-000000000001',
  'Deleted Invitation Acceptance Probe',
  'deleted-invitation-acceptance-probe-20261128',
  'business',now(),now()
);

insert into public.user_settings(user_id,active_organization_id)
values('91000000-0000-4000-8000-000000000001',null)
on conflict(user_id) do update
set active_organization_id=null,updated_at=now();

insert into public.invitations(
  id,organization_id,email,role,token_hash,invited_by,expires_at
) values(
  '93000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001',
  'deleted-invite-accept-20261128@example.test',
  'manager',
  encode(extensions.digest(repeat('b',64),'sha256'),'hex'),
  null,
  now()+interval '7 days'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

do $test$
declare v_message text;
begin
  begin
    perform public.accept_organization_invitation(repeat('b',64));
    raise exception 'Deleted organization invitation was unexpectedly accepted';
  exception when no_data_found then
    get stacked diagnostics v_message=message_text;
    if v_message not like '%Organization not found%' then
      raise exception 'Unexpected deleted-org invitation rejection: %',v_message;
    end if;
  end;
end;
$test$;

reset role;

do $state$
begin
  if exists(
    select 1 from public.organization_members
    where organization_id='92000000-0000-4000-8000-000000000001'
      and user_id='91000000-0000-4000-8000-000000000001'
      and status='active'
  ) then
    raise exception 'Rejected invitation left an active organization membership';
  end if;

  if not exists(
    select 1 from public.invitations
    where id='93000000-0000-4000-8000-000000000001'
      and accepted_at is null
      and revoked_at is null
  ) then
    raise exception 'Rejected invitation was consumed or revoked';
  end if;

  if exists(
    select 1 from public.user_settings
    where user_id='91000000-0000-4000-8000-000000000001'
      and active_organization_id='92000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Rejected invitation changed the active organization';
  end if;
end;
$state$;

select 'deleted organization invitation acceptance boundary: PASS' as assertion;
rollback;
