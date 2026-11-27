-- Run against the staging database after the welcome-email migration.
-- The email delivery ledger intentionally has no client policies: only service_role may read or mutate it.
do $test$
declare
  claim_fn regprocedure := 'public.claim_welcome_email(uuid)'::regprocedure;
  expected_unique_columns text[];
begin
  if not exists (
    select 1 from pg_class
    where oid = 'public.email_delivery_events'::regclass
      and relrowsecurity
  ) then
    raise exception 'RLS is disabled on public.email_delivery_events';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'email_delivery_events'
  ) then
    raise exception 'Client RLS policies must not exist on the server-only email delivery ledger';
  end if;

  if has_table_privilege('anon', 'public.email_delivery_events', 'SELECT')
     or has_table_privilege('anon', 'public.email_delivery_events', 'INSERT')
     or has_table_privilege('anon', 'public.email_delivery_events', 'UPDATE')
     or has_table_privilege('anon', 'public.email_delivery_events', 'DELETE') then
    raise exception 'anon has a direct privilege on email_delivery_events';
  end if;

  if has_table_privilege('authenticated', 'public.email_delivery_events', 'SELECT')
     or has_table_privilege('authenticated', 'public.email_delivery_events', 'INSERT')
     or has_table_privilege('authenticated', 'public.email_delivery_events', 'UPDATE')
     or has_table_privilege('authenticated', 'public.email_delivery_events', 'DELETE') then
    raise exception 'authenticated has a direct privilege on email_delivery_events';
  end if;

  if not has_table_privilege('service_role', 'public.email_delivery_events', 'SELECT')
     or not has_table_privilege('service_role', 'public.email_delivery_events', 'INSERT')
     or not has_table_privilege('service_role', 'public.email_delivery_events', 'UPDATE')
     or not has_table_privilege('service_role', 'public.email_delivery_events', 'DELETE') then
    raise exception 'service_role is missing delivery-ledger privileges';
  end if;

  if (select prosecdef from pg_proc where oid = claim_fn) then
    raise exception 'claim_welcome_email must remain SECURITY INVOKER';
  end if;

  if has_function_privilege('anon', claim_fn, 'EXECUTE')
     or has_function_privilege('authenticated', claim_fn, 'EXECUTE') then
    raise exception 'Client roles can execute claim_welcome_email';
  end if;

  if not has_function_privilege('service_role', claim_fn, 'EXECUTE') then
    raise exception 'service_role cannot execute claim_welcome_email';
  end if;

  select array_agg(a.attname::text order by k.ordinality)
  into expected_unique_columns
  from pg_constraint c
  cross join lateral unnest(c.conkey) with ordinality as k(attnum, ordinality)
  join pg_attribute a
    on a.attrelid = c.conrelid and a.attnum = k.attnum
  where c.conrelid = 'public.email_delivery_events'::regclass
    and c.contype = 'u'
  group by c.oid
  having array_agg(a.attname::text order by k.ordinality) = array['user_id', 'event_type']::text[]
  limit 1;

  if expected_unique_columns is null then
    raise exception 'Unique (user_id, event_type) idempotency constraint is missing';
  end if;
end;
$test$;

select 'email_delivery_events RLS and server-only grants: PASS' as assertion;
