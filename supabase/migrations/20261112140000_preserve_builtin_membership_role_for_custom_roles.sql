create or replace function public.assign_organization_member_role(target_org uuid, target_member uuid, built_in_role text default null, custom_role uuid default null)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not public.has_org_permission(target_org,'organization.members.manage') then raise exception 'Permission denied' using errcode='42501'; end if;
  if (built_in_role is null) = (custom_role is null) then raise exception 'Choose exactly one built-in or custom role' using errcode='22023'; end if;
  if built_in_role is not null and not exists(select 1 from public.roles where id=built_in_role and is_system) then raise exception 'Unknown built-in role' using errcode='22023'; end if;
  if custom_role is not null and not exists(select 1 from public.organization_roles where id=custom_role and organization_id=target_org and is_active) then raise exception 'Unknown custom role' using errcode='22023'; end if;
  -- Keep the required built-in FK valid; custom permissions are evaluated through organization_role_id.
  update public.organization_members
  set role=coalesce(built_in_role,'contributor'), organization_role_id=custom_role, updated_at=now()
  where id=target_member and organization_id=target_org;
  if not found then raise exception 'Member not found in organization' using errcode='P0002'; end if;
  insert into public.activities(organization_id,actor_user_id,resource_type,resource_id,kind,body)
  values(target_org,auth.uid(),'organization_member',target_member,'system','Updated organization member role');
end;
$$;
revoke all on function public.assign_organization_member_role(uuid,uuid,text,uuid) from public,anon;
grant execute on function public.assign_organization_member_role(uuid,uuid,text,uuid) to authenticated;