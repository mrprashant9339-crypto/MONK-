-- Prevent automatic retries after the Resend idempotency window when provider delivery is uncertain.
-- Operators must reconcile the Resend event before moving manual_review back to failed.
alter table public.email_delivery_events
  drop constraint if exists email_delivery_events_status_check;

alter table public.email_delivery_events
  add constraint email_delivery_events_status_check
  check (status in ('pending', 'sending', 'sent', 'failed', 'manual_review'));

update public.email_delivery_events
set status = 'manual_review',
    last_error = coalesce(last_error, 'DELIVERY_UNCERTAIN: Stale sending event exceeded the provider idempotency window; reconcile before retrying.'),
    updated_at = now()
where status = 'sending'
  and updated_at < now() - interval '24 hours';

create or replace function public.claim_welcome_email(p_user_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_claimed uuid;
begin
  -- A stale send is safe to retry only while the provider's idempotency key is still valid.
  -- After 24 hours, leave the event in manual_review rather than risk delivering a duplicate.
  update public.email_delivery_events
  set status = 'manual_review',
      last_error = 'DELIVERY_UNCERTAIN: Stale sending event exceeded the provider idempotency window; reconcile before retrying.',
      updated_at = now()
  where user_id = p_user_id
    and event_type = 'welcome'
    and status = 'sending'
    and updated_at < now() - interval '24 hours';

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
      or (
        status = 'sending'
        and updated_at < now() - interval '5 minutes'
        and updated_at >= now() - interval '24 hours'
      )
    )
  returning id into v_claimed;

  return v_claimed is not null;
end;
$$;

revoke all on function public.claim_welcome_email(uuid) from public, anon, authenticated;
grant execute on function public.claim_welcome_email(uuid) to service_role;
