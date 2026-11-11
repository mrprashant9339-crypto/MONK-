-- Applied to MONK Supabase project on 2026-11-11.
-- Preserve the existing multi-tenant model. Clients may read only through RLS
-- and may mutate tasks/projects only through validated authenticated RPCs.

alter table public.tasks enable row level security;
alter table public.projects enable row level security;

revoke all on table public.tasks from anon, authenticated;
revoke all on table public.projects from anon, authenticated;
grant select on table public.tasks to authenticated;
grant select on table public.projects to authenticated;

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
  loop
    execute format('revoke execute on function %s from public, anon', fn.signature);
  end loop;
end
$$;

grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;
grant execute on function public.can_read_project(uuid, uuid) to authenticated;
grant execute on function public.can_read_task(uuid, uuid) to authenticated;
grant execute on function public.can_read_file(uuid, uuid) to authenticated;

grant execute on function public.create_organization(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.create_project(text, text, text, uuid, date, text) to authenticated;
grant execute on function public.create_task(uuid, text, date, text) to authenticated;
grant execute on function public.update_task(uuid, text, text) to authenticated;
grant execute on function public.switch_organization(uuid) to authenticated;
grant execute on function public.create_contact(text, text, text, text, text, text, text[]) to authenticated;
grant execute on function public.create_lead(text, text, text, text, text) to authenticated;
grant execute on function public.review_document(uuid, text, text) to authenticated;
