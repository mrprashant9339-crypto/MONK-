-- Transactional student admission and cross-record academic integrity guards.
create or replace function public.admit_education_student(
  admission_number text,
  full_name text,
  student_email text default null,
  student_phone text default null,
  guardian_name text default null,
  guardian_phone text default null,
  target_batch_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  org_id uuid := public.current_organization_id();
  academic_year uuid;
  new_student_id uuid;
begin
  if auth.uid() is null or org_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if not public.has_org_permission(org_id,'education.student.manage') then
    raise exception 'Permission denied' using errcode='42501';
  end if;
  if target_batch_id is not null then
    select academic_year_id into academic_year
      from public.education_batches
     where id=target_batch_id and organization_id=org_id and status='active';
    if academic_year is null then
      raise exception 'Active batch not found in this organization' using errcode='P0002';
    end if;
  end if;

  insert into public.education_students(
    organization_id,admission_number,full_name,email,phone,guardian_name,guardian_phone,batch_id
  ) values (
    org_id,upper(trim(admission_number)),trim(full_name),nullif(trim(student_email),''),
    nullif(trim(student_phone),''),nullif(trim(guardian_name),''),nullif(trim(guardian_phone),''),target_batch_id
  ) returning id into new_student_id;

  if target_batch_id is not null then
    insert into public.education_enrollments(organization_id,student_id,batch_id,academic_year_id,status)
    values(org_id,new_student_id,target_batch_id,academic_year,'active');
  end if;

  return new_student_id;
end;
$function$;
revoke all on function public.admit_education_student(text,text,text,text,text,text,uuid) from public,anon;
grant execute on function public.admit_education_student(text,text,text,text,text,text,uuid) to authenticated;

create or replace function public.education_validate_timetable()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  batch_program uuid;
  subject_program uuid;
  faculty_active boolean;
begin
  select program_id into batch_program from public.education_batches
   where id=new.batch_id and organization_id=new.organization_id and status='active';
  select program_id into subject_program from public.education_subjects
   where id=new.subject_id and organization_id=new.organization_id and is_active;
  select employment_status='active' into faculty_active from public.education_faculty
   where id=new.faculty_id and organization_id=new.organization_id;
  if batch_program is null or subject_program is null or batch_program <> subject_program then
    raise exception 'Subject must belong to the selected batch programme' using errcode='23514';
  end if;
  if faculty_active is distinct from true then
    raise exception 'Faculty must be active in this organization' using errcode='23514';
  end if;
  if exists (
    select 1 from public.education_timetable_entries t
     where t.organization_id=new.organization_id
       and t.weekday=new.weekday
       and (t.batch_id=new.batch_id or t.faculty_id=new.faculty_id)
       and t.id is distinct from new.id
       and new.starts_at < t.ends_at and new.ends_at > t.starts_at
       and daterange(coalesce(new.valid_from,'-infinity'::date),coalesce(new.valid_until,'infinity'::date),'[]')
           && daterange(coalesce(t.valid_from,'-infinity'::date),coalesce(t.valid_until,'infinity'::date),'[]')
  ) then
    raise exception 'Timetable conflict: batch or faculty already has an overlapping slot' using errcode='23P01';
  end if;
  return new;
end;
$function$;

create or replace function public.education_validate_attendance_session()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  batch_program uuid;
  subject_program uuid;
  faculty_active boolean;
begin
  select program_id into batch_program from public.education_batches
   where id=new.batch_id and organization_id=new.organization_id and status='active';
  select program_id into subject_program from public.education_subjects
   where id=new.subject_id and organization_id=new.organization_id and is_active;
  select employment_status='active' into faculty_active from public.education_faculty
   where id=new.faculty_id and organization_id=new.organization_id;
  if batch_program is null or subject_program is null or batch_program <> subject_program then
    raise exception 'Subject must belong to the selected batch programme' using errcode='23514';
  end if;
  if faculty_active is distinct from true then
    raise exception 'Faculty must be active in this organization' using errcode='23514';
  end if;
  return new;
end;
$function$;

create or replace function public.education_validate_attendance_record()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
begin
  if not exists (
    select 1
      from public.education_attendance_sessions s
      join public.education_students st
        on st.id=new.student_id and st.organization_id=new.organization_id
     where s.id=new.session_id and s.organization_id=new.organization_id
       and (
         st.batch_id=s.batch_id
         or exists (
           select 1 from public.education_enrollments e
            where e.organization_id=new.organization_id
              and e.student_id=st.id and e.batch_id=s.batch_id and e.status='active'
         )
       )
  ) then
    raise exception 'Student must be enrolled in the attendance session batch' using errcode='23514';
  end if;
  return new;
end;
$function$;

drop trigger if exists education_timetable_validate on public.education_timetable_entries;
create trigger education_timetable_validate before insert or update on public.education_timetable_entries
for each row execute function public.education_validate_timetable();
drop trigger if exists education_attendance_session_validate on public.education_attendance_sessions;
create trigger education_attendance_session_validate before insert or update on public.education_attendance_sessions
for each row execute function public.education_validate_attendance_session();
drop trigger if exists education_attendance_record_validate on public.education_attendance_records;
create trigger education_attendance_record_validate before insert or update on public.education_attendance_records
for each row execute function public.education_validate_attendance_record();

revoke all on function public.education_validate_timetable() from public,anon;
revoke all on function public.education_validate_attendance_session() from public,anon;
revoke all on function public.education_validate_attendance_record() from public,anon;
