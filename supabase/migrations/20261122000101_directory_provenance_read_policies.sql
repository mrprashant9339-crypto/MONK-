-- Public provenance is safe to display and necessary for transparent verification.
drop policy if exists monk_sources_public_read on public.monk_directory_sources;
create policy monk_sources_public_read on public.monk_directory_sources
  for select to anon, authenticated using (true);

drop policy if exists monk_verification_events_public_read on public.monk_directory_verification_events;
create policy monk_verification_events_public_read on public.monk_directory_verification_events
  for select to anon, authenticated using (
    exists (
      select 1 from public.monk_directory_institutions i
      where i.id = institution_id and i.published
    )
  );

grant select on public.monk_directory_sources, public.monk_directory_verification_events
  to anon, authenticated;
