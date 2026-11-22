-- Scope teacher and HOD attendance/results access to the assigned batch or department.
drop policy if exists education_attendance_records_hod_manage on public.education_attendance_records;
create policy education_attendance_records_hod_manage
on public.education_attendance_records
for all to authenticated
using (
  organization_id = public.current_organization_id()
  and exists (
    select 1
    from public.education_attendance_sessions s
    join public.education_batches b on b.id = s.batch_id and b.organization_id = s.organization_id
    join public.education_programs p on p.id = b.program_id and p.organization_id = b.organization_id
    join public.education_departments d on d.id = p.department_id and d.organization_id = p.organization_id
    join public.organization_members om on om.id = d.hod_member_id and om.organization_id = d.organization_id
    join public.education_students st on st.id = education_attendance_records.student_id
      and st.organization_id = education_attendance_records.organization_id
      and st.batch_id = b.id and st.department_id = d.id
    where s.id = education_attendance_records.session_id
      and s.organization_id = education_attendance_records.organization_id
      and om.user_id = auth.uid() and om.status = 'active' and om.role = 'hod'
  )
)
with check (
  organization_id = public.current_organization_id()
  and exists (
    select 1
    from public.education_attendance_sessions s
    join public.education_batches b on b.id = s.batch_id and b.organization_id = s.organization_id
    join public.education_programs p on p.id = b.program_id and p.organization_id = b.organization_id
    join public.education_departments d on d.id = p.department_id and d.organization_id = p.organization_id
    join public.organization_members om on om.id = d.hod_member_id and om.organization_id = d.organization_id
    join public.education_students st on st.id = education_attendance_records.student_id
      and st.organization_id = education_attendance_records.organization_id
      and st.batch_id = b.id and st.department_id = d.id
    where s.id = education_attendance_records.session_id
      and s.organization_id = education_attendance_records.organization_id
      and om.user_id = auth.uid() and om.status = 'active' and om.role = 'hod'
  )
);

drop policy if exists education_attendance_records_teacher_manage on public.education_attendance_records;
create policy education_attendance_records_teacher_manage
on public.education_attendance_records
for all to authenticated
using (
  organization_id = public.current_organization_id()
  and exists (
    select 1
    from public.education_attendance_sessions s
    join public.education_faculty f on f.id = s.faculty_id and f.organization_id = s.organization_id
    join public.education_students st on st.id = education_attendance_records.student_id
      and st.organization_id = education_attendance_records.organization_id
      and st.batch_id = s.batch_id
    where s.id = education_attendance_records.session_id
      and s.organization_id = education_attendance_records.organization_id
      and f.member_id in (
        select om.id from public.organization_members om
        where om.organization_id = s.organization_id
          and om.user_id = auth.uid() and om.status = 'active' and om.role = 'teacher'
      )
  )
)
with check (
  organization_id = public.current_organization_id()
  and exists (
    select 1
    from public.education_attendance_sessions s
    join public.education_faculty f on f.id = s.faculty_id and f.organization_id = s.organization_id
    join public.education_students st on st.id = education_attendance_records.student_id
      and st.organization_id = education_attendance_records.organization_id
      and st.batch_id = s.batch_id
    where s.id = education_attendance_records.session_id
      and s.organization_id = education_attendance_records.organization_id
      and f.member_id in (
        select om.id from public.organization_members om
        where om.organization_id = s.organization_id
          and om.user_id = auth.uid() and om.status = 'active' and om.role = 'teacher'
      )
  )
);

drop policy if exists education_results_teacher_manage on public.education_results;
create policy education_results_teacher_manage
on public.education_results
for all to authenticated
using (
  organization_id = public.current_organization_id()
  and exists (
    select 1
    from public.education_exam_subjects es
    join public.education_exams e on e.id = es.exam_id and e.organization_id = es.organization_id
    join public.education_timetable_entries te on te.organization_id = e.organization_id and te.subject_id = es.subject_id
    join public.education_batches b on b.id = te.batch_id and b.organization_id = te.organization_id and b.program_id = e.program_id
    join public.education_faculty f on f.id = te.faculty_id and f.organization_id = te.organization_id
    join public.education_students st on st.id = education_results.student_id
      and st.organization_id = education_results.organization_id and st.batch_id = te.batch_id
    where es.id = education_results.exam_subject_id
      and es.organization_id = education_results.organization_id
      and (e.batch_id is null or e.batch_id = te.batch_id)
      and f.member_id in (
        select om.id from public.organization_members om
        where om.organization_id = e.organization_id
          and om.user_id = auth.uid() and om.status = 'active' and om.role = 'teacher'
      )
  )
)
with check (
  organization_id = public.current_organization_id()
  and exists (
    select 1
    from public.education_exam_subjects es
    join public.education_exams e on e.id = es.exam_id and e.organization_id = es.organization_id
    join public.education_timetable_entries te on te.organization_id = e.organization_id and te.subject_id = es.subject_id
    join public.education_batches b on b.id = te.batch_id and b.organization_id = te.organization_id and b.program_id = e.program_id
    join public.education_faculty f on f.id = te.faculty_id and f.organization_id = te.organization_id
    join public.education_students st on st.id = education_results.student_id
      and st.organization_id = education_results.organization_id and st.batch_id = te.batch_id
    where es.id = education_results.exam_subject_id
      and es.organization_id = education_results.organization_id
      and (e.batch_id is null or e.batch_id = te.batch_id)
      and f.member_id in (
        select om.id from public.organization_members om
        where om.organization_id = e.organization_id
          and om.user_id = auth.uid() and om.status = 'active' and om.role = 'teacher'
      )
  )
);

drop policy if exists education_results_hod_read on public.education_results;
create policy education_results_hod_read
on public.education_results
for select to authenticated
using (
  organization_id = public.current_organization_id()
  and exists (
    select 1
    from public.education_exam_subjects es
    join public.education_subjects sub on sub.id = es.subject_id and sub.organization_id = es.organization_id
    join public.education_departments d on d.id = sub.department_id and d.organization_id = sub.organization_id
    join public.organization_members om on om.id = d.hod_member_id and om.organization_id = d.organization_id
    join public.education_students st on st.id = education_results.student_id
      and st.organization_id = education_results.organization_id
      and st.department_id = d.id
    where es.id = education_results.exam_subject_id
      and es.organization_id = education_results.organization_id
      and om.user_id = auth.uid() and om.status = 'active' and om.role = 'hod'
  )
);
