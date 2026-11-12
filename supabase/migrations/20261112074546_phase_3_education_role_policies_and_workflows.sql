
-- Final education portal RLS and workflow RPCs. Re-runnable on an existing Phase 3 database.

-- Faculty account linking is bound to the authenticated email and teacher membership.
drop policy if exists education_faculty_claim_read on public.education_faculty;
create policy education_faculty_claim_read on public.education_faculty for select to authenticated
using(organization_id=public.current_organization_id() and member_id is null and lower(email::text)=lower(auth.jwt()->>'email') and exists(select 1 from public.organization_members om where om.organization_id=education_faculty.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher'));
drop policy if exists education_faculty_claim on public.education_faculty;
create policy education_faculty_claim on public.education_faculty for update to authenticated
using(organization_id=public.current_organization_id() and member_id is null and lower(email::text)=lower(auth.jwt()->>'email') and exists(select 1 from public.organization_members om where om.organization_id=education_faculty.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher'))
with check(organization_id=public.current_organization_id() and exists(select 1 from public.organization_members om where om.id=member_id and om.organization_id=education_faculty.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher'));

drop policy if exists education_students_teacher_read on public.education_students;
create policy education_students_teacher_read on public.education_students for select to authenticated
using(organization_id=public.current_organization_id() and batch_id is not null and exists(select 1 from public.education_timetable_entries te join public.education_faculty f on f.id=te.faculty_id and f.organization_id=te.organization_id where te.organization_id=education_students.organization_id and te.batch_id=education_students.batch_id and f.member_id in(select om.id from public.organization_members om where om.organization_id=education_students.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher')));
drop policy if exists education_departments_hod_read on public.education_departments;
create policy education_departments_hod_read on public.education_departments for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.organization_members om where om.organization_id=education_departments.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='hod' and om.id=education_departments.hod_member_id));
drop policy if exists education_departments_hod_update on public.education_departments;
create policy education_departments_hod_update on public.education_departments for update to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.organization_members om where om.organization_id=education_departments.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='hod' and om.id=education_departments.hod_member_id))
with check(organization_id=public.current_organization_id() and exists(select 1 from public.organization_members om where om.organization_id=education_departments.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='hod' and om.id=education_departments.hod_member_id));
drop policy if exists education_students_hod_read on public.education_students;
create policy education_students_hod_read on public.education_students for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_departments d join public.organization_members om on om.id=d.hod_member_id and om.organization_id=d.organization_id where d.id=education_students.department_id and d.organization_id=education_students.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='hod'));
drop policy if exists education_faculty_hod_read on public.education_faculty;
create policy education_faculty_hod_read on public.education_faculty for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_departments d join public.organization_members om on om.id=d.hod_member_id and om.organization_id=d.organization_id where d.id=education_faculty.department_id and d.organization_id=education_faculty.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='hod'));
drop policy if exists education_programs_hod_read on public.education_programs;
create policy education_programs_hod_read on public.education_programs for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_departments d join public.organization_members om on om.id=d.hod_member_id and om.organization_id=d.organization_id where d.id=education_programs.department_id and d.organization_id=education_programs.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='hod'));
drop policy if exists education_batches_hod_read on public.education_batches;
create policy education_batches_hod_read on public.education_batches for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_programs p join public.education_departments d on d.id=p.department_id and d.organization_id=p.organization_id join public.organization_members om on om.id=d.hod_member_id and om.organization_id=d.organization_id where p.id=education_batches.program_id and p.organization_id=education_batches.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='hod'));
drop policy if exists education_subjects_hod_read on public.education_subjects;
create policy education_subjects_hod_read on public.education_subjects for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_programs p join public.education_departments d on d.id=p.department_id and d.organization_id=p.organization_id join public.organization_members om on om.id=d.hod_member_id and om.organization_id=d.organization_id where p.id=education_subjects.program_id and p.organization_id=education_subjects.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='hod'));

