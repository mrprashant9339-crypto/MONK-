-- Ensure new platform feature flags are provisioned for all existing tenants.
create or replace function public.monk_seed_tenant_flag_for_new_feature()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.tenant_flags(organization_id,flag_key,enabled)
  select o.id, new.key, new.enabled
  from public.organizations o
  on conflict(organization_id,flag_key) do nothing;
  return new;
end;
$$;

drop trigger if exists monk_seed_tenant_flag_after_feature_insert on public.feature_flags;
create trigger monk_seed_tenant_flag_after_feature_insert
after insert on public.feature_flags
for each row execute function public.monk_seed_tenant_flag_for_new_feature();

revoke all on function public.monk_seed_tenant_flag_for_new_feature() from public, anon, authenticated;
