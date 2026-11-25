-- Phase 2 support intake security regression checks.
-- Run against a migrated Supabase project with psql -v ON_ERROR_STOP=1.
-- The support tables are intentionally server-only; the public form reaches them via
-- the rate-limited support-ticket-intake Edge Function, not direct PostgREST access.

do $test$
declare
  target_table text;
  rate_limit_function oid;
  function_security_definer boolean;
  function_config text[];
begin
  foreach target_table in array array['support_tickets','support_intake_rate_limits'] loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target_table
        and c.relkind = 'r'
        and c.relrowsecurity
    ) then
      raise exception 'Support table must exist with RLS enabled: public.%', target_table;
    end if;

    if exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = target_table
    ) then
      raise exception 'Support table must not expose direct client RLS policies: public.%', target_table;
    end if;

    if has_table_privilege('anon', format('public.%I', target_table), 'SELECT')
       or has_table_privilege('anon', format('public.%I', target_table), 'INSERT')
       or has_table_privilege('anon', format('public.%I', target_table), 'UPDATE')
       or has_table_privilege('anon', format('public.%I', target_table), 'DELETE')
       or has_table_privilege('authenticated', format('public.%I', target_table), 'SELECT')
       or has_table_privilege('authenticated', format('public.%I', target_table), 'INSERT')
       or has_table_privilege('authenticated', format('public.%I', target_table), 'UPDATE')
       or has_table_privilege('authenticated', format('public.%I', target_table), 'DELETE') then
      raise exception 'Support table grants must remain unavailable to anon/authenticated: public.%', target_table;
    end if;
  end loop;

  select p.oid, p.prosecdef, p.proconfig
    into rate_limit_function, function_security_definer, function_config
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'consume_support_intake_rate_limit'
    and pg_get_function_identity_arguments(p.oid) = 'p_ip_hash text, p_window_start timestamp with time zone, p_limit integer';

  if rate_limit_function is null then
    raise exception 'Support intake rate-limit function is missing';
  end if;

  if function_security_definer then
    raise exception 'Rate-limit function must not run as SECURITY DEFINER';
  end if;

  if not coalesce(function_config, array[]::text[]) @> array['search_path=""']::text[] then
    raise exception 'Rate-limit function must have an empty search_path';
  end if;

  if has_function_privilege('anon', rate_limit_function, 'EXECUTE')
     or has_function_privilege('authenticated', rate_limit_function, 'EXECUTE')
     or not has_function_privilege('service_role', rate_limit_function, 'EXECUTE') then
    raise exception 'Rate-limit function must be executable by service_role only';
  end if;
end;
$test$;
