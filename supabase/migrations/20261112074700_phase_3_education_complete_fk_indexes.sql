
-- Cover all foreign keys introduced by Phase 3 education operations tables.
create index if not exists education_admissions_applicant_fk_idx on public.education_admission_applications(applicant_user_id);
create index if not exists education_admissions_program_fk_idx on public.education_admission_applications(program_id,organization_id) where program_id is not null;
create index if not exists education_admissions_campus_fk_idx on public.education_admission_applications(campus_id,organization_id) where campus_id is not null;
create index if not exists education_admissions_converted_student_fk_idx on public.education_admission_applications(converted_student_id,organization_id) where converted_student_id is not null;
create index if not exists education_admissions_reviewer_fk_idx on public.education_admission_applications(reviewed_by) where reviewed_by is not null;
create index if not exists education_documents_application_fk_idx on public.education_documents(application_id,organization_id) where application_id is not null;
create index if not exists education_documents_student_fk_idx on public.education_documents(student_id,organization_id) where student_id is not null;
create index if not exists education_documents_submitter_fk_idx on public.education_documents(submitted_by) where submitted_by is not null;
create index if not exists education_documents_verifier_fk_idx on public.education_documents(verified_by) where verified_by is not null;
create index if not exists education_exam_subjects_exam_fk_idx on public.education_exam_subjects(exam_id,organization_id);
create index if not exists education_exam_subjects_subject_fk_idx on public.education_exam_subjects(subject_id,organization_id);
create index if not exists education_exams_year_fk_idx on public.education_exams(academic_year_id,organization_id);
create index if not exists education_exams_batch_fk_idx on public.education_exams(batch_id,organization_id) where batch_id is not null;
create index if not exists education_exams_creator_fk_idx on public.education_exams(created_by) where created_by is not null;
create index if not exists education_exams_program_fk_idx on public.education_exams(program_id,organization_id);
create index if not exists education_guardians_user_fk_idx on public.education_guardians(user_id) where user_id is not null;
create index if not exists education_results_entered_by_fk_idx on public.education_results(entered_by) where entered_by is not null;
create index if not exists education_results_exam_subject_fk_idx on public.education_results(exam_subject_id,organization_id);
create index if not exists education_results_student_fk_idx on public.education_results(student_id,organization_id);
create index if not exists education_student_guardians_guardian_fk_idx on public.education_student_guardians(guardian_id,organization_id);
create index if not exists education_student_guardians_student_fk_idx on public.education_student_guardians(student_id,organization_id);
