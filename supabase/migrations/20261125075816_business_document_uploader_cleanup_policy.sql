drop policy if exists business_storage_delete on storage.objects;
create policy business_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'business-private'
    and (storage.foldername(name))[1] = (select public.current_organization_id())::text
    and (
      owner_id = (select auth.uid())::text
      or public.has_org_permission(public.current_organization_id(), 'documents.document.approve')
    )
  );
