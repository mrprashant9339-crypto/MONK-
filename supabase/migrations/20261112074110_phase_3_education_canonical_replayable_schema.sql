-- Canonical replayable Phase 3 completion migration.
-- Base education tables and tenant helpers are created by the earlier Phase 3 foundation migrations.
-- This migration adds the education-only roles, student/parent identities, admissions,
-- private documents, examinations/results, portals, and their RLS boundaries.

insert into public.roles(id,description,is_system) values
('principal','Education institution principal',true),('hod','Education head of department',true),
('teacher','Education teaching faculty',true),('student','Education student',true),('parent','Education parent or guardian',true)
on conflict(id) do nothing;
insert into public.permissions(id,description) values
('education.guardian.manage','Manage parent and guardian links'),('education.guardian.read','Read parent and guardian links'),
('education.admissions.manage','Review and process admission applications'),('education.admissions.read','Read admission applications'),
('education.documents.manage','Upload and verify institution documents'),('education.documents.read','Read authorized education documents'),
('education.exams.manage','Create exams and enter marks'),('education.exams.read','Read authorized examination schedules'),
('education.results.manage','Enter and publish examination results'),('education.results.read','Read published results')
on conflict(id) do nothing;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.id in('owner','admin','manager','principal') and p.id like 'education.%'
on conflict do nothing;
insert into public.role_permissions(role_id,permission_id)
values('principal','organization.members.invite'),('principal','organization.members.update') on conflict do nothing;

create table if not exists public.education_guardians(
 id uuid primary key default public.uuid_v7(),organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid references auth.users(id) on delete set null,full_name text not null check(char_length(trim(full_name)) between 2 and 160),
 email citext not null,phone text,status text not null default 'invited' check(status in('invited','active','inactive')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(organization_id,id),unique(organization_id,email)
);
create unique index if not exists education_guardians_user_unique on public.education_guardians(organization_id,user_id) where user_id is not null;
create table if not exists public.education_student_guardians(
 id uuid primary key default public.uuid_v7(),organization_id uuid not null references public.organizations(id) on delete cascade,
 student_id uuid not null,guardian_id uuid not null,relationship text not null default 'parent' check(relationship in('mother','father','guardian','parent','other')),
 is_primary boolean not null default false,created_at timestamptz not null default now(),unique(organization_id,id),unique(organization_id,student_id,guardian_id),
 foreign key(student_id,organization_id) references public.education_students(id,organization_id) on delete cascade,
 foreign key(guardian_id,organization_id) references public.education_guardians(id,organization_id) on delete cascade
);
create table if not exists public.education_admission_applications(
 id uuid primary key default public.uuid_v7(),organization_id uuid not null references public.organizations(id) on delete cascade,
 applicant_user_id uuid references auth.users(id) on delete set null,application_number text not null,
 full_name text not null check(char_length(trim(full_name)) between 2 and 160),email citext not null,phone text,date_of_birth date,
 gender text check(gender in('female','male','non_binary','prefer_not_to_say')),guardian_name text,guardian_phone text,
 program_id uuid,campus_id uuid,status text not null default 'submitted' check(status in('submitted','under_review','approved','rejected','waitlisted','withdrawn')),
 submitted_at timestamptz not null default now(),reviewed_by uuid references auth.users(id) on delete set null,reviewed_at timestamptz,
 review_note text,converted_student_id uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(organization_id,id),unique(organization_id,application_number),
 foreign key(program_id,organization_id) references public.education_programs(id,organization_id),
 foreign key(campus_id,organization_id) references public.education_campuses(id,organization_id),
 foreign key(converted_student_id,organization_id) references public.education_students(id,organization_id),
 check(reviewed_at is null or reviewed_at>=submitted_at)
);
create table if not exists public.education_documents(
 id uuid primary key default public.uuid_v7(),organization_id uuid not null references public.organizations(id) on delete cascade,
 student_id uuid,application_id uuid,category text not null check(category in('identity','address','photo','marksheet','transfer_certificate','caste','income','other')),
 file_name text not null,storage_path text not null,mime_type text,file_size bigint check(file_size is null or file_size between 1 and 10485760),
 status text not null default 'pending' check(status in('pending','verified','rejected')),
 submitted_by uuid references auth.users(id) on delete set null,verified_by uuid references auth.users(id) on delete set null,
 verified_at timestamptz,verification_note text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(organization_id,id),unique(organization_id,storage_path),
 foreign key(student_id,organization_id) references public.education_students(id,organization_id) on delete cascade,
 foreign key(application_id,organization_id) references public.education_admission_applications(id,organization_id) on delete cascade,
 check(num_nonnulls(student_id,application_id)=1)
);
create table if not exists public.education_exams(
 id uuid primary key default public.uuid_v7(),organization_id uuid not null references public.organizations(id) on delete cascade,
 academic_year_id uuid not null,program_id uuid not null,batch_id uuid,title text not null check(char_length(trim(title)) between 2 and 160),
 exam_type text not null default 'internal' check(exam_type in('internal','midterm','semester','final','practical','other')),
 starts_on date not null,ends_on date not null,status text not null default 'draft' check(status in('draft','scheduled','completed','published','cancelled')),
 created_by uuid references auth.users(id) on delete set null,published_at timestamptz,created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),unique(organization_id,id),
 foreign key(academic_year_id,organization_id) references public.education_academic_years(id,organization_id),
 foreign key(program_id,organization_id) references public.education_programs(id,organization_id),
 foreign key(batch_id,organization_id) references public.education_batches(id,organization_id),check(ends_on>=starts_on)
);
create table if not exists public.education_exam_subjects(
 id uuid primary key default public.uuid_v7(),organization_id uuid not null references public.organizations(id) on delete cascade,
 exam_id uuid not null,subject_id uuid not null,max_marks numeric(7,2) not null check(max_marks>0),
 pass_marks numeric(7,2) not null default 0 check(pass_marks>=0),exam_date date,starts_at time,ends_at time,created_at timestamptz not null default now(),
 unique(organization_id,id),unique(organization_id,exam_id,subject_id),
 foreign key(exam_id,organization_id) references public.education_exams(id,organization_id) on delete cascade,
 foreign key(subject_id,organization_id) references public.education_subjects(id,organization_id),
 check(pass_marks<=max_marks),check(ends_at is null or starts_at is null or ends_at>starts_at)
);
create table if not exists public.education_results(
 id uuid primary key default public.uuid_v7(),organization_id uuid not null references public.organizations(id) on delete cascade,
 exam_subject_id uuid not null,student_id uuid not null,marks_obtained numeric(7,2),grade text,remarks text,
 status text not null default 'draft' check(status in('draft','published','absent','withheld')),
 entered_by uuid references auth.users(id) on delete set null,published_at timestamptz,created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),unique(organization_id,id),unique(organization_id,exam_subject_id,student_id),
 foreign key(exam_subject_id,organization_id) references public.education_exam_subjects(id,organization_id) on delete cascade,
 foreign key(student_id,organization_id) references public.education_students(id,organization_id) on delete cascade,
 check(marks_obtained is null or marks_obtained>=0)
);

