begin;

create or replace function public.create_organization_role(target_org uuid, role_name text, role_description text default '')
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not public.has_org_permission(target_org,'organization.roles.manage') then raise exception 'Permission denied' using errcode='42501'; end if;
  if length(trim(coalesce(role_name,''))) not between 2 and 60 then raise exception 'Role name must be 2-60 characters' using errcode='22023'; end if;
  insert into public.organization_roles(organization_id,name,description,created_by)
  values(target_org,trim(role_name),coalesce(role_description,''),auth.uid())
  returning id into new_id;
  insert into public.activities(organization_id,actor_user_id,resource_type,resource_id,kind,body)
  values(target_org,auth.uid(),'organization_role',new_id,'system','Created custom role: '||trim(role_name));
  return new_id;
end;
$$;

create or replace function public.set_organization_role_permissions(target_org uuid, target_role uuid, permission_keys text[])
returns integer
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare inserted_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not public.has_org_permission(target_org,'organization.roles.manage') then raise exception 'Permission denied' using errcode='42501'; end if;
  if not exists(select 1 from public.organization_roles where id=target_role and organization_id=target_org and is_active) then raise exception 'Role not found' using errcode='P0002'; end if;
  if exists(select 1 from unnest(coalesce(permission_keys,'{}'::text[])) k where not exists(select 1 from public.permissions p where p.id=k)) then
    raise exception 'Unknown permission key' using errcode='22023';
  end if;
  delete from public.organization_role_permissions where organization_id=target_org and organization_role_id=target_role;
  insert into public.organization_role_permissions(organization_id,organization_role_id,permission_id)
  select target_org,target_role,k from (select distinct unnest(coalesce(permission_keys,'{}'::text[])) as k) keys;
  get diagnostics inserted_count=row_count;
  return inserted_count;
end;
$$;

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
  update public.organization_members
  set role=coalesce(built_in_role,'custom'), organization_role_id=custom_role, updated_at=now()
  where id=target_member and organization_id=target_org;
  if not found then raise exception 'Member not found in organization' using errcode='P0002'; end if;
  insert into public.activities(organization_id,actor_user_id,resource_type,resource_id,kind,body)
  values(target_org,auth.uid(),'organization_member',target_member,'system','Updated organization member role');
end;
$$;

create or replace function public.create_team(target_org uuid, team_name text, team_description text default '', team_type text default 'functional', parent_team uuid default null)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not public.has_org_permission(target_org,'teams.manage') then raise exception 'Permission denied' using errcode='42501'; end if;
  if length(trim(coalesce(team_name,''))) not between 2 and 80 then raise exception 'Team name must be 2-80 characters' using errcode='22023'; end if;
  if team_type not in ('functional','project','sales','operations','support') then raise exception 'Invalid team type' using errcode='22023'; end if;
  if parent_team is not null and not exists(select 1 from public.teams where id=parent_team and organization_id=target_org and is_active) then raise exception 'Parent team not found' using errcode='P0002'; end if;
  insert into public.teams(organization_id,parent_team_id,name,description,team_type,created_by)
  values(target_org,parent_team,trim(team_name),coalesce(team_description,''),team_type,auth.uid())
  returning id into new_id;
  insert into public.activities(organization_id,actor_user_id,resource_type,resource_id,kind,body)
  values(target_org,auth.uid(),'team',new_id,'system','Created team: '||trim(team_name));
  return new_id;
end;
$$;

