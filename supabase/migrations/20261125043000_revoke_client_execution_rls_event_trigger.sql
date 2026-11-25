-- Event-trigger functions are invoked by PostgreSQL's DDL event system, not by API clients.
-- Some reconstructed staging baselines do not install the helper/event trigger.
do $migration$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$migration$;
