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

  if (select count(*) from public.permissions where id like 'education.%') <> 16 then
    raise exception 'Expected 16 education permission keys';
  end if;
  if (select count(*) from pg_trigger where tgname like 'education\_%\_audit' escape '\' and not tgisinternal) <> 13 then
    raise exception 'Expected 13 education audit triggers';
  end if;
end;
$test$;
