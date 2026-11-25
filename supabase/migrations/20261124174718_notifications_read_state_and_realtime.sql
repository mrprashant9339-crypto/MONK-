-- Secure per-user notification read state and enable Postgres Changes delivery.
-- The existing SELECT policy remains the authority for reading notifications.
drop policy if exists "users update own notification read state" on public.notifications;
create policy "users update own notification read state"
on public.notifications
for update
to authenticated
using (
  organization_id = (select public.current_organization_id())
  and user_id = (select auth.uid())
)
with check (
  organization_id = (select public.current_organization_id())
  and user_id = (select auth.uid())
);

-- Limit client-side writes to the read marker only; content remains server-managed.
grant update (read_at) on table public.notifications to authenticated;

-- Add the existing table to the managed Realtime publication (no custom realtime objects).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
