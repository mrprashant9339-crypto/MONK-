create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_ref text not null unique default (
    'MONK-' || to_char(timezone('utc', now()), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  full_name text not null check (char_length(full_name) between 2 and 80),
  email text not null check (char_length(email) between 5 and 254),
  category text not null check (char_length(category) between 2 and 80),
  subject text not null check (char_length(subject) between 4 and 120),
  message text not null check (char_length(message) between 10 and 4000),
  status text not null default 'received' check (status in ('received','in_progress','resolved','closed')),
  notification_status text not null default 'pending' check (notification_status in ('pending','sent','failed','not_configured')),
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_created_at_idx on public.support_tickets (created_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets (status, created_at desc);
alter table public.support_tickets enable row level security;
revoke all on table public.support_tickets from anon, authenticated;
grant all on table public.support_tickets to service_role;
create table if not exists public.support_intake_rate_limits (
  ip_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (ip_hash, window_start)
);
alter table public.support_intake_rate_limits enable row level security;
revoke all on table public.support_intake_rate_limits from anon, authenticated;
grant all on table public.support_intake_rate_limits to service_role;
create or replace function public.consume_support_intake_rate_limit(
  p_ip_hash text, p_window_start timestamptz, p_limit integer default 5
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_count integer;
begin
  delete from public.support_intake_rate_limits where window_start < now() - interval '24 hours';
  insert into public.support_intake_rate_limits (ip_hash, window_start, request_count)
  values (p_ip_hash, p_window_start, 1)
  on conflict (ip_hash, window_start)
  do update set request_count = public.support_intake_rate_limits.request_count + 1
  returning request_count into v_count;
  return v_count <= p_limit;
end;
$$;
revoke all on function public.consume_support_intake_rate_limit(text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.consume_support_intake_rate_limit(text, timestamptz, integer) to service_role;