drop policy if exists education_subjects_teacher_read on public.education_subjects;
create policy education_subjects_teacher_read on public.education_subjects for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_timetable_entries te join public.education_faculty f on f.id=te.faculty_id and f.organization_id=te.organization_id where te.organization_id=education_subjects.organization_id and te.subject_id=education_subjects.id and f.member_id in(select om.id from public.organization_members om where om.organization_id=te.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher')));
drop policy if exists education_programs_applicant_read on public.education_programs;
create policy education_programs_applicant_read on public.education_programs for select to authenticated
using(organization_id=public.current_organization_id() and is_active and public.has_org_role(organization_id,array['student']));
drop policy if exists education_programs_student_read on public.education_programs;
create policy education_programs_student_read on public.education_programs for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_students s join public.education_batches b on b.id=s.batch_id and b.organization_id=s.organization_id where s.organization_id=education_programs.organization_id and s.user_id=(select auth.uid()) and b.program_id=education_programs.id));
drop policy if exists education_batches_student_read on public.education_batches;
create policy education_batches_student_read on public.education_batches for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_students s where s.organization_id=education_batches.organization_id and s.batch_id=education_batches.id and s.user_id=(select auth.uid())));
drop policy if exists education_subjects_student_read on public.education_subjects;
create policy education_subjects_student_read on public.education_subjects for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_students s join public.education_batches b on b.id=s.batch_id and b.organization_id=s.organization_id where s.organization_id=education_subjects.organization_id and s.user_id=(select auth.uid()) and b.program_id=education_subjects.program_id));
drop policy if exists education_enrollments_student_read on public.education_enrollments;
create policy education_enrollments_student_read on public.education_enrollments for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_students s where s.id=education_enrollments.student_id and s.organization_id=education_enrollments.organization_id and s.user_id=(select auth.uid())));
drop policy if exists education_enrollments_parent_read on public.education_enrollments;
create policy education_enrollments_parent_read on public.education_enrollments for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_student_guardians sg join public.education_guardians g on g.id=sg.guardian_id and g.organization_id=sg.organization_id where sg.organization_id=education_enrollments.organization_id and sg.student_id=education_enrollments.student_id and g.user_id=(select auth.uid())));

drop policy if exists education_timetable_teacher_read on public.education_timetable_entries;
create policy education_timetable_teacher_read on public.education_timetable_entries for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_faculty f where f.id=education_timetable_entries.faculty_id and f.organization_id=education_timetable_entries.organization_id and f.member_id in(select om.id from public.organization_members om where om.organization_id=education_timetable_entries.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher')));
drop policy if exists education_timetable_student_read on public.education_timetable_entries;
create policy education_timetable_student_read on public.education_timetable_entries for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_students s where s.organization_id=education_timetable_entries.organization_id and s.user_id=(select auth.uid()) and s.batch_id=education_timetable_entries.batch_id));
drop policy if exists education_timetable_parent_read on public.education_timetable_entries;
create policy education_timetable_parent_read on public.education_timetable_entries for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_student_guardians sg join public.education_guardians g on g.id=sg.guardian_id and g.organization_id=sg.organization_id join public.education_students s on s.id=sg.student_id and s.organization_id=sg.organization_id where sg.organization_id=education_timetable_entries.organization_id and s.batch_id=education_timetable_entries.batch_id and g.user_id=(select auth.uid())));
drop policy if exists education_timetable_hod_manage on public.education_timetable_entries;
create policy education_timetable_hod_manage on public.education_timetable_entries for all to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_batches b join public.education_programs p on p.id=b.program_id and p.organization_id=b.organization_id join public.education_departments d on d.id=p.department_id and d.organization_id=p.organization_id join public.organization_members om on om.id=d.hod_member_id and om.organization_id=d.organization_id where b.id=education_timetable_entries.batch_id and b.organization_id=education_timetable_entries.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='hod'))
with check(organization_id=public.current_organization_id() and exists(select 1 from public.education_batches b join public.education_programs p on p.id=b.program_id and p.organization_id=b.organization_id join public.education_departments d on d.id=p.department_id and d.organization_id=p.organization_id join public.organization_members om on om.id=d.hod_member_id and om.organization_id=d.organization_id where b.id=education_timetable_entries.batch_id and b.organization_id=education_timetable_entries.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='hod'));

