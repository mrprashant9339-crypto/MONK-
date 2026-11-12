-- Phase 3 education schema and access-boundary regression assertions.
do $test$
declare t text;
begin
  foreach t in array array['education_institutions','education_campuses','education_departments','education_academic_years','education_programs','education_batches','education_students','education_faculty','education_subjects','education_enrollments','education_timetable_entries','education_attendance_sessions','education_attendance_records'] loop
    if to_regclass('public.' || t) is null then
      raise exception 'Missing education table: %',t;
    end if;
    if not (select relrowsecurity from pg_class where oid=to_regclass('public.' || t)) then
      raise exception 'RLS is disabled on %',t;
    end if;
    if has_table_privilege('anon','public.' || t,'SELECT')
       or has_table_privilege('anon','public.' || t,'INSERT')
       or has_table_privilege('anon','public.' || t,'UPDATE')
       or has_table_privilege('anon','public.' || t,'DELETE') then
      raise exception 'Anonymous table privileges remain on %',t;
    end if;
    if not has_table_privilege('authenticated','public.' || t,'SELECT') then
      raise exception 'Authenticated SELECT missing on %',t;
    end if;
    if (select count(*) from pg_policies where schemaname='public' and tablename=t) < 3 then
      raise exception 'Expected scoped RLS policies are missing on %',t;
    end if;
    if (select count(*) from pg_policies where schemaname='public' and tablename=t
        and (coalesce(qual,'') || coalesce(with_check,'')) ilike '%vertical%') = 0 then
      raise exception 'Education vertical guard missing on %',t;
    end if;
    if not exists(select 1 from pg_trigger where tgrelid=to_regclass('public.' || t) and not tgisinternal and tgname=t || '_audit') then
      raise exception 'Audit trigger missing on %',t;
    end if;
  end loop;


  -- Phase 3 operations and role model.
  foreach t in array array['education_guardians','education_student_guardians','education_admission_applications','education_documents','education_exams','education_exam_subjects','education_results'] loop
    if to_regclass('public.' || t) is null then raise exception 'Missing education operations table: %',t; end if;
    if not (select relrowsecurity from pg_class where oid=to_regclass('public.' || t)) then raise exception 'RLS is disabled on %',t; end if;
    if has_table_privilege('anon','public.' || t,'SELECT') or has_table_privilege('anon','public.' || t,'INSERT') or has_table_privilege('anon','public.' || t,'UPDATE') or has_table_privilege('anon','public.' || t,'DELETE') then
      raise exception 'Anonymous table privileges remain on %',t;
    end if;
    if not has_table_privilege('authenticated','public.' || t,'SELECT') then raise exception 'Authenticated SELECT missing on %',t; end if;
    if (select count(*) from pg_policies where schemaname='public' and tablename=t) < 2 then
      raise exception 'Education operations RLS policies are missing on %',t;
    end if;
  end loop;

  if not exists(select 1 from public.roles where id='principal') or
     not exists(select 1 from public.roles where id='hod') or
     not exists(select 1 from public.roles where id='teacher') or
     not exists(select 1 from public.roles where id='student') or
     not exists(select 1 from public.roles where id='parent') then
    raise exception 'Education-specific role catalog is incomplete';
  end if;
  if not has_function_privilege('authenticated','public.education_convert_application(uuid,text,uuid)','EXECUTE') or
     has_function_privilege('anon','public.education_convert_application(uuid,text,uuid)','EXECUTE') then
    raise exception 'Admission conversion RPC ACL is invalid';
  end if;
  if not has_function_privilege('authenticated','public.education_publish_exam(uuid)','EXECUTE') or
     has_function_privilege('anon','public.education_publish_exam(uuid)','EXECUTE') then
    raise exception 'Exam publication RPC ACL is invalid';
  end if;
  if (select prosecdef from pg_proc where oid='public.education_convert_application(uuid,text,uuid)'::regprocedure) or
     (select prosecdef from pg_proc where oid='public.education_publish_exam(uuid)'::regprocedure) then
    raise exception 'Education workflow RPCs must remain SECURITY INVOKER';
  end if;
  if not exists(select 1 from storage.buckets where id='education-private' and public=false) then
    raise exception 'Private education storage bucket is missing';
  end if;
  if has_table_privilege('authenticated','public.education_students','UPDATE') then
    raise exception 'Student self-claim must not grant unrestricted row updates';
  end if;
  if not has_column_privilege('authenticated','public.education_students','user_id','UPDATE') then
    raise exception 'Student self-claim column privilege is missing';
  end if;
  if not has_column_privilege('authenticated','public.education_faculty','member_id','UPDATE') then
    raise exception 'Faculty self-link column privilege is missing';
  end if;
  if not has_column_privilege('authenticated','public.education_guardians','user_id','UPDATE') then
    raise exception 'Guardian self-link column privilege is missing';
  end if;

  if not has_function_privilege('authenticated','public.admit_education_student(text,text,text,text,text,text,uuid)','EXECUTE') then
    raise exception 'Authenticated admission RPC execution is missing';
  end if;
  if has_function_privilege('anon','public.admit_education_student(text,text,text,text,text,text,uuid)','EXECUTE') then
    raise exception 'Anonymous admission RPC execution must be revoked';
  end if;
  if (select prosecdef from pg_proc where oid='public.admit_education_student(text,text,text,text,text,text,uuid)'::regprocedure) then
    raise exception 'Admission RPC must remain SECURITY INVOKER';
  end if;
  if not exists(select 1 from pg_trigger where tgrelid='public.education_students'::regclass and tgname='education_student_enrollment_sync' and not tgisinternal) then
    raise exception 'Student enrollment synchronization trigger is missing';
  end if;
  if not exists(select 1 from pg_trigger where tgrelid='public.education_timetable_entries'::regclass and tgname='education_timetable_validate' and not tgisinternal) then
    raise exception 'Timetable integrity trigger is missing';
  end if;
  if not exists(select 1 from pg_trigger where tgrelid='public.education_attendance_sessions'::regclass and tgname='education_attendance_session_validate' and not tgisinternal) then
    raise exception 'Attendance session integrity trigger is missing';
  end if;
  if not exists(select 1 from pg_trigger where tgrelid='public.education_attendance_records'::regclass and tgname='education_attendance_record_validate' and not tgisinternal) then
    raise exception 'Attendance roster integrity trigger is missing';
  end if;

  if (select count(*) from public.permissions where id like 'education.%') <> 26 then
    raise exception 'Expected 26 education permission keys';
  end if;
  if (select count(*) from pg_trigger where tgname like 'education\_%\_audit' escape '\' and not tgisinternal ) <> 20 then
    raise exception 'Expected 20 education audit triggers';
  end if;

  -- Final completion checks: marks integrity, programme-wide teacher access, reports and extension placement.
  if not exists(select 1 from pg_trigger where tgrelid='public.education_results'::regclass and tgname='education_result_validate' and not tgisinternal) then
    raise exception 'Examination result marks validation trigger is missing';
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='education_exams' and policyname='education_exams_teacher_read') then
    raise exception 'Teacher exam visibility policy is missing';
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='education_results' and policyname='education_results_teacher_manage') then
    raise exception 'Teacher assigned-subject marks policy is missing';
  end if;
  if not exists(select 1 from pg_class where oid='public.education_attendance_summary'::regclass and reloptions @> array['security_invoker=true']) or
     not exists(select 1 from pg_class where oid='public.education_results_summary'::regclass and reloptions @> array['security_invoker=true']) then
    raise exception 'Education report views must use invoker security';
  end if;
  if has_table_privilege('anon','public.education_attendance_summary','SELECT') or
     has_table_privilege('anon','public.education_results_summary','SELECT') then
    raise exception 'Anonymous access to education report views must be revoked';
  end if;
  if not has_table_privilege('authenticated','public.education_attendance_summary','SELECT') or
     not has_table_privilege('authenticated','public.education_results_summary','SELECT') then
    raise exception 'Authenticated access to education report views is missing';
  end if;
  if not exists(select 1 from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='citext' and n.nspname='extensions') then
    raise exception 'citext extension must not be installed in public schema';
  end if;
end;
$test$;
