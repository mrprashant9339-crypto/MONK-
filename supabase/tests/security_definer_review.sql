-- Security DEFINER audit regression checks.
-- Run with psql -v ON_ERROR_STOP=1 against a migrated Supabase project.

do $test$
declare
  create_org_body text;
  signup_trigger_body text;
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prosecdef
      and has_function_privilege('anon',p.oid,'EXECUTE')
  ) then
    raise exception 'A public SECURITY DEFINER function is executable by anon';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prosecdef
      and not (
        coalesce(p.proconfig, array[]::text[]) @> array['search_path=pg_catalog, public, extensions, pg_temp']::text[]
        or (
          p.proname = 'education_audit_row'
          and coalesce(p.proconfig, array[]::text[]) @> array['search_path=pg_catalog, public, pg_temp']::text[]
        )
      )
  ) then
    raise exception 'A SECURITY DEFINER function has an unexpected search_path';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prosecdef
      and has_function_privilege('authenticated',p.oid,'EXECUTE')
      and p.prosrc !~* 'auth\\.uid\\(\\)|current_organization_id|current_member_id|has_org_permission|has_org_role|is_org_member|can_read_'
  ) then
    raise exception 'An authenticated-callable SECURITY DEFINER function has no identity or tenant authorization guard';
  end if;

  select p.prosrc into create_org_body
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='create_organization';

  if create_org_body is null
     or create_org_body ilike '%user_metadata%'
     or create_org_body not ilike '%auth.uid()%'
     or create_org_body not ilike '%current_user_email_verified%'
     or create_org_body not ilike '%legal_consents%' then
    raise exception 'create_organization must rely on authenticated identity, verified email and recorded legal consent—not user-editable metadata';
  end if;

  select p.prosrc into signup_trigger_body
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='handle_new_user';

  if signup_trigger_body is null or signup_trigger_body ilike '%accepted_legal%' then
    raise exception 'Signup trigger must not infer legal consent from user-editable metadata';
  end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='record_legal_consent'
      and not p.prosecdef
  ) then
    raise exception 'Explicit authenticated record_legal_consent RPC is missing or unexpectedly SECURITY DEFINER';
  end if;
end;
$test$;
