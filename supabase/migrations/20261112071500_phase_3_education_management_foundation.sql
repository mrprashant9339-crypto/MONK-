-- MONK Phase 3: education management foundation.
-- Additive tenant-scoped schema. Existing business workspaces and Phase 1/2 tables remain unchanged.

insert into public.permissions(id,description) values
 ('education.institution.read','Read institution profile'),
 ('education.institution.update','Create and update institution profile'),
 ('education.campus.read','Read campus records'),
 ('education.campus.manage','Create and manage campuses'),
 ('education.department.read','Read departments'),
 ('education.department.manage','Create and manage departments'),
 ('education.academic.read','Read academic years and programmes'),
 ('education.academic.manage','Create and manage academic years and programmes'),
 ('education.student.read','Read student records'),
 ('education.student.manage','Create and manage student records'),
 ('education.faculty.read','Read faculty records'),
 ('education.faculty.manage','Create and manage faculty records'),
 ('education.timetable.read','Read timetable records'),
 ('education.timetable.manage','Create and manage timetable records'),
 ('education.attendance.read','Read attendance records'),
 ('education.attendance.manage','Create and manage attendance records')
on conflict (id) do nothing;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id
from public.roles r cross join public.permissions p
where r.id in ('owner','admin','manager')
  and p.id like 'education.%'
on conflict do nothing;

insert into public.role_permissions(role_id,permission_id)
select 'auditor',p.id from public.permissions p
where p.id in ('education.institution.read','education.campus.read','education.department.read',
 'education.academic.read','education.timetable.read','education.attendance.read')
on conflict do nothing;

