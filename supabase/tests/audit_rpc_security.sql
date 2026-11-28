-- Run after migration 20261128021000_harden_audit_rpc_execution.sql.
-- Confirms direct client execution is revoked while trusted trigger/RPC call paths remain privileged.
do $test$
declare
  v_record regprocedure := 'public.record_audit(uuid,text,text,text,jsonb,jsonb,text,boolean)'::regprocedure;
  v_trigger regprocedure := 'public.education_audit_row()'::regprocedure;
  v_def text;
  v_trigger_count integer;
  v_unsafe_callers integer;
begin
  if not (select prosecdef from pg_proc where oid = v_record) then
    raise exception 'record_audit must remain SECURITY DEFINER for internal writes';
  end if;

  if has_function_privilege('anon', v_record, 'EXECUTE') then
    raise exception 'anon must not execute record_audit directly';
  end if;
  if has_function_privilege('authenticated', v_record, 'EXECUTE') then
    raise exception 'authenticated must not execute record_audit directly';
  end if;
  if not has_function_privilege('service_role', v_record, 'EXECUTE') then
    raise exception 'service_role lost trusted server-side record_audit execution';
  end if;
  if not has_function_privilege('postgres', v_record, 'EXECUTE') then
    raise exception 'postgres owner must retain record_audit execution';
  end if;

  v_def := pg_get_functiondef(v_record);
  if v_def not ilike '%auth.uid() is not null%'
     or v_def not ilike '%is_org_member(target_org)%' then
    raise exception 'record_audit must validate the authenticated actor organization membership';
  end if;

  if not (select prosecdef from pg_proc where oid = v_trigger) then
    raise exception 'education_audit_row must run SECURITY DEFINER for internal audit writes';
  end if;
  if has_function_privilege('authenticated', v_trigger, 'EXECUTE')
     or has_function_privilege('anon', v_trigger, 'EXECUTE') then
    raise exception 'education_audit_row must not be directly executable by client roles';
  end if;

  select count(*) into v_trigger_count
  from pg_trigger
  where tgfoid = v_trigger and not tgisinternal and tgenabled <> 'D';
  if v_trigger_count = 0 then
    raise exception 'education_audit_row is not attached to any enabled education audit triggers';
  end if;

  select count(*) into v_unsafe_callers
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'
    and p.oid not in (v_record, v_trigger)
    and pg_get_functiondef(p.oid) ilike '%record_audit(%'
    and not p.prosecdef;
  if v_unsafe_callers > 0 then
    raise exception 'Found % SECURITY INVOKER functions calling the internal record_audit helper', v_unsafe_callers;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and cmd in ('INSERT', 'ALL')
      and roles && array['anon','authenticated']::name[]
  ) then
    raise exception 'audit_logs must not expose INSERT through client RLS policies';
  end if;
end;
$test$;

select 'audit RPC grants, actor membership checks and trigger call paths: PASS' as assertion;
