-- Workspace membership, invitation and audit writes must pass through
-- SECURITY DEFINER RPCs that validate tenant membership and permissions.
-- Authenticated clients retain RLS-filtered reads but cannot mutate these tables.
alter table public.organization_members enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_logs enable row level security;

revoke insert, update, delete, truncate, references, trigger
  on table public.organization_members, public.invitations, public.audit_logs
  from anon, authenticated;
