create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $function$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  -- Legal acceptance is recorded only by the authenticated record_legal_consent RPC.
  -- User-editable raw_user_meta_data is not a legal-consent source of truth.
  return new;
end;
$function$;

alter function public.ingest_monk_directory_batch(text,jsonb)
  set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.monk_seed_tenant_flag_for_new_feature()
  set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.monk_seed_tenant_flags_for_organization()
  set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.monk_sync_org_enabled_modules_from_flags()
  set search_path = pg_catalog, public, extensions, pg_temp;
alter function public.record_audit(uuid,text,text,text,jsonb,jsonb,text,boolean)
  set search_path = pg_catalog, public, extensions, pg_temp;