create or replace function public.add_team_member(target_org uuid, target_team uuid, target_member uuid, next_team_role text default 'member')
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not public.has_org_permission(target_org,'teams.manage') then raise exception 'Permission denied' using errcode='42501'; end if;
  if next_team_role not in ('lead','manager','member') then raise exception 'Invalid team role' using errcode='22023'; end if;
  if not exists(select 1 from public.teams where id=target_team and organization_id=target_org and is_active) then raise exception 'Team not found' using errcode='P0002'; end if;
  if not exists(select 1 from public.organization_members where id=target_member and organization_id=target_org and status='active') then raise exception 'Active organization member not found' using errcode='P0002'; end if;
  insert into public.team_members(organization_id,team_id,organization_member_id,team_role)
  values(target_org,target_team,target_member,next_team_role)
  on conflict(team_id,organization_member_id) do update set team_role=excluded.team_role
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.create_crm_pipeline(target_org uuid, pipeline_name text)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare new_pipeline uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not public.has_org_permission(target_org,'crm.pipeline.manage') then raise exception 'Permission denied' using errcode='42501'; end if;
  if length(trim(coalesce(pipeline_name,''))) not between 2 and 80 then raise exception 'Pipeline name must be 2-80 characters' using errcode='22023'; end if;
  insert into public.crm_pipelines(organization_id,name,is_default,created_by)
  values(target_org,trim(pipeline_name),not exists(select 1 from public.crm_pipelines where organization_id=target_org and is_default),auth.uid())
  returning id into new_pipeline;
  insert into public.crm_pipeline_stages(organization_id,pipeline_id,name,position,probability) values
  (target_org,new_pipeline,'New',0,10),
  (target_org,new_pipeline,'Qualified',1,25),
  (target_org,new_pipeline,'Proposal',2,50),
  (target_org,new_pipeline,'Negotiation',3,75),
  (target_org,new_pipeline,'Won',4,100),
  (target_org,new_pipeline,'Lost',5,0);
  return new_pipeline;
end;
$$;

create or replace function public.move_opportunity_stage(target_org uuid, target_opportunity uuid, next_stage uuid, next_status text default 'open', next_loss_reason text default null)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare old_stage uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not public.has_org_permission(target_org,'crm.opportunities.manage') then raise exception 'Permission denied' using errcode='42501'; end if;
  if next_status not in ('open','won','lost') then raise exception 'Invalid opportunity status' using errcode='22023'; end if;
  if not exists(select 1 from public.crm_pipeline_stages where id=next_stage and organization_id=target_org) then raise exception 'Stage not found' using errcode='P0002'; end if;
  update public.opportunities set stage_id=next_stage,status=next_status,loss_reason=case when next_status='lost' then nullif(trim(next_loss_reason),'') else null end,updated_at=now()
  where id=target_opportunity and organization_id=target_org and deleted_at is null returning stage_id into old_stage;
  if not found then raise exception 'Opportunity not found' using errcode='P0002'; end if;
  insert into public.activities(organization_id,actor_user_id,resource_type,resource_id,kind,body)
  values(target_org,auth.uid(),'opportunity',target_opportunity,'stage_change','Opportunity stage/status changed to '||next_status);
end;
$$;

revoke all on function public.create_organization_role(uuid,text,text) from public,anon;
revoke all on function public.set_organization_role_permissions(uuid,uuid,text[]) from public,anon;
revoke all on function public.assign_organization_member_role(uuid,uuid,text,uuid) from public,anon;
revoke all on function public.create_team(uuid,text,text,text,uuid) from public,anon;
revoke all on function public.add_team_member(uuid,uuid,uuid,text) from public,anon;
revoke all on function public.create_crm_pipeline(uuid,text) from public,anon;
revoke all on function public.move_opportunity_stage(uuid,uuid,uuid,text,text) from public,anon;
grant execute on function public.create_organization_role(uuid,text,text) to authenticated;
grant execute on function public.set_organization_role_permissions(uuid,uuid,text[]) to authenticated;
grant execute on function public.assign_organization_member_role(uuid,uuid,text,uuid) to authenticated;
grant execute on function public.create_team(uuid,text,text,text,uuid) to authenticated;
grant execute on function public.add_team_member(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.create_crm_pipeline(uuid,text) to authenticated;
grant execute on function public.move_opportunity_stage(uuid,uuid,uuid,text,text) to authenticated;

commit;