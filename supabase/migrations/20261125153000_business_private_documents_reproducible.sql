-- Reproducible definition for the Business private document vault.
-- The original live setup pre-dated this source-controlled migration; every object is guarded.
create table if not exists public.business_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null check (char_length(mime_type) between 1 and 127),
  file_size bigint not null check (file_size between 1 and 26214400),
  category text not null default 'general'
    check (category in ('general','contract','invoice','receipt','identity','compliance','other')),
  description text,
  uploaded_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint business_documents_storage_path_org check (split_part(storage_path, '/', 1) = organization_id::text),
  constraint business_documents_storage_path_id check (split_part(storage_path, '/', 2) = id::text)
);

create index if not exists business_documents_org_created_idx
  on public.business_documents (organization_id, created_at desc)
  where deleted_at is null;

alter table public.business_documents enable row level security;
revoke all on table public.business_documents from public, anon, authenticated;
grant select, insert, update, delete on table public.business_documents to authenticated;
grant all on table public.business_documents to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-private',
  'business-private',
  false,
  26214400,
  array[
    'application/pdf','image/jpeg','image/png','image/webp','text/plain','text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='business_documents' and policyname='business_documents_tenant_read') then
    execute $policy$create policy business_documents_tenant_read on public.business_documents for select to authenticated using (organization_id = current_organization_id() and has_org_permission(organization_id, 'documents.document.read') and deleted_at is null)$policy$;
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='business_documents' and policyname='business_documents_tenant_upload') then
    execute $policy$create policy business_documents_tenant_upload on public.business_documents for insert to authenticated with check (organization_id = current_organization_id() and uploaded_by = (select auth.uid()) and has_org_permission(organization_id, 'documents.document.upload') and split_part(storage_path, '/', 1) = organization_id::text and split_part(storage_path, '/', 2) = id::text)$policy$;
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='business_documents' and policyname='business_documents_tenant_update') then
    execute $policy$create policy business_documents_tenant_update on public.business_documents for update to authenticated using (organization_id = current_organization_id() and has_org_permission(organization_id, 'documents.document.upload') and deleted_at is null) with check (organization_id = current_organization_id() and has_org_permission(organization_id, 'documents.document.upload') and split_part(storage_path, '/', 1) = organization_id::text and split_part(storage_path, '/', 2) = id::text)$policy$;
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='business_documents' and policyname='business_documents_tenant_delete') then
    execute $policy$create policy business_documents_tenant_delete on public.business_documents for delete to authenticated using (organization_id = current_organization_id() and has_org_permission(organization_id, 'documents.document.approve'))$policy$;
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='business_storage_read') then
    execute $policy$create policy business_storage_read on storage.objects for select to authenticated using (bucket_id = 'business-private' and (storage.foldername(name))[1] = (select current_organization_id())::text and has_org_permission(current_organization_id(), 'documents.document.read'))$policy$;
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='business_storage_upload') then
    execute $policy$create policy business_storage_upload on storage.objects for insert to authenticated with check (bucket_id = 'business-private' and (storage.foldername(name))[1] = (select current_organization_id())::text and has_org_permission(current_organization_id(), 'documents.document.upload'))$policy$;
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='business_storage_update') then
    execute $policy$create policy business_storage_update on storage.objects for update to authenticated using (bucket_id = 'business-private' and (storage.foldername(name))[1] = (select current_organization_id())::text and has_org_permission(current_organization_id(), 'documents.document.upload')) with check (bucket_id = 'business-private' and (storage.foldername(name))[1] = (select current_organization_id())::text and has_org_permission(current_organization_id(), 'documents.document.upload'))$policy$;
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='business_storage_delete') then
    execute $policy$create policy business_storage_delete on storage.objects for delete to authenticated using (bucket_id = 'business-private' and (storage.foldername(name))[1] = (select current_organization_id())::text and (owner_id = (select auth.uid())::text or has_org_permission(current_organization_id(), 'documents.document.approve')))$policy$;
  end if;
end
$$;
