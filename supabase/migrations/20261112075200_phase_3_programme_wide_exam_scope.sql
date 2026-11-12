
-- Support programme-wide exams while limiting teacher access to their assigned batches/subjects.
drop policy if exists education_batches_teacher_read on public.education_batches;
create policy education_batches_teacher_read on public.education_batches for select to authenticated
using(organization_id=public.current_organization_id() and exists(
 select 1 from public.education_timetable_entries te
 join public.education_faculty f on f.id=te.faculty_id and f.organization_id=te.organization_id
 where te.organization_id=education_batches.organization_id and te.batch_id=education_batches.id
 and f.member_id in(select om.id from public.organization_members om where om.organization_id=te.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher')
));

drop policy if exists education_exams_teacher_read on public.education_exams;
create policy education_exams_teacher_read on public.education_exams for select to authenticated
using(organization_id=public.current_organization_id() and exists(
 select 1 from public.education_timetable_entries te
 join public.education_faculty f on f.id=te.faculty_id and f.organization_id=te.organization_id
 join public.education_batches b on b.id=te.batch_id and b.organization_id=te.organization_id
 where te.organization_id=education_exams.organization_id and b.program_id=education_exams.program_id
 and (education_exams.batch_id is null or te.batch_id=education_exams.batch_id)
 and f.member_id in(select om.id from public.organization_members om where om.organization_id=te.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher')
));

drop policy if exists education_exam_subjects_teacher_read on public.education_exam_subjects;
create policy education_exam_subjects_teacher_read on public.education_exam_subjects for select to authenticated
using(organization_id=public.current_organization_id() and exists(
 select 1 from public.education_exams e
 join public.education_timetable_entries te on te.organization_id=e.organization_id and te.subject_id=education_exam_subjects.subject_id
 join public.education_batches b on b.id=te.batch_id and b.organization_id=te.organization_id and b.program_id=e.program_id
 join public.education_faculty f on f.id=te.faculty_id and f.organization_id=te.organization_id
 where e.id=education_exam_subjects.exam_id and e.organization_id=education_exam_subjects.organization_id
 and (e.batch_id is null or e.batch_id=te.batch_id)
 and f.member_id in(select om.id from public.organization_members om where om.organization_id=e.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher')
));

drop policy if exists education_exam_subjects_parent_read on public.education_exam_subjects;
create policy education_exam_subjects_parent_read on public.education_exam_subjects for select to authenticated
using(organization_id=public.current_organization_id() and exists(
 select 1 from public.education_exams e
 join public.education_student_guardians sg on sg.organization_id=e.organization_id
 join public.education_guardians g on g.id=sg.guardian_id and g.organization_id=sg.organization_id
 join public.education_students s on s.id=sg.student_id and s.organization_id=sg.organization_id
 join public.education_batches b on b.id=s.batch_id and b.organization_id=s.organization_id
 where e.id=education_exam_subjects.exam_id and e.organization_id=education_exam_subjects.organization_id
 and e.status='published' and g.user_id=(select auth.uid()) and b.program_id=e.program_id
 and (e.batch_id is null or s.batch_id=e.batch_id)
));

drop policy if exists education_results_teacher_manage on public.education_results;
create policy education_results_teacher_manage on public.education_results for all to authenticated
using(organization_id=public.current_organization_id() and exists(
 select 1 from public.education_exam_subjects es
 join public.education_exams e on e.id=es.exam_id and e.organization_id=es.organization_id
 join public.education_timetable_entries te on te.organization_id=e.organization_id and te.subject_id=es.subject_id
 join public.education_batches b on b.id=te.batch_id and b.organization_id=te.organization_id and b.program_id=e.program_id
 join public.education_faculty f on f.id=te.faculty_id and f.organization_id=te.organization_id
 where es.id=education_results.exam_subject_id and es.organization_id=education_results.organization_id
 and (e.batch_id is null or e.batch_id=te.batch_id)
 and f.member_id in(select om.id from public.organization_members om where om.organization_id=e.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher')
))
with check(organization_id=public.current_organization_id() and exists(
 select 1 from public.education_exam_subjects es
 join public.education_exams e on e.id=es.exam_id and e.organization_id=es.organization_id
 join public.education_timetable_entries te on te.organization_id=e.organization_id and te.subject_id=es.subject_id
 join public.education_batches b on b.id=te.batch_id and b.organization_id=te.organization_id and b.program_id=e.program_id
 join public.education_faculty f on f.id=te.faculty_id and f.organization_id=te.organization_id
 where es.id=education_results.exam_subject_id and es.organization_id=education_results.organization_id
 and (e.batch_id is null or e.batch_id=te.batch_id)
 and f.member_id in(select om.id from public.organization_members om where om.organization_id=e.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher')
));
