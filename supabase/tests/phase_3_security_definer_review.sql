-- Review assertions for every public SECURITY DEFINER function.
-- This test intentionally preserves required authenticated RPCs; it checks their guard rails
-- rather than blindly revoking functions used by RLS policies and application workflows.
do $security_review$
declare
  bad record;
  total_functions integer;
begin
  select count(*) into total_functions
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef;

  if total_functions < 1 then
    raise exception 'Expected public SECURITY DEFINER functions to review';
  end if;

  select p.proname, p.oid::regprocedure::text as signature
  into bad
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and not exists (
      select 1 from unnest(coalesce(p.proconfig, array[]::text[])) setting
      where setting like 'search_path=%'
    )
  limit 1;
  if found then
    raise exception 'SECURITY DEFINER function has no pinned search_path: %', bad.signature;
  end if;

  select p.proname, p.oid::regprocedure::text as signature
  into bad
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and (
      has_function_privilege('anon', p.oid, 'EXECUTE')
      or exists (
        select 1
        from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
        where a.grantee = 0 and a.privilege_type = 'EXECUTE'
      )
    )
  limit 1;
  if found then
    raise exception 'SECURITY DEFINER function is callable by anon/PUBLIC: %', bad.signature;
  end if;

  select p.proname, p.oid::regprocedure::text as signature
  into bad
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and has_function_privilege('authenticated', p.oid, 'EXECUTE')
    and pg_get_functiondef(p.oid) !~* '\\m(auth\\.uid\\(\\)|current_organization_id\\(|current_member_id\\(|has_org_role\\(|has_org_permission\\(|is_org_member\\()'
  limit 1;
  if found then
    raise exception 'Authenticated SECURITY DEFINER function has no detectable caller/tenant guard: %', bad.signature;
  end if;

  select p.proname, p.oid::regprocedure::text as signature
  into bad
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and pg_get_functiondef(p.oid) ~* '\\mEXECUTE\\m|\\mformat\\s*\\('
  limit 1;
  if found then
    raise exception 'Dynamic SQL requires manual review in SECURITY DEFINER function: %', bad.signature;
  end if;

  if has_schema_privilege('anon', 'public', 'CREATE')
     or has_schema_privilege('authenticated', 'public', 'CREATE')
     or has_schema_privilege('anon', 'extensions', 'CREATE')
     or has_schema_privilege('authenticated', 'extensions', 'CREATE') then
    raise exception 'Untrusted API role can create objects in a SECURITY DEFINER search_path schema';
  end if;

  if has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.record_audit(uuid,text,text,text,jsonb,jsonb,text,boolean)', 'EXECUTE') then
    raise exception 'Trigger/audit-only SECURITY DEFINER function is directly callable by authenticated users';
  end if;
end
$security_review$;
