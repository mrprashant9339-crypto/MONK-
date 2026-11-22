create unique index if not exists monk_directory_institutions_source_identity_uidx
  on public.monk_directory_institutions (primary_source_id, primary_source_record_id)
  where primary_source_id is not null and primary_source_record_id is not null;