create index if not exists education_admissions_status_idx on public.education_admission_applications(organization_id,status,submitted_at desc);
create index if not exists education_admissions_applicant_fk_idx on public.education_admission_applications(applicant_user_id);
create index if not exists education_documents_student_fk_idx on public.education_documents(student_id,organization_id) where student_id is not null;
create index if not exists education_documents_application_fk_idx on public.education_documents(application_id,organization_id) where application_id is not null;
create index if not exists education_exam_subjects_exam_fk_idx on public.education_exam_subjects(exam_id,organization_id);
create index if not exists education_exam_subjects_subject_fk_idx on public.education_exam_subjects(subject_id,organization_id);
create index if not exists education_exams_program_fk_idx on public.education_exams(program_id,organization_id);
create index if not exists education_exams_batch_fk_idx on public.education_exams(batch_id,organization_id) where batch_id is not null;
create index if not exists education_results_exam_subject_fk_idx on public.education_results(exam_subject_id,organization_id);
create index if not exists education_results_student_fk_idx on public.education_results(student_id,organization_id);
create index if not exists education_student_guardians_guardian_fk_idx on public.education_student_guardians(guardian_id,organization_id);
create index if not exists education_student_guardians_student_fk_idx on public.education_student_guardians(student_id,organization_id);

alter table public.education_guardians enable row level security;
alter table public.education_student_guardians enable row level security;
alter table public.education_admission_applications enable row level security;
alter table public.education_documents enable row level security;
alter table public.education_exams enable row level security;
alter table public.education_exam_subjects enable row level security;
alter table public.education_results enable row level security;
revoke all on public.education_guardians,public.education_student_guardians,public.education_admission_applications,public.education_documents,public.education_exams,public.education_exam_subjects,public.education_results from public,anon;
grant select,insert,update,delete on public.education_guardians,public.education_student_guardians,public.education_admission_applications,public.education_documents,public.education_exams,public.education_exam_subjects,public.education_results to authenticated;
revoke update on public.education_students,public.education_faculty,public.education_guardians from authenticated;
grant update(user_id) on public.education_students,public.education_guardians to authenticated;
grant update(member_id) on public.education_faculty to authenticated;

