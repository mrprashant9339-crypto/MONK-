-- Keep tenant module flags server-owned and synchronize policy context from them.
insert into public.feature_flags(key,enabled,description) values
  ('payments',false,'Payments module; disabled until payment-provider and compliance controls are complete'),
  ('location',false,'Location features; disabled until consent and provider compliance controls are complete'),
  ('marketplace',false,'Marketplace module; disabled until seller and consumer controls are complete')
on conflict(key) do nothing;

create or replace function public.monk_seed_tenant_flags_for_organization()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.tenant_flags(organization_id,flag_key,enabled)
  select new.id, f.key, f.enabled
  from public.feature_flags f
  on conflict(organization_id,flag_key) do nothing;
  return new;
end;
$$;

drop trigger if exists monk_seed_tenant_flags_after_org_insert on public.organizations;
create trigger monk_seed_tenant_flags_after_org_insert
after insert on public.organizations
for each row execute function public.monk_seed_tenant_flags_for_organization();

create or replace function public.monk_sync_org_enabled_modules_from_flags()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid;
begin
  v_org_id := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
  update public.organizations
  set enabled_modules = coalesce((
    select array_agg(tf.flag_key order by tf.flag_key)
    from public.tenant_flags tf
    where tf.organization_id = v_org_id and tf.enabled = true
  ), '{}'::text[])
  where id = v_org_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists monk_sync_org_enabled_modules_after_flag_change on public.tenant_flags;
create trigger monk_sync_org_enabled_modules_after_flag_change
after insert or update of enabled or delete on public.tenant_flags
for each row execute function public.monk_sync_org_enabled_modules_from_flags();

insert into public.tenant_flags(organization_id,flag_key,enabled)
select o.id, f.key, f.enabled
from public.organizations o
cross join public.feature_flags f
on conflict(organization_id,flag_key) do nothing;

update public.organizations o
set enabled_modules = coalesce((
  select array_agg(tf.flag_key order by tf.flag_key)
  from public.tenant_flags tf
  where tf.organization_id = o.id and tf.enabled = true
), '{}'::text[]);

-- No browser client may read or mutate server-owned module flags.
revoke all on public.tenant_flags from anon, authenticated;
grant select, insert, update, delete on public.tenant_flags to service_role;

insert into public.monk_policy_rules(rule_key,priority,conditions,required_policy_keys,active) values
  ('crm_module',30,'{"enabled_modules_contains":"crm"}'::jsonb,array['customer_data'],true),
  ('documents_module',30,'{"enabled_modules_contains":"documents"}'::jsonb,array['data_processing'],true),
  ('copilot_module',30,'{"enabled_modules_contains":"copilot"}'::jsonb,array['ai_processing','data_processing'],true),
  ('imports_module',30,'{"enabled_modules_contains":"imports"}'::jsonb,array['source_data','data_processing'],true)
on conflict(rule_key) do update
set priority=excluded.priority,
    conditions=excluded.conditions,
    required_policy_keys=excluded.required_policy_keys,
    active=excluded.active;
