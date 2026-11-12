-- Keep the student's active batch enrollment synchronized even when a permitted client writes the student row directly.
create or replace function public.education_sync_student_enrollment()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  academic_year uuid;
begin
  if tg_op='UPDATE' and new.batch_id is not distinct from old.batch_id then
    return new;
  end if;

  if tg_op='UPDATE' then
    update public.education_enrollments
       set status='transferred',updated_at=now()
     where organization_id=new.organization_id and student_id=new.id and status='active';
  end if;

  if new.batch_id is not null then
    select academic_year_id into academic_year
      from public.education_batches
     where id=new.batch_id and organization_id=new.organization_id and status='active';
    if academic_year is null then
      raise exception 'Student batch must be active and belong to the same organization' using errcode='23514';
    end if;
    insert into public.education_enrollments(organization_id,student_id,batch_id,academic_year_id,status)
    values(new.organization_id,new.id,new.batch_id,academic_year,'active')
    on conflict (organization_id,student_id,batch_id,academic_year_id)
    do update set status='active',updated_at=now();
  end if;
  return new;
end;
$function$;

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
  new_student_id uuid;
begin
  if auth.uid() is null or org_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if not public.has_org_permission(org_id,'education.student.manage') then
    raise exception 'Permission denied' using errcode='42501';
  end if;
  if target_batch_id is not null and not exists (
    select 1 from public.education_batches
     where id=target_batch_id and organization_id=org_id and status='active'
  ) then
    raise exception 'Active batch not found in this organization' using errcode='P0002';
  end if;
  insert into public.education_students(
    organization_id,admission_number,full_name,email,phone,guardian_name,guardian_phone,batch_id
  ) values (
    org_id,upper(trim(admission_number)),trim(full_name),nullif(trim(student_email),''),
    nullif(trim(student_phone),''),nullif(trim(guardian_name),''),nullif(trim(guardian_phone),''),target_batch_id
  ) returning id into new_student_id;
  return new_student_id;
end;
$function$;
revoke all on function public.admit_education_student(text,text,text,text,text,text,uuid) from public,anon;
grant execute on function public.admit_education_student(text,text,text,text,text,text,uuid) to authenticated;

drop trigger if exists education_student_enrollment_sync on public.education_students;
create trigger education_student_enrollment_sync
after insert or update of batch_id on public.education_students
for each row execute function public.education_sync_student_enrollment();
revoke all on function public.education_sync_student_enrollment() from public,anon;
