-- Rollback-safe self-provisioning regression test.
-- Confirms that verified Business owners can create their own workspace, while
-- Campus institutions and student accounts cannot self-provision.
begin;
do $test$
declare
  u_owner uuid := '00000000-0000-4000-8000-0000000000a1';
  u_student uuid := '00000000-0000-4000-8000-0000000000b2';
  u_institution uuid := '00000000-0000-4000-8000-0000000000c3';
  created public.organizations;
  blocked boolean;
begin
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u_owner::text,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',u_owner::text,true);
  insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous)
  values (u_owner,'authenticated','authenticated','monk-provision-owner@invalid.example','',now(),'{}','{"accepted_legal":true,"terms_version":"2026-11-22","privacy_version":"2026-11-22","vertical":"business","intended_role":"owner","full_name":"MONK Test Owner"}',now(),now(),false,false);

  perform set_config('request.jwt.claims',jsonb_build_object('sub',u_student::text,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',u_student::text,true);
  insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous)
  values (u_student,'authenticated','authenticated','monk-provision-student@invalid.example','',now(),'{}','{"accepted_legal":true,"terms_version":"2026-11-22","privacy_version":"2026-11-22","vertical":"education","intended_role":"student","full_name":"MONK Test Student"}',now(),now(),false,false);

  perform set_config('request.jwt.claims',jsonb_build_object('sub',u_institution::text,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',u_institution::text,true);
  insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous)
  values (u_institution,'authenticated','authenticated','monk-provision-institution@invalid.example','',now(),'{}','{"accepted_legal":true,"terms_version":"2026-11-22","privacy_version":"2026-11-22","vertical":"education","intended_role":"institution","full_name":"MONK Test Institution"}',now(),now(),false,false);

  perform set_config('request.jwt.claims',jsonb_build_object('sub',u_institution::text,'role','authenticated','aud','authenticated','user_metadata',jsonb_build_object('vertical','education','intended_role','institution'))::text,true);
  perform set_config('request.jwt.claim.sub',u_institution::text,true);
  blocked := false;
  begin
    perform public.create_organization('MONK Test Campus','monk-test-campus','IN','Asia/Kolkata','INR','en-IN','Education','education');
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: Campus workspace self-provisioning was allowed'; end if;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',u_student::text,'role','authenticated','aud','authenticated','user_metadata',jsonb_build_object('vertical','education','intended_role','student'))::text,true);
  perform set_config('request.jwt.claim.sub',u_student::text,true);
  blocked := false;
  begin
    perform public.create_organization('MONK Student Business','monk-student-business','IN','Asia/Kolkata','INR','en-IN','Education','business');
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: Student role self-created a Business workspace'; end if;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',u_owner::text,'role','authenticated','aud','authenticated','user_metadata',jsonb_build_object('vertical','business','intended_role','owner'))::text,true);
  perform set_config('request.jwt.claim.sub',u_owner::text,true);
  select * into created from public.create_organization('MONK Verified Test Business','monk-test-business','IN','Asia/Kolkata','INR','en-IN','Professional services','business');
  if created.id is null then raise exception 'FAIL: Business owner workspace creation'; end if;
  if not exists(select 1 from public.organization_members where organization_id=created.id and user_id=u_owner and role='owner' and status='active') then
    raise exception 'FAIL: Business owner membership';
  end if;
end
$test$;
rollback;
