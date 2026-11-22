-- Student and guardian record claiming must require a confirmed Supabase Auth email.
create or replace function public.current_user_email_verified()
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;

revoke all on function public.current_user_email_verified() from public, anon;
grant execute on function public.current_user_email_verified() to authenticated;

drop policy if exists education_students_claim_read on public.education_students;
create policy education_students_claim_read
on public.education_students
for select to authenticated
using (
  organization_id = public.current_organization_id()
  and user_id is null
  and lower(email::text) = lower(auth.jwt()->>'email')
  and public.current_user_email_verified()
  and public.has_org_role(organization_id, array['student'])
);

drop policy if exists education_students_claim_own on public.education_students;
create policy education_students_claim_own
on public.education_students
for update to authenticated
using (
  organization_id = public.current_organization_id()
  and user_id is null
  and lower(email::text) = lower(auth.jwt()->>'email')
  and public.current_user_email_verified()
  and public.has_org_role(organization_id, array['student'])
)
with check (
  organization_id = public.current_organization_id()
  and user_id = auth.uid()
  and lower(email::text) = lower(auth.jwt()->>'email')
  and public.current_user_email_verified()
  and public.has_org_role(organization_id, array['student'])
);

drop policy if exists education_guardians_claim_read on public.education_guardians;
create policy education_guardians_claim_read
on public.education_guardians
for select to authenticated
using (
  organization_id = public.current_organization_id()
  and user_id is null
  and lower(email::text) = lower(auth.jwt()->>'email')
  and public.current_user_email_verified()
  and public.has_org_role(organization_id, array['parent'])
);

drop policy if exists education_guardians_claim on public.education_guardians;
create policy education_guardians_claim
on public.education_guardians
for update to authenticated
using (
  organization_id = public.current_organization_id()
  and user_id is null
  and lower(email::text) = lower(auth.jwt()->>'email')
  and public.current_user_email_verified()
  and public.has_org_role(organization_id, array['parent'])
)
with check (
  organization_id = public.current_organization_id()
  and user_id = auth.uid()
  and lower(email::text) = lower(auth.jwt()->>'email')
  and public.current_user_email_verified()
  and public.has_org_role(organization_id, array['parent'])
);
