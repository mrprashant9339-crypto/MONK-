begin;

create table if not exists public.business_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null check (char_length(mime_type) between 1 and 127),
  file_size bigint not null check (file_size between 1 and 26214400),
  category text not null default 'general' check (category in ('general','contract','invoice','receipt','identity','compliance','other')),
  description text,
  uploaded_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint business_documents_storage_path_org check (split_part(storage_path, '/', 1) = organization_id::text),
  constraint business_documents_storage_path_id check (split_part(storage_path, '/', 2) = id::text)
);

create index if not exists business_documents_org_created_idx
  on public.business_documents(organization_id, created_at desc)
  where deleted_at is null;

alter table public.business_documents enable row level security;

drop policy if exists business_documents_tenant_read on public.business_documents;
create policy business_documents_tenant_read
  on public.business_documents for select to authenticated
  using (
    organization_id = public.current_organization_id()
    and public.has_org_permission(organization_id, 'documents.document.read')
    and deleted_at is null
  );

drop policy if exists business_documents_tenant_upload on public.business_documents;
create policy business_documents_tenant_upload
  on public.business_documents for insert to authenticated
  with check (
    organization_id = public.current_organization_id()
    and uploaded_by = (select auth.uid())
    and public.has_org_permission(organization_id, 'documents.document.upload')
    and split_part(storage_path, '/', 1) = organization_id::text
    and split_part(storage_path, '/', 2) = id::text
  );

drop policy if exists business_documents_tenant_update on public.business_documents;
create policy business_documents_tenant_update
  on public.business_documents for update to authenticated
  using (
    organization_id = public.current_organization_id()
    and public.has_org_permission(organization_id, 'documents.document.upload')
    and deleted_at is null
  )
  with check (
    organization_id = public.current_organization_id()
    and public.has_org_permission(organization_id, 'documents.document.upload')
    and split_part(storage_path, '/', 1) = organization_id::text
    and split_part(storage_path, '/', 2) = id::text
  );

drop policy if exists business_documents_tenant_delete on public.business_documents;
create policy business_documents_tenant_delete
  on public.business_documents for delete to authenticated
  using (
    organization_id = public.current_organization_id()
    and public.has_org_permission(organization_id, 'documents.document.approve')
  );

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-private',
  'business-private',
  false,
  26214400,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists business_storage_read on storage.objects;
create policy business_storage_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'business-private'
    and (storage.foldername(name))[1] = (select public.current_organization_id())::text
    and public.has_org_permission(public.current_organization_id(), 'documents.document.read')
  );

drop policy if exists business_storage_upload on storage.objects;
create policy business_storage_upload
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'business-private'
    and (storage.foldername(name))[1] = (select public.current_organization_id())::text
    and public.has_org_permission(public.current_organization_id(), 'documents.document.upload')
  );

drop policy if exists business_storage_update on storage.objects;
create policy business_storage_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'business-private'
    and (storage.foldername(name))[1] = (select public.current_organization_id())::text
    and public.has_org_permission(public.current_organization_id(), 'documents.document.upload')
  )
  with check (
    bucket_id = 'business-private'
    and (storage.foldername(name))[1] = (select public.current_organization_id())::text
    and public.has_org_permission(public.current_organization_id(), 'documents.document.upload')
  );

drop policy if exists business_storage_delete on storage.objects;
create policy business_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'business-private'
    and (storage.foldername(name))[1] = (select public.current_organization_id())::text
    and public.has_org_permission(public.current_organization_id(), 'documents.document.approve')
  );

commit;
