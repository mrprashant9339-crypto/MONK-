-- Ensure the member listing RPC returns the declared text type across Supabase Postgres versions.
create or replace function public.list_organization_members()
returns table(member_id uuid,user_id uuid,email text,full_name text,role text,status text,created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare org_id uuid := public.current_organization_id();
begin
  if auth.uid() is null or org_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if not (public.has_org_permission(org_id,'organization.members.invite')
       or public.has_org_permission(org_id,'organization.members.update')) then
    raise exception 'Permission denied' using errcode='42501';
  end if;
  return query
  select om.id,om.user_id,coalesce(u.email::text,''::text),coalesce(p.full_name,''::text),om.role,om.status,om.created_at
    from public.organization_members om
    join auth.users u on u.id=om.user_id
    left join public.profiles p on p.id=om.user_id
   where om.organization_id=org_id
   order by case when om.role='owner' then 0 else 1 end,om.created_at;
end;
$function$;
revoke all on function public.list_organization_members() from public,anon;
grant execute on function public.list_organization_members() to authenticated;