create table if not exists public.education_institutions (
 id uuid primary key default uuid_v7(),
 organization_id uuid not null unique references public.organizations(id) on delete cascade,
 institution_type text not null check (institution_type in ('school','college','university','polytechnic','coaching','training_center')),
 legal_name text not null check (char_length(trim(legal_name)) between 2 and 180),
 short_name text,
 affiliation text,
 recognition_number text,
 website text,
 contact_email citext,
 contact_phone text,
 established_year smallint check (established_year between 1800 and extract(year from now())::int),
 verification_status text not null default 'unverified' check (verification_status in ('unverified','submitted','verified','rejected')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.education_campuses (
 id uuid primary key default uuid_v7(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null check (char_length(trim(name)) between 2 and 120),
 code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,19}$'),
 address text,
 city text,
 state text,
 postal_code text,
 is_primary boolean not null default false,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (organization_id,id),
 unique (organization_id,code)
);
create unique index if not exists education_one_primary_campus_idx on public.education_campuses(organization_id) where is_primary;

create table if not exists public.education_departments (
 id uuid primary key default uuid_v7(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 campus_id uuid,
 name text not null check (char_length(trim(name)) between 2 and 120),
 code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,19}$'),
 description text,
 hod_member_id uuid,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (organization_id,id),
 unique (organization_id,code),
 foreign key (campus_id,organization_id) references public.education_campuses(id,organization_id),
 foreign key (hod_member_id,organization_id) references public.organization_members(id,organization_id)
);

create table if not exists public.education_academic_years (
 id uuid primary key default uuid_v7(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null check (char_length(trim(name)) between 4 and 40),
 starts_on date not null,
 ends_on date not null,
 is_current boolean not null default false,
 status text not null default 'planned' check (status in ('planned','active','completed','archived')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (organization_id,id),
 unique (organization_id,name),
 check (ends_on > starts_on)
);
create unique index if not exists education_one_current_year_idx on public.education_academic_years(organization_id) where is_current and status='active';

create table if not exists public.education_programs (
 id uuid primary key default uuid_v7(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 department_id uuid,
 name text not null check (char_length(trim(name)) between 2 and 160),
 code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,24}$'),
 level text not null check (level in ('school','certificate','diploma','undergraduate','postgraduate','doctoral','coaching','other')),
 duration_semesters smallint check (duration_semesters between 1 and 20),
 total_seats integer check (total_seats is null or total_seats >= 0),
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (organization_id,id),
 unique (organization_id,code),
 foreign key (department_id,organization_id) references public.education_departments(id,organization_id)
);

create table if not exists public.education_batches (
 id uuid primary key default uuid_v7(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 program_id uuid not null,
 academic_year_id uuid not null,
 name text not null check (char_length(trim(name)) between 1 and 100),
 code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,24}$'),
 semester smallint check (semester between 1 and 20),
 section text,
 starts_on date,
 ends_on date,
 status text not null default 'active' check (status in ('planned','active','completed','archived')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (organization_id,id),
 unique (organization_id,code),
 foreign key (program_id,organization_id) references public.education_programs(id,organization_id),
 foreign key (academic_year_id,organization_id) references public.education_academic_years(id,organization_id),
 check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table if not exists public.education_students (
 id uuid primary key default uuid_v7(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 campus_id uuid,
 department_id uuid,
 batch_id uuid,
 user_id uuid references auth.users(id) on delete set null,
 admission_number text not null,
 full_name text not null check (char_length(trim(full_name)) between 2 and 160),
 date_of_birth date,
 gender text check (gender in ('female','male','non_binary','prefer_not_to_say')),
 email citext,
 phone text,
 guardian_name text,
 guardian_phone text,
 admission_date date not null default current_date,
 status text not null default 'active' check (status in ('applicant','active','graduated','withdrawn','suspended')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (organization_id,id),
 unique (organization_id,admission_number),
 foreign key (campus_id,organization_id) references public.education_campuses(id,organization_id),
 foreign key (department_id,organization_id) references public.education_departments(id,organization_id),
 foreign key (batch_id,organization_id) references public.education_batches(id,organization_id)
);

create table if not exists public.education_faculty (
 id uuid primary key default uuid_v7(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 campus_id uuid,
 department_id uuid,
 member_id uuid,
 employee_number text not null,
 full_name text not null check (char_length(trim(full_name)) between 2 and 160),
 email citext,
 phone text,
 designation text,
 employment_status text not null default 'active' check (employment_status in ('active','on_leave','inactive')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (organization_id,id),
 unique (organization_id,employee_number),
 foreign key (campus_id,organization_id) references public.education_campuses(id,organization_id),
 foreign key (department_id,organization_id) references public.education_departments(id,organization_id),
 foreign key (member_id,organization_id) references public.organization_members(id,organization_id)
);

create table if not exists public.education_subjects (
 id uuid primary key default uuid_v7(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 program_id uuid not null,
 department_id uuid,
 name text not null check (char_length(trim(name)) between 2 and 160),
 code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,24}$'),
 semester smallint check (semester between 1 and 20),
 credits numeric(4,1) check (credits is null or credits >= 0),
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (organization_id,id),
 unique (organization_id,code),
 foreign key (program_id,organization_id) references public.education_programs(id,organization_id),
 foreign key (department_id,organization_id) references public.education_departments(id,organization_id)
);

create table if not exists public.education_enrollments (
 id uuid primary key default uuid_v7(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 student_id uuid not null,
 batch_id uuid not null,
 academic_year_id uuid not null,
 enrollment_date date not null default current_date,
 status text not null default 'active' check (status in ('active','completed','cancelled','transferred')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (organization_id,id),
 unique (organization_id,student_id,batch_id,academic_year_id),
 foreign key (student_id,organization_id) references public.education_students(id,organization_id),
 foreign key (batch_id,organization_id) references public.education_batches(id,organization_id),
 foreign key (academic_year_id,organization_id) references public.education_academic_years(id,organization_id)
);

create table if not exists public.education_timetable_entries (
 id uuid primary key default uuid_v7(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 batch_id uuid not null,
 subject_id uuid not null,
 faculty_id uuid not null,
 weekday smallint not null check (weekday between 1 and 7),
 starts_at time not null,
 ends_at time not null,
 room text,
 valid_from date,
 valid_until date,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (organization_id,id),
 foreign key (batch_id,organization_id) references public.education_batches(id,organization_id),
 foreign key (subject_id,organization_id) references public.education_subjects(id,organization_id),
 foreign key (faculty_id,organization_id) references public.education_faculty(id,organization_id),
 check (ends_at > starts_at),
 check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create table if not exists public.education_attendance_sessions (
 id uuid primary key default uuid_v7(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 batch_id uuid not null,
 subject_id uuid not null,
 faculty_id uuid not null,
 session_date date not null,
 starts_at time,
 ends_at time,
 status text not null default 'open' check (status in ('open','submitted','locked')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (organization_id,id),
 foreign key (batch_id,organization_id) references public.education_batches(id,organization_id),
 foreign key (subject_id,organization_id) references public.education_subjects(id,organization_id),
 foreign key (faculty_id,organization_id) references public.education_faculty(id,organization_id),
 check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.education_attendance_records (
 id uuid primary key default uuid_v7(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 session_id uuid not null,
 student_id uuid not null,
 attendance_status text not null check (attendance_status in ('present','absent','late','excused')),
 marked_by uuid references auth.users(id) on delete set null,
 marked_at timestamptz not null default now(),
 note text,
 unique (organization_id,id),
 unique (organization_id,session_id,student_id),
 foreign key (session_id,organization_id) references public.education_attendance_sessions(id,organization_id),
 foreign key (student_id,organization_id) references public.education_students(id,organization_id)
);

create index if not exists education_departments_org_campus_idx on public.education_departments(organization_id,campus_id);
create index if not exists education_programs_org_department_idx on public.education_programs(organization_id,department_id);
create index if not exists education_batches_org_year_idx on public.education_batches(organization_id,academic_year_id);
create index if not exists education_students_org_batch_idx on public.education_students(organization_id,batch_id);
create index if not exists education_students_org_department_idx on public.education_students(organization_id,department_id);
create index if not exists education_faculty_org_department_idx on public.education_faculty(organization_id,department_id);
create index if not exists education_enrollments_org_student_idx on public.education_enrollments(organization_id,student_id);
create index if not exists education_timetable_org_batch_idx on public.education_timetable_entries(organization_id,batch_id,weekday);
create index if not exists education_attendance_sessions_org_batch_date_idx on public.education_attendance_sessions(organization_id,batch_id,session_date);
create index if not exists education_attendance_records_org_student_idx on public.education_attendance_records(organization_id,student_id);

do $rls$
declare t text;
begin
 foreach t in array array[
 'education_institutions','education_campuses','education_departments','education_academic_years',
 'education_programs','education_batches','education_students','education_faculty','education_subjects',
 'education_enrollments','education_timetable_entries','education_attendance_sessions','education_attendance_records'
 ] loop
  execute format('alter table public.%I enable row level security',t);
 end loop;
end;
$rls$;

create policy education_institution_read on public.education_institutions for select to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.institution.read'));
create policy education_institution_insert on public.education_institutions for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.institution.update'));
create policy education_institution_update on public.education_institutions for update to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.institution.update'))
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.institution.update'));

create policy education_campuses_read on public.education_campuses for select to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.campus.read'));
create policy education_campuses_insert on public.education_campuses for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.campus.manage'));
create policy education_campuses_update on public.education_campuses for update to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.campus.manage'))
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.campus.manage'));
create policy education_campuses_delete on public.education_campuses for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.campus.manage'));

create policy education_departments_read on public.education_departments for select to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.department.read'));
create policy education_departments_insert on public.education_departments for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.department.manage'));
create policy education_departments_update on public.education_departments for update to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.department.manage'))
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.department.manage'));
create policy education_departments_delete on public.education_departments for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.department.manage'));

create policy education_academic_years_read on public.education_academic_years for select to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.read'));
create policy education_academic_years_insert on public.education_academic_years for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.manage'));
create policy education_academic_years_update on public.education_academic_years for update to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.manage'))
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.manage'));
create policy education_academic_years_delete on public.education_academic_years for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.manage'));

create policy education_programs_read on public.education_programs for select to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.read'));
create policy education_programs_insert on public.education_programs for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.manage'));
create policy education_programs_update on public.education_programs for update to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.manage'))
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.manage'));
create policy education_programs_delete on public.education_programs for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.manage'));

create policy education_batches_read on public.education_batches for select to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.read'));
create policy education_batches_insert on public.education_batches for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.manage'));
create policy education_batches_update on public.education_batches for update to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.manage'))
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.manage'));
create policy education_batches_delete on public.education_batches for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.manage'));

create policy education_students_read on public.education_students for select to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.student.read'));
create policy education_students_insert on public.education_students for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.student.manage'));
create policy education_students_update on public.education_students for update to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.student.manage'))
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.student.manage'));

create policy education_faculty_read on public.education_faculty for select to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.faculty.read'));
create policy education_faculty_insert on public.education_faculty for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.faculty.manage'));
create policy education_faculty_update on public.education_faculty for update to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.faculty.manage'))
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.faculty.manage'));

create policy education_subjects_read on public.education_subjects for select to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.read'));
create policy education_subjects_insert on public.education_subjects for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.manage'));
create policy education_subjects_update on public.education_subjects for update to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.manage'))
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.academic.manage'));

create policy education_enrollments_read on public.education_enrollments for select to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.student.read'));
create policy education_enrollments_insert on public.education_enrollments for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.student.manage'));
create policy education_enrollments_update on public.education_enrollments for update to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.student.manage'))
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.student.manage'));

create policy education_timetable_read on public.education_timetable_entries for select to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.timetable.read'));
create policy education_timetable_insert on public.education_timetable_entries for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.timetable.manage'));
create policy education_timetable_update on public.education_timetable_entries for update to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.timetable.manage'))
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.timetable.manage'));

create policy education_attendance_sessions_read on public.education_attendance_sessions for select to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.attendance.read'));
create policy education_attendance_sessions_insert on public.education_attendance_sessions for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.attendance.manage'));
create policy education_attendance_sessions_update on public.education_attendance_sessions for update to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.attendance.manage'))
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.attendance.manage'));

create policy education_attendance_records_read on public.education_attendance_records for select to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.attendance.read'));
create policy education_attendance_records_insert on public.education_attendance_records for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.attendance.manage'));
create policy education_attendance_records_update on public.education_attendance_records for update to authenticated
using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.attendance.manage'))
with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,'education.attendance.manage'));

grant select,insert,update on public.education_institutions to authenticated;
grant select,insert,update,delete on public.education_campuses,public.education_departments,public.education_academic_years,public.education_programs,public.education_batches to authenticated;
grant select,insert,update on public.education_students,public.education_faculty,public.education_subjects,public.education_enrollments,public.education_timetable_entries,public.education_attendance_sessions,public.education_attendance_records to authenticated;
revoke all on all tables in schema public from anon;
