-- Phase 2 legal consent audit and privilege regression assertions.
do $test$
declare
  fn regprocedure := 'public.record_legal_consent(text,text)'::regprocedure;
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

  if not has_table_privilege('authenticated','public.legal_consents','SELECT') then
    raise exception 'Authenticated SELECT is missing for own consent history';
  end if;

  if has_table_privilege('authenticated','public.legal_consents','INSERT')
     or has_table_privilege('authenticated','public.legal_consents','UPDATE')
     or has_table_privilege('authenticated','public.legal_consents','DELETE') then
    raise exception 'Direct mutation privileges remain on public.legal_consents';
  end if;

  if has_function_privilege('anon',fn,'EXECUTE') then
    raise exception 'Anonymous users can execute record_legal_consent';
  end if;

  if not has_function_privilege('authenticated',fn,'EXECUTE') then
    raise exception 'Authenticated users cannot execute record_legal_consent';
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
  ) then
    raise exception 'Owner-only consent read policy is missing';
  end if;

  if not (select prosecdef from pg_proc where oid=fn) then
    raise exception 'Consent RPC must execute with its narrowly scoped definer privileges';
  end if;
end;
$test$;
