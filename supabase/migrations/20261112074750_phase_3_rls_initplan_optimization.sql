
-- Cache auth context once per statement rather than once per row in RLS predicates.
drop policy if exists education_students_claim_read on public.education_students;
create policy education_students_claim_read on public.education_students for select to authenticated
using(organization_id=public.current_organization_id() and user_id is null and lower(email::text)=lower((select auth.jwt())->>'email') and public.has_org_role(organization_id,array['student']));
drop policy if exists education_students_claim_own on public.education_students;
create policy education_students_claim_own on public.education_students for update to authenticated
using(organization_id=public.current_organization_id() and user_id is null and lower(email::text)=lower((select auth.jwt())->>'email') and public.has_org_role(organization_id,array['student']))
with check(organization_id=public.current_organization_id() and user_id=(select auth.uid()) and lower(email::text)=lower((select auth.jwt())->>'email') and public.has_org_role(organization_id,array['student']));

drop policy if exists education_faculty_claim_read on public.education_faculty;
create policy education_faculty_claim_read on public.education_faculty for select to authenticated
using(organization_id=public.current_organization_id() and member_id is null and lower(email::text)=lower((select auth.jwt())->>'email') and exists(select 1 from public.organization_members om where om.organization_id=education_faculty.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher'));
drop policy if exists education_faculty_claim on public.education_faculty;
create policy education_faculty_claim on public.education_faculty for update to authenticated
using(organization_id=public.current_organization_id() and member_id is null and lower(email::text)=lower((select auth.jwt())->>'email') and exists(select 1 from public.organization_members om where om.organization_id=education_faculty.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher'))
with check(organization_id=public.current_organization_id() and exists(select 1 from public.organization_members om where om.id=member_id and om.organization_id=education_faculty.organization_id and om.user_id=(select auth.uid()) and om.status='active' and om.role='teacher'));

drop policy if exists education_guardians_claim_read on public.education_guardians;
create policy education_guardians_claim_read on public.education_guardians for select to authenticated
using(organization_id=public.current_organization_id() and user_id is null and lower(email::text)=lower((select auth.jwt())->>'email') and public.has_org_role(organization_id,array['parent']));
drop policy if exists education_guardians_claim on public.education_guardians;
create policy education_guardians_claim on public.education_guardians for update to authenticated
using(organization_id=public.current_organization_id() and user_id is null and lower(email::text)=lower((select auth.jwt())->>'email') and public.has_org_role(organization_id,array['parent']))
with check(organization_id=public.current_organization_id() and user_id=(select auth.uid()) and lower(email::text)=lower((select auth.jwt())->>'email') and public.has_org_role(organization_id,array['parent']));

drop policy if exists "own notifications" on public.notifications;
create policy "own notifications" on public.notifications for select to authenticated
using(organization_id=public.current_organization_id() and user_id=(select auth.uid()));
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select to authenticated using(id=(select auth.uid()));
drop policy if exists "own settings" on public.user_settings;
create policy "own settings" on public.user_settings for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "own legal consents" on public.legal_consents;
create policy "own legal consents" on public.legal_consents for select to authenticated using(user_id=(select auth.uid()));
