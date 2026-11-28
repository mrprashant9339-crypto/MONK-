-- Make audit writing an internal database capability instead of a client-callable SECURITY DEFINER RPC.
-- SECURITY DEFINER business RPCs owned by postgres can still call this helper.
-- The education row trigger is also SECURITY DEFINER so its invoker-context table writes
-- continue to produce audit rows after the helper grant is revoked from client roles.

create or replace function public.record_audit(
  target_org uuid,
  audit_action text,
  audit_resource_type text,
  audit_resource_id text,
  audit_before jsonb default null,
  audit_after jsonb default null,
  audit_request_id text default null,
  audit_ai_involved boolean default false
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $function$
begin
  -- Authenticated callers must belong to the organization being audited.
  -- A null auth.uid() is reserved for trusted server-side service_role operations.
  if auth.uid() is not null and not public.is_org_member(target_org) then
    raise exception 'Audit actor must be an active member of the target organization'
      using errcode = '42501';
  end if;

  insert into public.audit_logs (
    organization_id, actor_user_id, action, resource_type, resource_id,
    before_diff, after_diff, request_id, ai_involved
  ) values (
    target_org, auth.uid(), audit_action, audit_resource_type, audit_resource_id,
    audit_before, audit_after, coalesce(audit_request_id, gen_random_uuid()::text), audit_ai_involved
  );
end;
$function$;

-- Trigger functions are invoked by existing triggers, not directly by API clients.
revoke all on function public.education_audit_row()
  from public, anon, authenticated, service_role;

-- Only trusted server-side code may call the audit helper directly.
-- postgres-owned SECURITY DEFINER functions retain owner privileges when calling it.
revoke all on function public.record_audit(uuid, text, text, text, jsonb, jsonb, text, boolean)
  from public, anon, authenticated;
grant execute on function public.record_audit(uuid, text, text, text, jsonb, jsonb, text, boolean)
  to service_role;

-- This trigger executes after RLS-authorized education-table mutations.
-- Run it as the database owner so it can call the now-internal audit helper.
create or replace function public.education_audit_row()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  before_row jsonb;
  after_row jsonb;
  row_data jsonb;
  org_id uuid;
begin
  if tg_op = 'INSERT' then
    after_row := to_jsonb(new);
    row_data := after_row;
  elsif tg_op = 'UPDATE' then
    before_row := to_jsonb(old);
    after_row := to_jsonb(new);
    row_data := after_row;
  else
    before_row := to_jsonb(old);
    row_data := before_row;
  end if;

  org_id := (row_data ->> 'organization_id')::uuid;
  perform public.record_audit(
    org_id,
    'education.' || tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    row_data ->> 'id',
    before_row,
    after_row,
    null,
    false
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;