drop policy if exists education_attendance_sessions_teacher_read on public.education_attendance_sessions;
create policy education_attendance_sessions_teacher_read on public.education_attendance_sessions for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_faculty f where f.id=education_attendance_sessions.faculty_id and f.organization_id=education_attendance_sessions.organization_id and f.member_id in(select om.id from public.organization_members om where om.organization_id=education_attendance_sessions.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher')));
drop policy if exists education_attendance_sessions_student_read on public.education_attendance_sessions;
create policy education_attendance_sessions_student_read on public.education_attendance_sessions for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_students s where s.organization_id=education_attendance_sessions.organization_id and s.user_id=(select auth.uid()) and s.batch_id=education_attendance_sessions.batch_id));
drop policy if exists education_attendance_sessions_parent_read on public.education_attendance_sessions;
create policy education_attendance_sessions_parent_read on public.education_attendance_sessions for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_student_guardians sg join public.education_guardians g on g.id=sg.guardian_id and g.organization_id=sg.organization_id join public.education_students s on s.id=sg.student_id and s.organization_id=sg.organization_id where sg.organization_id=education_attendance_sessions.organization_id and s.batch_id=education_attendance_sessions.batch_id and g.user_id=(select auth.uid())));
drop policy if exists education_attendance_sessions_hod_manage on public.education_attendance_sessions;
create policy education_attendance_sessions_hod_manage on public.education_attendance_sessions for all to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_batches b join public.education_programs p on p.id=b.program_id and p.organization_id=b.organization_id join public.education_departments d on d.id=p.department_id and d.organization_id=p.organization_id join public.organization_members om on om.id=d.hod_member_id and om.organization_id=d.organization_id where b.id=education_attendance_sessions.batch_id and b.organization_id=education_attendance_sessions.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='hod'))
with check(organization_id=public.current_organization_id() and exists(select 1 from public.education_batches b join public.education_programs p on p.id=b.program_id and p.organization_id=b.organization_id join public.education_departments d on d.id=p.department_id and d.organization_id=p.organization_id join public.organization_members om on om.id=d.hod_member_id and om.organization_id=d.organization_id where b.id=education_attendance_sessions.batch_id and b.organization_id=education_attendance_sessions.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='hod'));
drop policy if exists education_attendance_records_student_read on public.education_attendance_records;
create policy education_attendance_records_student_read on public.education_attendance_records for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_students s where s.id=education_attendance_records.student_id and s.organization_id=education_attendance_records.organization_id and s.user_id=(select auth.uid())));
drop policy if exists education_attendance_records_parent_read on public.education_attendance_records;
create policy education_attendance_records_parent_read on public.education_attendance_records for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_student_guardians sg join public.education_guardians g on g.id=sg.guardian_id and g.organization_id=sg.organization_id where sg.organization_id=education_attendance_records.organization_id and sg.student_id=education_attendance_records.student_id and g.user_id=(select auth.uid())));
drop policy if exists education_attendance_records_teacher_manage on public.education_attendance_records;
create policy education_attendance_records_teacher_manage on public.education_attendance_records for all to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_attendance_sessions s join public.education_faculty f on f.id=s.faculty_id and f.organization_id=s.organization_id where s.id=education_attendance_records.session_id and s.organization_id=education_attendance_records.organization_id and f.member_id in(select om.id from public.organization_members om where om.organization_id=s.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher')))
with check(organization_id=public.current_organization_id() and exists(select 1 from public.education_attendance_sessions s join public.education_faculty f on f.id=s.faculty_id and f.organization_id=s.organization_id where s.id=education_attendance_records.session_id and s.organization_id=education_attendance_records.organization_id and f.member_id in(select om.id from public.organization_members om where om.organization_id=s.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher')));
drop policy if exists education_attendance_records_hod_manage on public.education_attendance_records;
create policy education_attendance_records_hod_manage on public.education_attendance_records for all to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_attendance_sessions s join public.education_batches b on b.id=s.batch_id and b.organization_id=s.organization_id join public.education_programs p on p.id=b.program_id and p.organization_id=b.organization_id join public.education_departments d on d.id=p.department_id and d.organization_id=p.organization_id join public.organization_members om on om.id=d.hod_member_id and om.organization_id=d.organization_id where s.id=education_attendance_records.session_id and s.organization_id=education_attendance_records.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='hod'))
with check(organization_id=public.current_organization_id() and exists(select 1 from public.education_attendance_sessions s join public.education_batches b on b.id=s.batch_id and b.organization_id=s.organization_id join public.education_programs p on p.id=b.program_id and p.organization_id=b.organization_id join public.education_departments d on d.id=p.department_id and d.organization_id=p.organization_id join public.organization_members om on om.id=d.hod_member_id and om.organization_id=d.organization_id where s.id=education_attendance_records.session_id and s.organization_id=education_attendance_records.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='hod'));

drop policy if exists education_exams_teacher_read on public.education_exams;
create policy education_exams_teacher_read on public.education_exams for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_timetable_entries te join public.education_faculty f on f.id=te.faculty_id and f.organization_id=te.organization_id where te.organization_id=education_exams.organization_id and te.batch_id=education_exams.batch_id and f.member_id in(select om.id from public.organization_members om where om.organization_id=te.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher')));
drop policy if exists education_exams_student_read on public.education_exams;
create policy education_exams_student_read on public.education_exams for select to authenticated
using(organization_id=public.current_organization_id() and status='published' and exists(select 1 from public.education_students s join public.education_batches b on b.id=s.batch_id and b.organization_id=s.organization_id where s.organization_id=education_exams.organization_id and s.user_id=(select auth.uid()) and b.program_id=education_exams.program_id and (education_exams.batch_id is null or s.batch_id=education_exams.batch_id)));
drop policy if exists education_exams_parent_read on public.education_exams;
create policy education_exams_parent_read on public.education_exams for select to authenticated
using(organization_id=public.current_organization_id() and status='published' and exists(select 1 from public.education_student_guardians sg join public.education_guardians g on g.id=sg.guardian_id and g.organization_id=sg.organization_id join public.education_students s on s.id=sg.student_id and s.organization_id=sg.organization_id join public.education_batches b on b.id=s.batch_id and b.organization_id=s.organization_id where sg.organization_id=education_exams.organization_id and g.user_id=(select auth.uid()) and b.program_id=education_exams.program_id and (education_exams.batch_id is null or s.batch_id=education_exams.batch_id)));
drop policy if exists education_exam_subjects_teacher_read on public.education_exam_subjects;
create policy education_exam_subjects_teacher_read on public.education_exam_subjects for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_exams e join public.education_timetable_entries te on te.batch_id=e.batch_id and te.organization_id=e.organization_id join public.education_faculty f on f.id=te.faculty_id and f.organization_id=te.organization_id where e.id=education_exam_subjects.exam_id and e.organization_id=education_exam_subjects.organization_id and te.subject_id=education_exam_subjects.subject_id and f.member_id in(select om.id from public.organization_members om where om.organization_id=e.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher')));
drop policy if exists education_exam_subjects_student_read on public.education_exam_subjects;
create policy education_exam_subjects_student_read on public.education_exam_subjects for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_exams e join public.education_students s on s.organization_id=e.organization_id join public.education_batches b on b.id=s.batch_id and b.organization_id=s.organization_id where e.id=education_exam_subjects.exam_id and e.organization_id=education_exam_subjects.organization_id and e.status='published' and s.user_id=(select auth.uid()) and b.program_id=e.program_id and (e.batch_id is null or e.batch_id=s.batch_id)));
drop policy if exists education_exam_subjects_parent_read on public.education_exam_subjects;
create policy education_exam_subjects_parent_read on public.education_exam_subjects for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_exams e join public.education_student_guardians sg on sg.organization_id=e.organization_id join public.education_guardians g on g.id=sg.guardian_id and g.organization_id=sg.organization_id join public.education_students s on s.id=sg.student_id and s.organization_id=sg.organization_id and s.batch_id=e.batch_id where e.id=education_exam_subjects.exam_id and e.organization_id=education_exam_subjects.organization_id and e.status='published' and g.user_id=(select auth.uid())));
drop policy if exists education_results_teacher_manage on public.education_results;
create policy education_results_teacher_manage on public.education_results for all to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_exam_subjects es join public.education_exams e on e.id=es.exam_id and e.organization_id=es.organization_id join public.education_timetable_entries te on te.batch_id=e.batch_id and te.subject_id=es.subject_id and te.organization_id=e.organization_id join public.education_faculty f on f.id=te.faculty_id and f.organization_id=te.organization_id where es.id=education_results.exam_subject_id and es.organization_id=education_results.organization_id and f.member_id in(select om.id from public.organization_members om where om.organization_id=e.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher')))
with check(organization_id=public.current_organization_id() and exists(select 1 from public.education_exam_subjects es join public.education_exams e on e.id=es.exam_id and e.organization_id=es.organization_id join public.education_timetable_entries te on te.batch_id=e.batch_id and te.subject_id=es.subject_id and te.organization_id=e.organization_id join public.education_faculty f on f.id=te.faculty_id and f.organization_id=te.organization_id where es.id=education_results.exam_subject_id and es.organization_id=education_results.organization_id and f.member_id in(select om.id from public.organization_members om where om.organization_id=e.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher')));

create or replace function public.education_set_student_academic_scope()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $function$
declare dept uuid; campus uuid;
begin
 if new.batch_id is not null then
  select p.department_id,d.campus_id into dept,campus from public.education_batches b join public.education_programs p on p.id=b.program_id and p.organization_id=b.organization_id left join public.education_departments d on d.id=p.department_id and d.organization_id=p.organization_id where b.id=new.batch_id and b.organization_id=new.organization_id;
  if not found then raise exception 'Batch not found in this organization' using errcode='23503'; end if;
  new.department_id:=dept;if campus is not null then new.campus_id:=campus;end if;
 end if;return new;
end;$function$;
drop trigger if exists education_student_academic_scope on public.education_students;
create trigger education_student_academic_scope before insert or update of batch_id on public.education_students for each row execute function public.education_set_student_academic_scope();
revoke all on function public.education_set_student_academic_scope() from public,anon;

create or replace function public.education_claim_faculty_profile()
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $function$
declare member_row_id uuid; faculty_row_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select id into member_row_id from public.organization_members where organization_id=public.current_organization_id() and user_id=auth.uid() and status='active' and role='teacher';
 if member_row_id is null then raise exception 'Active teacher membership required' using errcode='42501'; end if;
 update public.education_faculty set member_id=member_row_id where organization_id=public.current_organization_id() and member_id is null and lower(email::text)=lower(auth.jwt()->>'email') returning id into faculty_row_id;
 if faculty_row_id is null then select id into faculty_row_id from public.education_faculty where organization_id=public.current_organization_id() and member_id=member_row_id; end if;
 if faculty_row_id is null then raise exception 'No faculty record matches this verified email' using errcode='P0002'; end if;
 return faculty_row_id;
end;$function$;
revoke all on function public.education_claim_faculty_profile() from public,anon;
grant execute on function public.education_claim_faculty_profile() to authenticated;

create or replace function public.education_convert_application(target_application_id uuid,new_admission_number text,target_batch_id uuid)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $function$
declare app public.education_admission_applications; new_student_id uuid; org_id uuid:=public.current_organization_id();
begin
 if auth.uid() is null or org_id is null or not public.has_org_permission(org_id,'education.admissions.manage') then raise exception 'Permission denied' using errcode='42501'; end if;
 select * into app from public.education_admission_applications where id=target_application_id and organization_id=org_id for update;
 if app.id is null then raise exception 'Application not found' using errcode='P0002'; end if;
 if app.status not in('submitted','under_review','waitlisted') then raise exception 'Only active applications can be admitted' using errcode='22023'; end if;
 if not exists(select 1 from public.education_batches b join public.education_programs p on p.id=b.program_id and p.organization_id=b.organization_id where b.id=target_batch_id and b.organization_id=org_id and b.status='active' and p.id=app.program_id) then raise exception 'Select an active batch for the applied programme' using errcode='23514'; end if;
 new_student_id:=public.admit_education_student(new_admission_number,app.full_name,app.email::text,app.phone,app.guardian_name,app.guardian_phone,target_batch_id);
 if app.applicant_user_id is not null then update public.education_students set user_id=app.applicant_user_id where id=new_student_id and organization_id=org_id; end if;
 update public.education_admission_applications set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),converted_student_id=new_student_id,updated_at=now() where id=app.id and organization_id=org_id;
 return new_student_id;
end;$function$;
revoke all on function public.education_convert_application(uuid,text,uuid) from public,anon;
grant execute on function public.education_convert_application(uuid,text,uuid) to authenticated;

create or replace function public.education_validate_result()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $function$
declare max_allowed numeric; exam_batch uuid; student_batch uuid; student_program uuid; exam_program uuid;
begin
 select es.max_marks,e.batch_id,e.program_id into max_allowed,exam_batch,exam_program from public.education_exam_subjects es join public.education_exams e on e.id=es.exam_id and e.organization_id=es.organization_id where es.id=new.exam_subject_id and es.organization_id=new.organization_id;
 select s.batch_id,b.program_id into student_batch,student_program from public.education_students s left join public.education_batches b on b.id=s.batch_id and b.organization_id=s.organization_id where s.id=new.student_id and s.organization_id=new.organization_id;
 if max_allowed is null then raise exception 'Exam subject not found' using errcode='23503'; end if;
 if new.marks_obtained is not null and new.marks_obtained>max_allowed then raise exception 'Marks cannot exceed maximum marks' using errcode='23514'; end if;
 if exam_batch is not null and student_batch is distinct from exam_batch then raise exception 'Student does not belong to this exam batch' using errcode='23514'; end if;
 if exam_batch is null and student_program is distinct from exam_program then raise exception 'Student does not belong to this exam programme' using errcode='23514'; end if;
 return new;
end;$function$;
drop trigger if exists education_result_validate on public.education_results;
create trigger education_result_validate before insert or update on public.education_results for each row execute function public.education_validate_result();
revoke all on function public.education_validate_result() from public,anon;

create or replace function public.education_publish_exam(target_exam_id uuid)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $function$
declare org_id uuid:=public.current_organization_id();
begin
 if auth.uid() is null or org_id is null or not public.has_org_permission(org_id,'education.results.manage') then raise exception 'Permission denied' using errcode='42501'; end if;
 update public.education_exams set status='published',published_at=now(),updated_at=now() where id=target_exam_id and organization_id=org_id and status in('scheduled','completed');
 if not found then raise exception 'Exam must be scheduled or completed before publishing' using errcode='22023'; end if;
 update public.education_results r set status='published',published_at=now(),updated_at=now() from public.education_exam_subjects es where es.id=r.exam_subject_id and es.organization_id=r.organization_id and es.exam_id=target_exam_id and r.organization_id=org_id and r.status='draft';
 return true;
end;$function$;
revoke all on function public.education_publish_exam(uuid) from public,anon;
grant execute on function public.education_publish_exam(uuid) to authenticated;

create or replace view public.education_attendance_summary with(security_invoker=true) as
select s.organization_id,s.batch_id,s.session_date,count(r.id) marked_count,count(r.id) filter(where r.attendance_status='present') present_count,count(r.id) filter(where r.attendance_status='absent') absent_count,count(r.id) filter(where r.attendance_status='late') late_count
from public.education_attendance_sessions s left join public.education_attendance_records r on r.session_id=s.id and r.organization_id=s.organization_id group by s.organization_id,s.batch_id,s.session_date;
create or replace view public.education_results_summary with(security_invoker=true) as
select r.organization_id,es.exam_id,count(*) result_count,count(*) filter(where r.status='published') published_count,round(avg(r.marks_obtained) filter(where r.status='published'),2) average_marks,count(*) filter(where r.status='published' and r.marks_obtained>=es.pass_marks) passed_count
from public.education_results r join public.education_exam_subjects es on es.id=r.exam_subject_id and es.organization_id=r.organization_id group by r.organization_id,es.exam_id;
grant select on public.education_attendance_summary,public.education_results_summary to authenticated;
