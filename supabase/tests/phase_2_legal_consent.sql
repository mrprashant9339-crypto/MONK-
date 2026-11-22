-- Phase 2 legal consent audit and privilege regression assertions.
do $test$
declare
  fn regprocedure := 'public.record_legal_consent(text,text)'::regprocedure;
  trigger_fn regprocedure := 'public.enforce_legal_consent_insert()'::regprocedure;
begin
  if not (select relrowsecurity from pg_class where oid='public.legal_consents'::regclass) then
    raise exception 'RLS is disabled on public.legal_consents';
  end if;

  if has_table_privilege('anon','public.legal_consents','SELECT')
     or has_table_privilege('anon','public.legal_consents','INSERT')
     or has_table_privilege('anon','public.legal_consents','UPDATE')
     or has_table_privilege('anon','public.legal_consents','DELETE') then
    raise exception 'Anonymous privileges remain on public.legal_consents';
  end if;

  if not has_table_privilege('authenticated','public.legal_consents','SELECT')
     or not has_table_privilege('authenticated','public.legal_consents','INSERT') then
    raise exception 'Authenticated SELECT/INSERT privileges are missing';
  end if;

  if has_table_privilege('authenticated','public.legal_consents','UPDATE')
     or has_table_privilege('authenticated','public.legal_consents','DELETE') then
    raise exception 'Direct mutation privileges remain on public.legal_consents';
  end if;

  if has_function_privilege('anon',fn,'EXECUTE')
     or not has_function_privilege('authenticated',fn,'EXECUTE') then
    raise exception 'Consent RPC execution grants are incorrect';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='legal_consents_user_versions_key'
  ) then
    raise exception 'Consent idempotency index is missing';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='legal_consents'
      and cmd='SELECT' and qual ilike '%auth.uid%'
  ) or not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='legal_consents'
      and cmd='INSERT' and with_check ilike '%auth.uid%'
  ) then
    raise exception 'Owner-scoped consent RLS policies are missing';
  end if;

  if (select prosecdef from pg_proc where oid=fn)
     or (select prosecdef from pg_proc where oid=trigger_fn) then
    raise exception 'Consent functions must use SECURITY INVOKER';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid='public.legal_consents'::regclass
      and tgname='legal_consents_enforce_insert' and not tgisinternal
  ) then
    raise exception 'Server timestamp and identity trigger is missing';
  end if;
end;
$test$;
