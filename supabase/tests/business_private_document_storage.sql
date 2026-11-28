-- Regression checks for tenant-scoped private Business document storage.
-- Run with psql -v ON_ERROR_STOP=1 against a migrated Supabase project.

do $test$
declare
  required_policy text;
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='business_documents'
      and c.relkind='r' and c.relrowsecurity
  ) then
    raise exception 'business_documents must exist with RLS enabled';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id='business-private' and public=false and file_size_limit=26214400
  ) then
    raise exception 'business-private must remain private with a 25 MB limit';
  end if;

  foreach required_policy in array array[
    'business_documents_tenant_read',
    'business_documents_tenant_upload',
    'business_documents_tenant_update',
    'business_documents_tenant_delete'
  ] loop
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='business_documents'
        and policyname=required_policy and 'authenticated'=any(roles)
    ) then
      raise exception 'Missing authenticated metadata policy: %', required_policy;
    end if;
  end loop;

  foreach required_policy in array array[
    'business_storage_read',
    'business_storage_upload',
    'business_storage_update',
    'business_storage_delete'
  ] loop
    if not exists (
      select 1 from pg_policies
      where schemaname='storage' and tablename='objects'
        and policyname=required_policy and 'authenticated'=any(roles)
    ) then
      raise exception 'Missing authenticated Storage policy: %', required_policy;
    end if;
  end loop;

  if exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname like 'business_storage_%'
      and coalesce(qual,'') !~ 'current_organization_id'
      and coalesce(with_check,'') !~ 'current_organization_id'
  ) then
    raise exception 'Business Storage policies must scope objects to the active organization';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='business_documents'
      and policyname='business_documents_tenant_read'
      and coalesce(qual,'') !~ 'documents.document.read'
  ) then
    raise exception 'Business document read policy must require documents.document.read';
  end if;
end;
$test$;
