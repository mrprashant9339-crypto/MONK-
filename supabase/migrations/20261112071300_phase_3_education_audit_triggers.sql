-- Maintain timestamps and append audit events for education data mutations.
create or replace function public.education_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

create or replace function public.education_audit_row()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  before_row jsonb;
  after_row jsonb;
  row_data jsonb;
  org_id uuid;
begin
  if tg_op = 'INSERT' then
    after_row := to_jsonb(new);
    row_data := after_row;
  elsif tg_op = 'UPDATE' then
    before_row := to_jsonb(old);
    after_row := to_jsonb(new);
    row_data := after_row;
  else
    before_row := to_jsonb(old);
    row_data := before_row;
  end if;

  org_id := (row_data ->> 'organization_id')::uuid;
  perform public.record_audit(
    org_id,
    'education.' || tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    row_data ->> 'id',
    before_row,
    after_row,
    null,
    false
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

drop trigger if exists education_institutions_set_updated_at on public.education_institutions;
create trigger education_institutions_set_updated_at before update on public.education_institutions
for each row execute function public.education_set_updated_at();
drop trigger if exists education_institutions_audit on public.education_institutions;
create trigger education_institutions_audit after insert or update or delete on public.education_institutions
for each row execute function public.education_audit_row();

drop trigger if exists education_campuses_set_updated_at on public.education_campuses;
create trigger education_campuses_set_updated_at before update on public.education_campuses
for each row execute function public.education_set_updated_at();
drop trigger if exists education_campuses_audit on public.education_campuses;
create trigger education_campuses_audit after insert or update or delete on public.education_campuses
for each row execute function public.education_audit_row();

drop trigger if exists education_departments_set_updated_at on public.education_departments;
create trigger education_departments_set_updated_at before update on public.education_departments
for each row execute function public.education_set_updated_at();
drop trigger if exists education_departments_audit on public.education_departments;
create trigger education_departments_audit after insert or update or delete on public.education_departments
for each row execute function public.education_audit_row();

drop trigger if exists education_academic_years_set_updated_at on public.education_academic_years;
create trigger education_academic_years_set_updated_at before update on public.education_academic_years
for each row execute function public.education_set_updated_at();
drop trigger if exists education_academic_years_audit on public.education_academic_years;
create trigger education_academic_years_audit after insert or update or delete on public.education_academic_years
for each row execute function public.education_audit_row();

drop trigger if exists education_programs_set_updated_at on public.education_programs;
create trigger education_programs_set_updated_at before update on public.education_programs
for each row execute function public.education_set_updated_at();
drop trigger if exists education_programs_audit on public.education_programs;
create trigger education_programs_audit after insert or update or delete on public.education_programs
for each row execute function public.education_audit_row();

drop trigger if exists education_batches_set_updated_at on public.education_batches;
create trigger education_batches_set_updated_at before update on public.education_batches
for each row execute function public.education_set_updated_at();
drop trigger if exists education_batches_audit on public.education_batches;
create trigger education_batches_audit after insert or update or delete on public.education_batches
for each row execute function public.education_audit_row();

drop trigger if exists education_students_set_updated_at on public.education_students;
create trigger education_students_set_updated_at before update on public.education_students
for each row execute function public.education_set_updated_at();
drop trigger if exists education_students_audit on public.education_students;
create trigger education_students_audit after insert or update or delete on public.education_students
for each row execute function public.education_audit_row();

drop trigger if exists education_faculty_set_updated_at on public.education_faculty;
create trigger education_faculty_set_updated_at before update on public.education_faculty
for each row execute function public.education_set_updated_at();
drop trigger if exists education_faculty_audit on public.education_faculty;
create trigger education_faculty_audit after insert or update or delete on public.education_faculty
for each row execute function public.education_audit_row();

drop trigger if exists education_subjects_set_updated_at on public.education_subjects;
create trigger education_subjects_set_updated_at before update on public.education_subjects
for each row execute function public.education_set_updated_at();
drop trigger if exists education_subjects_audit on public.education_subjects;
create trigger education_subjects_audit after insert or update or delete on public.education_subjects
for each row execute function public.education_audit_row();

drop trigger if exists education_enrollments_set_updated_at on public.education_enrollments;
create trigger education_enrollments_set_updated_at before update on public.education_enrollments
for each row execute function public.education_set_updated_at();
drop trigger if exists education_enrollments_audit on public.education_enrollments;
create trigger education_enrollments_audit after insert or update or delete on public.education_enrollments
for each row execute function public.education_audit_row();

drop trigger if exists education_timetable_entries_set_updated_at on public.education_timetable_entries;
create trigger education_timetable_entries_set_updated_at before update on public.education_timetable_entries
for each row execute function public.education_set_updated_at();
drop trigger if exists education_timetable_entries_audit on public.education_timetable_entries;
create trigger education_timetable_entries_audit after insert or update or delete on public.education_timetable_entries
for each row execute function public.education_audit_row();

drop trigger if exists education_attendance_sessions_set_updated_at on public.education_attendance_sessions;
create trigger education_attendance_sessions_set_updated_at before update on public.education_attendance_sessions
for each row execute function public.education_set_updated_at();
drop trigger if exists education_attendance_sessions_audit on public.education_attendance_sessions;
create trigger education_attendance_sessions_audit after insert or update or delete on public.education_attendance_sessions
for each row execute function public.education_audit_row();

drop trigger if exists education_attendance_records_set_updated_at on public.education_attendance_records;
create trigger education_attendance_records_set_updated_at before update on public.education_attendance_records
for each row execute function public.education_set_updated_at();
drop trigger if exists education_attendance_records_audit on public.education_attendance_records;
create trigger education_attendance_records_audit after insert or update or delete on public.education_attendance_records
for each row execute function public.education_audit_row();

