do $migration$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prosecdef
      and has_function_privilege('authenticated',p.oid,'EXECUTE')
  loop
    execute format(
      'alter function %s set search_path = pg_catalog, public, extensions, pg_temp',
      f.signature
    );
  end loop;
end;
$migration$;
