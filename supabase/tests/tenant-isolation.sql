-- Run against a non-production Supabase project or in a controlled SQL Editor session.
-- All test users, organizations, memberships, projects, tasks and invitations are
-- created inside this transaction and rolled back at the end.
begin;

do $seed$
declare
  u_a uuid := '00000000-0000-4000-8000-0000000000a1';
  u_b uuid := '00000000-0000-4000-8000-0000000000b2';
  org_a uuid := '00000000-0000-4000-8000-0000000000c3';
  org_b uuid := '00000000-0000-4000-8000-0000000000d4';
begin
  insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous)
  values
    (u_a,'authenticated','authenticated','monk-rls-a@invalid.example','',now(),'{}','{}',now(),now(),false,false),
    (u_b,'authenticated','authenticated','monk-rls-b@invalid.example','',now(),'{}','{}',now(),now(),false,false);
  insert into public.organizations(id,name,slug,vertical)
  values (org_a,'RLS Test Org A','monk-rls-test-a','business'),(org_b,'RLS Test Org B','monk-rls-test-b','business');
  insert into public.organization_members(organization_id,user_id,role,status)
  values (org_a,u_a,'owner','active'),(org_b,u_b,'owner','active');
  update public.user_settings set active_organization_id=org_a where user_id=u_a;
  update public.user_settings set active_organization_id=org_b where user_id=u_b;
  insert into public.projects(id,organization_id,name,code) values
    ('00000000-0000-4000-8000-0000000000e5',org_a,'RLS Project A','RLS-A'),
    ('00000000-0000-4000-8000-0000000000f6',org_b,'RLS Project B','RLS-B');
  insert into public.tasks(id,organization_id,project_id,title) values
    ('00000000-0000-4000-8000-0000000000a7',org_a,'00000000-0000-4000-8000-0000000000e5','RLS Task A'),
    ('00000000-0000-4000-8000-0000000000b8',org_b,'00000000-0000-4000-8000-0000000000f6','RLS Task B');
end
$seed$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","aud":"authenticated"}',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);
set local role authenticated;

do $assert$
declare
  org_b uuid := '00000000-0000-4000-8000-0000000000d4';
  project_b uuid := '00000000-0000-4000-8000-0000000000f6';
  blocked boolean := false;
begin
  if public.current_organization_id() <> '00000000-0000-4000-8000-0000000000c3'::uuid then raise exception 'FAIL: user A active tenant resolution'; end if;
  if (select count(*) from public.projects) <> 1 then raise exception 'FAIL: user A project visibility'; end if;
  if (select count(*) from public.projects where organization_id=org_b) <> 0 then raise exception 'FAIL: cross-tenant project read'; end if;
  if (select count(*) from public.tasks where organization_id=org_b) <> 0 then raise exception 'FAIL: cross-tenant task read'; end if;
  begin
    update public.projects set name='Unauthorized update' where id=project_b;
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: cross-tenant project update'; end if;
  blocked := false;
  begin
    insert into public.projects(organization_id,name,code) values(org_b,'Unauthorized Project','RLS-X');
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: cross-tenant project insert'; end if;

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated","aud":"authenticated"}',true);
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000b2',true);
  if public.current_organization_id() <> org_b then raise exception 'FAIL: user B active tenant resolution'; end if;
  if (select count(*) from public.projects) <> 1 then raise exception 'FAIL: user B project visibility'; end if;
  if (select count(*) from public.projects where organization_id='00000000-0000-4000-8000-0000000000c3') <> 0 then raise exception 'FAIL: user B can see user A project'; end if;
end
$assert$;

reset role;
rollback;