-- Admin/leadership data management policies.
do $p$ declare t text; begin
 foreach t in array array['education_guardians','education_student_guardians','education_admission_applications','education_documents','education_exams','education_exam_subjects','education_results'] loop
  execute format('drop policy if exists %I on public.%I','education_'||t||'_leadership_all',t);
 end loop;
end $p$;
create policy education_guardians_leadership_all on public.education_guardians for all to authenticated
using(organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.guardian.manage'))
with check(organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.guardian.manage'));
create policy education_student_guardians_leadership_all on public.education_student_guardians for all to authenticated
using(organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.guardian.manage'))
with check(organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.guardian.manage'));
create policy education_admissions_leadership_all on public.education_admission_applications for all to authenticated
using(organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.admissions.manage'))
with check(organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.admissions.manage'));
create policy education_documents_leadership_all on public.education_documents for all to authenticated
using(organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.documents.manage'))
with check(organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.documents.manage'));
create policy education_exams_leadership_all on public.education_exams for all to authenticated
using(organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.exams.manage'))
with check(organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.exams.manage'));
create policy education_exam_subjects_leadership_all on public.education_exam_subjects for all to authenticated
using(organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.exams.manage'))
with check(organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.exams.manage'));
create policy education_results_leadership_all on public.education_results for all to authenticated
using(organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.results.manage'))
with check(organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.results.manage'));

-- Account claiming: only the invited user with the matching Auth email can link their own profile.
drop policy if exists education_students_claim_read on public.education_students;
create policy education_students_claim_read on public.education_students for select to authenticated
using(organization_id=public.current_organization_id() and user_id is null and lower(email::text)=lower(auth.jwt()->>'email') and public.has_org_role(organization_id,array['student']));
drop policy if exists education_students_claim_own on public.education_students;
create policy education_students_claim_own on public.education_students for update to authenticated
using(organization_id=public.current_organization_id() and user_id is null and lower(email::text)=lower(auth.jwt()->>'email') and public.has_org_role(organization_id,array['student']))
with check(organization_id=public.current_organization_id() and user_id=(select auth.uid()) and lower(email::text)=lower(auth.jwt()->>'email') and public.has_org_role(organization_id,array['student']));
drop policy if exists education_students_self_read on public.education_students;
create policy education_students_self_read on public.education_students for select to authenticated using(organization_id=public.current_organization_id() and user_id=(select auth.uid()));
drop policy if exists education_guardians_claim_read on public.education_guardians;
create policy education_guardians_claim_read on public.education_guardians for select to authenticated
using(organization_id=public.current_organization_id() and user_id is null and lower(email::text)=lower(auth.jwt()->>'email') and public.has_org_role(organization_id,array['parent']));
drop policy if exists education_guardians_claim on public.education_guardians;
create policy education_guardians_claim on public.education_guardians for update to authenticated
using(organization_id=public.current_organization_id() and user_id is null and lower(email::text)=lower(auth.jwt()->>'email') and public.has_org_role(organization_id,array['parent']))
with check(organization_id=public.current_organization_id() and user_id=(select auth.uid()) and lower(email::text)=lower(auth.jwt()->>'email') and public.has_org_role(organization_id,array['parent']));
drop policy if exists education_guardians_self_read on public.education_guardians;
create policy education_guardians_self_read on public.education_guardians for select to authenticated using(organization_id=public.current_organization_id() and user_id=(select auth.uid()));

drop policy if exists education_faculty_claim_read on public.education_faculty;
create policy education_faculty_claim_read on public.education_faculty for select to authenticated
using(organization_id=public.current_organization_id() and member_id is null and lower(email::text)=lower(auth.jwt()->>'email') and exists(select 1 from public.organization_members om where om.organization_id=education_faculty.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher'));
drop policy if exists education_faculty_claim on public.education_faculty;
create policy education_faculty_claim on public.education_faculty for update to authenticated
using(organization_id=public.current_organization_id() and member_id is null and lower(email::text)=lower(auth.jwt()->>'email') and exists(select 1 from public.organization_members om where om.organization_id=education_faculty.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher'))
with check(organization_id=public.current_organization_id() and exists(select 1 from public.organization_members om where om.id=member_id and om.organization_id=education_faculty.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher'));

-- Applicant-owned admission rows and document rows.
drop policy if exists education_admissions_applicant_insert on public.education_admission_applications;
create policy education_admissions_applicant_insert on public.education_admission_applications for insert to authenticated
with check(organization_id=public.current_organization_id() and applicant_user_id=(select auth.uid()) and status='submitted' and public.has_org_role(organization_id,array['student']));
drop policy if exists education_admissions_applicant_read on public.education_admission_applications;
create policy education_admissions_applicant_read on public.education_admission_applications for select to authenticated using(organization_id=public.current_organization_id() and applicant_user_id=(select auth.uid()));
drop policy if exists education_documents_student_read on public.education_documents;
create policy education_documents_student_read on public.education_documents for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_students s where s.id=education_documents.student_id and s.organization_id=education_documents.organization_id and s.user_id=(select auth.uid())));
drop policy if exists education_documents_student_insert on public.education_documents;
create policy education_documents_student_insert on public.education_documents for insert to authenticated
with check(organization_id=public.current_organization_id() and submitted_by=(select auth.uid()) and status='pending' and exists(select 1 from public.education_students s where s.id=education_documents.student_id and s.organization_id=education_documents.organization_id and s.user_id=(select auth.uid())));
drop policy if exists education_documents_applicant_read on public.education_documents;
create policy education_documents_applicant_read on public.education_documents for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_admission_applications a where a.id=education_documents.application_id and a.organization_id=education_documents.organization_id and a.applicant_user_id=(select auth.uid())));
drop policy if exists education_documents_applicant_insert on public.education_documents;
create policy education_documents_applicant_insert on public.education_documents for insert to authenticated
with check(organization_id=public.current_organization_id() and submitted_by=(select auth.uid()) and status='pending' and exists(select 1 from public.education_admission_applications a where a.id=education_documents.application_id and a.organization_id=education_documents.organization_id and a.applicant_user_id=(select auth.uid())));
drop policy if exists education_documents_parent_read on public.education_documents;
create policy education_documents_parent_read on public.education_documents for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_student_guardians sg join public.education_guardians g on g.id=sg.guardian_id and g.organization_id=sg.organization_id where sg.organization_id=education_documents.organization_id and sg.student_id=education_documents.student_id and g.user_id=(select auth.uid())));

-- Parent and student academic records.
drop policy if exists education_student_guardians_parent_read on public.education_student_guardians;
create policy education_student_guardians_parent_read on public.education_student_guardians for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_guardians g where g.id=guardian_id and g.organization_id=organization_id and g.user_id=(select auth.uid())));
drop policy if exists education_student_guardians_student_read on public.education_student_guardians;
create policy education_student_guardians_student_read on public.education_student_guardians for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_students s where s.id=student_id and s.organization_id=organization_id and s.user_id=(select auth.uid())));
drop policy if exists education_students_parent_read on public.education_students;
create policy education_students_parent_read on public.education_students for select to authenticated
using(organization_id=public.current_organization_id() and exists(select 1 from public.education_student_guardians sg join public.education_guardians g on g.id=sg.guardian_id and g.organization_id=sg.organization_id where sg.organization_id=education_students.organization_id and sg.student_id=education_students.id and g.user_id=(select auth.uid())));
drop policy if exists education_results_student_read on public.education_results;
create policy education_results_student_read on public.education_results for select to authenticated
using(organization_id=public.current_organization_id() and status='published' and exists(select 1 from public.education_students s where s.id=education_results.student_id and s.organization_id=education_results.organization_id and s.user_id=(select auth.uid())));
drop policy if exists education_results_parent_read on public.education_results;
create policy education_results_parent_read on public.education_results for select to authenticated
using(organization_id=public.current_organization_id() and status='published' and exists(select 1 from public.education_student_guardians sg join public.education_guardians g on g.id=sg.guardian_id and g.organization_id=sg.organization_id where sg.organization_id=education_results.organization_id and sg.student_id=education_results.student_id and g.user_id=(select auth.uid())));

-- Private document bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('education-private','education-private',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists education_storage_upload on storage.objects;
create policy education_storage_upload on storage.objects for insert to authenticated
with check(bucket_id='education-private' and (storage.foldername(name))[1]=public.current_organization_id()::text and (
 public.has_org_permission(public.current_organization_id(),'education.documents.manage')
 or exists(select 1 from public.education_students s where s.id::text=(storage.foldername(name))[3] and s.organization_id=public.current_organization_id() and s.user_id=(select auth.uid()))
 or exists(select 1 from public.education_admission_applications a where a.id::text=(storage.foldername(name))[3] and a.organization_id=public.current_organization_id() and a.applicant_user_id=(select auth.uid()))
));
drop policy if exists education_storage_read on storage.objects;
create policy education_storage_read on storage.objects for select to authenticated
using(bucket_id='education-private' and (storage.foldername(name))[1]=public.current_organization_id()::text and (
 public.has_org_permission(public.current_organization_id(),'education.documents.read')
 or exists(select 1 from public.education_students s where s.id::text=(storage.foldername(name))[3] and s.organization_id=public.current_organization_id() and s.user_id=(select auth.uid()))
 or exists(select 1 from public.education_admission_applications a where a.id::text=(storage.foldername(name))[3] and a.organization_id=public.current_organization_id() and a.applicant_user_id=(select auth.uid()))
 or exists(select 1 from public.education_student_guardians sg join public.education_guardians g on g.id=sg.guardian_id and g.organization_id=sg.organization_id where sg.organization_id=public.current_organization_id() and sg.student_id::text=(storage.foldername(name))[3] and g.user_id=(select auth.uid()))
));
drop policy if exists education_storage_delete on storage.objects;
create policy education_storage_delete on storage.objects for delete to authenticated
using(bucket_id='education-private' and (storage.foldername(name))[1]=public.current_organization_id()::text and public.has_org_permission(public.current_organization_id(),'education.documents.manage'));

-- Auditing and timestamp maintenance.
drop trigger if exists education_guardians_set_updated_at on public.education_guardians;
create trigger education_guardians_set_updated_at before update on public.education_guardians for each row execute function public.education_set_updated_at();
drop trigger if exists education_guardians_audit on public.education_guardians;
create trigger education_guardians_audit after insert or update or delete on public.education_guardians for each row execute function public.education_audit_row();
drop trigger if exists education_admissions_set_updated_at on public.education_admission_applications;
create trigger education_admissions_set_updated_at before update on public.education_admission_applications for each row execute function public.education_set_updated_at();
drop trigger if exists education_admissions_audit on public.education_admission_applications;
create trigger education_admissions_audit after insert or update or delete on public.education_admission_applications for each row execute function public.education_audit_row();
drop trigger if exists education_documents_set_updated_at on public.education_documents;
create trigger education_documents_set_updated_at before update on public.education_documents for each row execute function public.education_set_updated_at();
drop trigger if exists education_documents_audit on public.education_documents;
create trigger education_documents_audit after insert or update or delete on public.education_documents for each row execute function public.education_audit_row();
drop trigger if exists education_exams_set_updated_at on public.education_exams;
create trigger education_exams_set_updated_at before update on public.education_exams for each row execute function public.education_set_updated_at();
drop trigger if exists education_exams_audit on public.education_exams;
create trigger education_exams_audit after insert or update or delete on public.education_exams for each row execute function public.education_audit_row();
drop trigger if exists education_results_set_updated_at on public.education_results;
create trigger education_results_set_updated_at before update on public.education_results for each row execute function public.education_set_updated_at();
drop trigger if exists education_results_audit on public.education_results;
create trigger education_results_audit after insert or update or delete on public.education_results for each row execute function public.education_audit_row();
drop trigger if exists education_student_guardians_audit on public.education_student_guardians;
create trigger education_student_guardians_audit after insert or update or delete on public.education_student_guardians for each row execute function public.education_audit_row();
drop trigger if exists education_exam_subjects_audit on public.education_exam_subjects;
create trigger education_exam_subjects_audit after insert or update or delete on public.education_exam_subjects for each row execute function public.education_audit_row();
