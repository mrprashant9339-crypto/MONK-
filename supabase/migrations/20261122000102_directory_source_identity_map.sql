-- Stable source identity mapping makes imports idempotent across repeated runs.
create table if not exists public.monk_directory_source_records (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.monk_directory_sources(id),
  source_record_id text not null,
  institution_id uuid not null references public.monk_directory_institutions(id) on delete cascade,
  last_seen_snapshot_id uuid references public.monk_directory_source_snapshots(id),
  last_seen_at timestamptz not null default now(),
  first_seen_at timestamptz not null default now(),
  unique (source_id, source_record_id)
);

create index if not exists monk_directory_source_records_institution_idx
  on public.monk_directory_source_records (institution_id);

alter table public.monk_directory_source_records enable row level security;

drop policy if exists monk_source_record_map_public_read on public.monk_directory_source_records;
create policy monk_source_record_map_public_read on public.monk_directory_source_records
  for select to authenticated using (
    exists (
      select 1 from public.monk_directory_institutions i
      where i.id = institution_id and i.published
    )
  );

grant select on public.monk_directory_source_records to authenticated;
grant all on public.monk_directory_source_records to service_role;
