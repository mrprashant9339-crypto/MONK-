create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id=target_org
      and om.user_id=(select auth.uid())
      and om.status='active'
  );
$$;
revoke all on function public.is_org_member(uuid) from public,anon;
grant execute on function public.is_org_member(uuid) to authenticated;