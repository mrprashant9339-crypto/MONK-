-- Business tenant-isolation regression checks.
-- Run with psql -v ON_ERROR_STOP=1 against a migrated Supabase project.

do $test$
declare
  bad_table text;
  bad_policy text;
begin
  select c.relname into bad_table
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and c.relname like 'business_%'
    and not c.relrowsecurity
  limit 1;
  if bad_table is not null then
    raise exception 'Business table % does not have RLS enabled',bad_table;
  end if;

  select p.tablename || '.' || p.policyname into bad_policy
  from pg_policies p
  where p.schemaname='public'
    and p.tablename like 'business_%'
    and 'authenticated'=any(p.roles)
    and coalesce(p.qual,'') || coalesce(p.with_check,'') not ilike '%current_organization_id%'
  limit 1;
  if bad_policy is not null then
    raise exception 'Business policy % is missing active-organization scoping',bad_policy;
  end if;

  select p.tablename || '.' || p.policyname into bad_policy
  from pg_policies p
  where p.schemaname='public'
    and p.tablename like 'business_%'
    and 'authenticated'=any(p.roles)
    and coalesce(p.qual,'') || coalesce(p.with_check,'') not ilike '%has_org_permission%'
  limit 1;
  if bad_policy is not null then
    raise exception 'Business policy % is missing permission checks',bad_policy;
  end if;
end;
$test$;
