alter table public.monk_directory_institutions
  add column if not exists primary_source_id uuid references public.monk_directory_sources(id),
  add column if not exists primary_source_record_id text;

create index if not exists monk_directory_institutions_primary_source_idx
  on public.monk_directory_institutions (primary_source_id);
