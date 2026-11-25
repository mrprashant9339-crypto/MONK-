-- Rollback-safe invitation/role acceptance regression test.
begin;
do $seed$
declare
  u_student uuid := '00000000-0000-4000-8000-0000000000a1';
  u_owner uuid := '00000000-0000-4000-8000-0000000000b2';
  u_unverified uuid := '00000000-0000-4000-8000-0000000000c3';
  u_other uuid := '00000000-0000-4000-8000-0000000000d6';
  edu_org uuid := '00000000-0000-4000-8000-0000000000d4';
  biz_org uuid := '00000000-0000-4000-8000-0000000000e5';
begin
  insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous)
  values
    (u_student,'authenticated','authenticated','monk-rls-student@invalid.example','',now(),'{}','{}',now(),now(),false,false),
    (u_owner,'authenticated','authenticated','monk-rls-owner@invalid.example','',now(),'{}','{}',now(),now(),false,false),
    (u_unverified,'authenticated','authenticated','monk-rls-unverified@invalid.example','',null,'{}','{}',now(),now(),false,false),
    (u_other,'authenticated','authenticated','monk-rls-other@invalid.example','',now(),'{}','{}',now(),now(),false,false);
  insert into public.organizations(id,name,slug,vertical)
  values (edu_org,'RLS Education Test','monk-rls-edu','education'),
         (biz_org,'RLS Business Test','monk-rls-biz','business');
  insert into public.organization_members(organization_id,user_id,role,status)
  values (edu_org,u_owner,'owner','active'),(biz_org,u_owner,'owner','active');
end
$seed$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated","aud":"authenticated","email":"monk-rls-owner@invalid.example"}',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000b2',true);
set local role authenticated;

do $assert$
declare
  u_student uuid := '00000000-0000-4000-8000-0000000000a1';
  u_owner uuid := '00000000-0000-4000-8000-0000000000b2';
  u_unverified uuid := '00000000-0000-4000-8000-0000000000c3';
  edu_org uuid := '00000000-0000-4000-8000-0000000000d4';
  biz_org uuid := '00000000-0000-4000-8000-0000000000e5';
  token text;
  accepted_org uuid;
  blocked boolean;
begin
  select invitation_token into token
  from public.create_organization_invitation(edu_org,'monk-rls-student@invalid.example','teacher',7);
  if token is null or length(token) <> 64 then raise exception 'FAIL: secure invitation token creation'; end if;

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","aud":"authenticated","email":"monk-rls-student@invalid.example"}',true);
  perform set_config('request.jwt.claim.sub',u_student::text,true);
  accepted_org := public.accept_organization_invitation(token);
  if accepted_org <> edu_org then raise exception 'FAIL: invitation accepted into wrong organization'; end if;
  if not exists(select 1 from public.organization_members where organization_id=edu_org and user_id=u_student and role='teacher' and status='active') then
    raise exception 'FAIL: teacher role membership not provisioned';
  end if;
  blocked := false;
  begin
    perform public.accept_organization_invitation(token);
  exception when invalid_parameter_value then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: invitation token reuse'; end if;

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated","aud":"authenticated","email":"monk-rls-owner@invalid.example"}',true);
  perform set_config('request.jwt.claim.sub',u_owner::text,true);
  select invitation_token into token
  from public.create_organization_invitation(edu_org,'monk-rls-other@invalid.example','student',7);
  blocked := false;
  begin
    perform public.accept_organization_invitation(token);
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: mismatched invitation email'; end if;

  select invitation_token into token
  from public.create_organization_invitation(edu_org,'monk-rls-unverified@invalid.example','student',7);
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated","aud":"authenticated","email":"monk-rls-unverified@invalid.example"}',true);
  perform set_config('request.jwt.claim.sub',u_unverified::text,true);
  blocked := false;
  begin
    perform public.accept_organization_invitation(token);
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: unverified email accepted invitation'; end if;

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated","aud":"authenticated","email":"monk-rls-owner@invalid.example"}',true);
  perform set_config('request.jwt.claim.sub',u_owner::text,true);
  blocked := false;
  begin
    perform * from public.create_organization_invitation(biz_org,'monk-rls-other@invalid.example','student',7);
  exception when invalid_parameter_value then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: Business workspace accepted Campus student role'; end if;
end
$assert$;
reset role;
rollback;
