-- MONK: tenant-safe task editing and soft archival RPCs
-- These RPCs mirror the authorization model of public.update_task and never expose direct table writes.

create or replace function public.update_task_details(
  target_task_id uuid,
  next_title text,
  next_priority text,
  next_due_date date default null
)
returns public.tasks
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  org_id uuid := public.current_organization_id();
  previous_task public.tasks;
  changed_task public.tasks;
begin
  if auth.uid() is null or org_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into previous_task
  from public.tasks
  where id = target_task_id
    and organization_id = org_id
    and deleted_at is null
  for update;

  if previous_task.id is null or not public.can_read_task(target_task_id, org_id) then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;

  if not public.has_org_role(org_id, array['owner','admin','manager'])
     and not (
       public.has_org_role(org_id, array['contributor','vendor'])
       and previous_task.assignee_id = public.current_member_id()
     ) then
    raise exception 'Permission denied' using errcode = '42501';
  end if;

  if next_title is null or length(trim(next_title)) < 1 or length(trim(next_title)) > 240 then
    raise exception 'Task title must contain between 1 and 240 characters' using errcode = '22023';
  end if;

  if next_priority not in ('low','medium','high','urgent') then
    raise exception 'Unsupported task priority' using errcode = '22023';
  end if;

  update public.tasks
  set title = trim(next_title),
      priority = next_priority,
      due_date = next_due_date,
      updated_at = now()
  where id = target_task_id and organization_id = org_id
  returning * into changed_task;

  perform public.record_audit(
    org_id, 'task.details_updated', 'task', target_task_id::text,
    jsonb_build_object('title', previous_task.title, 'priority', previous_task.priority, 'due_date', previous_task.due_date),
    jsonb_build_object('title', changed_task.title, 'priority', changed_task.priority, 'due_date', changed_task.due_date)
  );

  return changed_task;
end;
$function$;

create or replace function public.archive_task(target_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  org_id uuid := public.current_organization_id();
  previous_task public.tasks;
begin
  if auth.uid() is null or org_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into previous_task
  from public.tasks
  where id = target_task_id
    and organization_id = org_id
    and deleted_at is null
  for update;

  if previous_task.id is null or not public.can_read_task(target_task_id, org_id) then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;

  if not public.has_org_role(org_id, array['owner','admin','manager'])
     and not (
       public.has_org_role(org_id, array['contributor','vendor'])
       and previous_task.assignee_id = public.current_member_id()
     ) then
    raise exception 'Permission denied' using errcode = '42501';
  end if;

  update public.tasks
  set deleted_at = now(), updated_at = now()
  where id = target_task_id and organization_id = org_id;

  perform public.record_audit(
    org_id, 'task.archived', 'task', target_task_id::text,
    to_jsonb(previous_task),
    jsonb_build_object('deleted_at', now())
  );
end;
$function$;

revoke all on function public.update_task_details(uuid, text, text, date) from public, anon;
revoke all on function public.archive_task(uuid) from public, anon;
grant execute on function public.update_task_details(uuid, text, text, date) to authenticated;
grant execute on function public.archive_task(uuid) to authenticated;
