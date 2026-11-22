-- MONK production security posture audit (read-only).
-- Run in Supabase SQL Editor as postgres. This script does not modify data or schema.

-- 1. Exposed public tables with browser SELECT grants but RLS disabled.
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and not c.relrowsecurity
  and (
    has_table_privilege('anon', c.oid, 'SELECT')
    or has_table_privilege('authenticated', c.oid, 'SELECT')
  )
order by c.relname;

-- 2. SECURITY DEFINER functions executable by browser roles.
-- Review each function's body and caller contract; authenticated execution is not
-- automatically a vulnerability, but every RPC must enforce identity and tenant scope.
select p.oid::regprocedure::text as function_signature,
       p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       p.proconfig as function_settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and (
    has_function_privilege('anon', p.oid, 'EXECUTE')
    or has_function_privilege('authenticated', p.oid, 'EXECUTE')
  )
order by p.proname;

-- 3. Public views which do not use security_invoker.
select c.relname as view_name,
       coalesce((
         select option_value
         from pg_options_to_table(c.reloptions)
         where option_name = 'security_invoker'
       ), 'false') as security_invoker
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'v'
  and coalesce((
    select option_value
    from pg_options_to_table(c.reloptions)
    where option_name = 'security_invoker'
  ), 'false') <> 'true'
order by c.relname;

-- 4. Browser-role access to server-owned tenant flags must remain false.
select has_table_privilege('anon', 'public.tenant_flags', 'SELECT') as anon_select,
       has_table_privilege('authenticated', 'public.tenant_flags', 'SELECT') as authenticated_select,
       has_table_privilege('anon', 'public.tenant_flags', 'INSERT') as anon_insert,
       has_table_privilege('authenticated', 'public.tenant_flags', 'INSERT') as authenticated_insert;
