-- Education members must be recognized by organization switching and organization visibility.
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select public.has_org_role(target_org, array[
    'owner','admin','manager','sales','contributor','client','vendor','auditor',
    'principal','hod','teacher','student','parent'
  ]::text[]);
$$;

revoke all on function public.is_org_member(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;

-- Fix tautological tenant comparisons in parent/student relationship reads.
drop policy if exists education_student_guardians_parent_read on public.education_student_guardians;
create policy education_student_guardians_parent_read
on public.education_student_guardians
for select to authenticated
using (
  organization_id = public.current_organization_id()
  and exists (
    select 1
    from public.education_guardians g
    where g.id = education_student_guardians.guardian_id
      and g.organization_id = education_student_guardians.organization_id
      and g.user_id = auth.uid()
  )
);

drop policy if exists education_student_guardians_student_read on public.education_student_guardians;
create policy education_student_guardians_student_read
on public.education_student_guardians
for select to authenticated
using (
  organization_id = public.current_organization_id()
  and exists (
    select 1
    from public.education_students s
    where s.id = education_student_guardians.student_id
      and s.organization_id = education_student_guardians.organization_id
      and s.user_id = auth.uid()
  )
);
