create table if not exists public.email_delivery_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('welcome')),
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  provider_message_id text,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (user_id, event_type)
);

create index if not exists email_delivery_events_status_updated_idx
  on public.email_delivery_events (status, updated_at);

alter table public.email_delivery_events enable row level security;
revoke all on table public.email_delivery_events from public, anon, authenticated;
grant all on table public.email_delivery_events to service_role;

create or replace function public.claim_welcome_email(p_user_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_claimed uuid;
begin
  insert into public.email_delivery_events (user_id, event_type, status)
  values (p_user_id, 'welcome', 'pending')
  on conflict (user_id, event_type) do nothing;

  update public.email_delivery_events
  set status = 'sending',
      attempts = attempts + 1,
      updated_at = now(),
      last_error = null
  where user_id = p_user_id
    and event_type = 'welcome'
    and (
      status in ('pending', 'failed')
      or (status = 'sending' and updated_at < now() - interval '5 minutes')
    )
  returning id into v_claimed;

  return v_claimed is not null;
end;
$$;

revoke all on function public.claim_welcome_email(uuid) from public, anon, authenticated;
grant execute on function public.claim_welcome_email(uuid) to service_role;
