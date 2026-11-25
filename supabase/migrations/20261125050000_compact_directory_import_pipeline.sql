-- Compact, idempotent ingestion for the national institution directory.
-- Raw source files stay outside Postgres; only normalized identity fields and a
-- small provenance snapshot are retained. Public records are never auto-approved
-- from an arbitrary source payload.

insert into public.monk_directory_sources
  (source_key, authority_name, domain_keys, source_url, source_kind, terms_review_status, import_enabled, notes)
values
  ('aishe_aikosh_universities',
   'AIKosh / Ministry of Education AISHE Institutional Directory',
   array['universities','higher_education'],
   'https://aikosh.indiaai.gov.in/home/datasets/details/all_universities_as_per_aishe_dashboard.html',
   'official_open_dataset',
   'approved',
   true,
   'Open Government License, India dataset describing universities from the AISHE Institutional Directory. Import only compact university identity fields. AISHE listing is not professional-course approval; keep approval evidence separate and mark records partially verified.'),
  ('ogd_aishe_colleges_2011_2012',
   'Open Government Data Platform India / AISHE',
   array['colleges','higher_education'],
   'https://data.gov.in/catalog/list-colleges-aishe-survey',
   'official_historical_dataset',
   'approved',
   true,
   'Historical 2011-12 AISHE college resource listed on OGD India. OGL/OGD source; import only as stale, unpublished discovery candidates. Never present as current recognition or current affiliation.'),
  ('nirf_college_participants_2025',
   'Ministry of Education / National Institutional Ranking Framework',
   array['higher_education','college_participants','rankings'],
   'https://www.nirfindia.org/Rankings/2025/CollegeRankingALL.html',
   'official_portal',
   'pending',
   false,
   'NIRF participating-institute list is a participation signal only, not regulatory recognition or course approval. Keep disabled until reuse terms are reviewed.')
on conflict (source_key) do update
set authority_name = excluded.authority_name,
    domain_keys = excluded.domain_keys,
    source_url = excluded.source_url,
    source_kind = excluded.source_kind,
    notes = excluded.notes;

create index if not exists monk_directory_institutions_published_geo_idx
  on public.monk_directory_institutions (state_code, category_key, district, city, canonical_name)
  where published = true;

create index if not exists monk_directory_programmes_verified_idx
  on public.monk_directory_programmes (institution_id, programme_level, discipline, academic_year)
  where verification_state = 'verified';

create or replace function public.ingest_monk_directory_batch(
  p_source_key text,
  p_records jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_source public.monk_directory_sources;
  v_record jsonb;
  v_source_record_id text;
  v_name text;
  v_normalized text;
  v_state text;
  v_district text;
  v_city text;
  v_category text;
  v_kind text;
  v_ownership text;
  v_aishe text;
  v_institution_id uuid;
  v_snapshot_id uuid;
  v_snapshot_hash text;
  v_payload jsonb;
  v_match_id uuid;
  v_match_count integer;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_rejected integer := 0;
  v_published integer := 0;
  v_now timestamptz := now();
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Directory ingestion requires service role' using errcode = '42501';
  end if;

  if p_source_key is null or length(trim(p_source_key)) = 0 then
    raise exception 'A source key is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_records) <> 'array' then
    raise exception 'Records must be a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_records) < 1 or jsonb_array_length(p_records) > 250 then
    raise exception 'A batch must contain between 1 and 250 records' using errcode = '22023';
  end if;
  if octet_length(p_records::text) > 1000000 then
    raise exception 'A batch may not exceed 1 MB; send smaller batches' using errcode = '22023';
  end if;

  select * into v_source
  from public.monk_directory_sources
  where source_key = p_source_key
    and import_enabled = true
    and terms_review_status = 'approved';
  if not found then
    raise exception 'Source is not enabled or its reuse terms are not approved' using errcode = '42501';
  end if;

  for v_record in select value from jsonb_array_elements(p_records)
  loop
    v_source_record_id := nullif(left(trim(coalesce(v_record ->> 'source_record_id','')), 180), '');
    v_name := nullif(left(trim(coalesce(v_record ->> 'canonical_name','')), 240), '');
    v_state := nullif(upper(trim(coalesce(v_record ->> 'state_code',''))), '');
    v_district := nullif(left(trim(coalesce(v_record ->> 'district','')), 120), '');
    v_city := nullif(left(trim(coalesce(v_record ->> 'city','')), 120), '');
    v_category := coalesce(nullif(v_record ->> 'category_key',''),
      case when p_source_key = 'aishe_aikosh_universities' then 'university' else 'other' end);
    v_kind := coalesce(nullif(v_record ->> 'institution_kind',''),
      case when p_source_key = 'aishe_aikosh_universities' then 'university' else 'college' end);
    v_ownership := coalesce(nullif(v_record ->> 'ownership_key',''), 'other');
    v_aishe := nullif(left(trim(coalesce(v_record ->> 'aishe_code','')), 40), '');
    v_normalized := lower(regexp_replace(v_name, '[^[:alnum:]]+', ' ', 'g'));
    v_normalized := nullif(trim(regexp_replace(v_normalized, '\s+', ' ', 'g')), '');

    if v_source_record_id is null or v_name is null or v_normalized is null
       or v_category not in (select category_key from public.monk_directory_categories)
       or v_kind not in ('university','college','standalone_institute','academy','coaching_centre','vocational_centre','research_centre')
       or v_ownership not in ('central_government','state_government','local_body','government_aided','private','deemed','autonomous','trust_society','other')
       or (v_state is not null and not exists (select 1 from public.monk_directory_regions r where r.code = v_state)) then
      v_rejected := v_rejected + 1;
      continue;
    end if;

    -- Keep a bounded, normalized provenance payload rather than the original row/file.
    v_payload := jsonb_build_object(
      'source_record_id', v_source_record_id,
      'canonical_name', v_name,
      'state_code', v_state,
      'district', v_district,
      'city', v_city,
      'category_key', v_category,
      'institution_kind', v_kind,
      'ownership_key', v_ownership,
      'aishe_code', v_aishe,
      'year_of_establishment', nullif(v_record ->> 'year_of_establishment',''),
      'location_type', nullif(v_record ->> 'location_type','')
    );
    v_snapshot_hash := md5(v_payload::text);

    insert into public.monk_directory_source_snapshots
      (source_id, source_record_id, snapshot_hash, retrieved_at, payload, import_status)
    values
      (v_source.id, v_source_record_id, v_snapshot_hash, v_now, v_payload, 'imported')
    on conflict (source_id, source_record_id, snapshot_hash) do nothing;

    select id into v_snapshot_id
    from public.monk_directory_source_snapshots
    where source_id = v_source.id
      and source_record_id = v_source_record_id
      and snapshot_hash = v_snapshot_hash;

    select institution_id into v_institution_id
    from public.monk_directory_source_records
    where source_id = v_source.id
      and source_record_id = v_source_record_id;

    if v_institution_id is null and v_aishe is not null then
      select id into v_institution_id
      from public.monk_directory_institutions
      where aishe_code = v_aishe
      limit 1;
    end if;

    -- Cross-source auto-linking is deliberately conservative: merge only one
    -- exact name + state + district + city match. Ambiguous names stay separate.
    if v_institution_id is null and v_state is not null and v_district is not null then
      select min(id), count(*)::integer into v_match_id, v_match_count
      from public.monk_directory_institutions
      where normalized_name = v_normalized
        and state_code = v_state
        and coalesce(lower(district),'') = coalesce(lower(v_district),'')
        and coalesce(lower(city),'') = coalesce(lower(v_city),'');
      if v_match_count = 1 then v_institution_id := v_match_id; end if;
    end if;

    if v_institution_id is null then
      insert into public.monk_directory_institutions (
        canonical_name, normalized_name, institution_kind, category_key, ownership_key,
        state_code, district, city, website_url, aishe_code, official_identifiers,
        verification_state, verified_fields, published, last_verified_at, next_review_at,
        search_document, primary_source_id, primary_source_record_id
      ) values (
        v_name, v_normalized, v_kind, v_category, v_ownership,
        v_state, v_district, v_city,
        nullif(trim(coalesce(v_record ->> 'website_url','')), ''),
        v_aishe,
        case when v_aishe is null then '{}'::jsonb else jsonb_build_object('aishe_code', v_aishe) end,
        case
          when p_source_key = 'aishe_aikosh_universities' then 'partially_verified'
          when p_source_key = 'ogd_aishe_colleges_2011_2012' then 'stale'
          else 'unverified'
        end,
        case when p_source_key = 'aishe_aikosh_universities'
          then array_remove(array['canonical_name', case when v_aishe is not null then 'aishe_code' end, case when v_state is not null then 'state_code' end, case when v_district is not null then 'district' end], null)
          else '{}'::text[] end,
        p_source_key = 'aishe_aikosh_universities',
        case when p_source_key = 'aishe_aikosh_universities' then v_now else null end,
        case when p_source_key = 'aishe_aikosh_universities' then v_now + interval '90 days' else null end,
        to_tsvector('simple', concat_ws(' ', v_name, v_city, v_district, v_state, v_aishe)),
        v_source.id, v_source_record_id
      ) returning id into v_institution_id;
      v_inserted := v_inserted + 1;
    else
      update public.monk_directory_institutions i
      set canonical_name = case when i.canonical_name is null or i.canonical_name = '' then v_name else i.canonical_name end,
          normalized_name = case when i.normalized_name is null or i.normalized_name = '' then v_normalized else i.normalized_name end,
          category_key = case when i.category_key = 'other' then v_category else i.category_key end,
          state_code = coalesce(i.state_code, v_state),
          district = coalesce(i.district, v_district),
          city = coalesce(i.city, v_city),
          website_url = coalesce(i.website_url, nullif(trim(coalesce(v_record ->> 'website_url','')), '')),
          aishe_code = coalesce(i.aishe_code, v_aishe),
          official_identifiers = i.official_identifiers || case when v_aishe is null then '{}'::jsonb else jsonb_build_object('aishe_code', v_aishe) end,
          verification_state = case
            when p_source_key = 'aishe_aikosh_universities' and i.verification_state in ('unverified','stale') then 'partially_verified'
            when p_source_key = 'ogd_aishe_colleges_2011_2012' and i.verification_state = 'unverified' then 'stale'
            else i.verification_state end,
          verified_fields = case when p_source_key = 'aishe_aikosh_universities'
            then (select array_agg(distinct f) from unnest(i.verified_fields || array['canonical_name', case when v_aishe is not null then 'aishe_code' end, case when v_state is not null then 'state_code' end, case when v_district is not null then 'district' end]) f where f is not null)
            else i.verified_fields end,
          published = i.published or p_source_key = 'aishe_aikosh_universities',
          last_verified_at = case when p_source_key = 'aishe_aikosh_universities' then v_now else i.last_verified_at end,
          next_review_at = case when p_source_key = 'aishe_aikosh_universities' then v_now + interval '90 days' else i.next_review_at end,
          search_document = to_tsvector('simple', concat_ws(' ', i.canonical_name, coalesce(i.city,v_city), coalesce(i.district,v_district), coalesce(i.state_code,v_state), coalesce(i.aishe_code,v_aishe))),
          updated_at = v_now
      where i.id = v_institution_id;
      v_updated := v_updated + 1;
    end if;

    insert into public.monk_directory_source_records
      (source_id, source_record_id, institution_id, last_seen_snapshot_id, last_seen_at, first_seen_at)
    values
      (v_source.id, v_source_record_id, v_institution_id, v_snapshot_id, v_now, v_now)
    on conflict (source_id, source_record_id) do update
      set institution_id = excluded.institution_id,
          last_seen_snapshot_id = excluded.last_seen_snapshot_id,
          last_seen_at = excluded.last_seen_at;

    if p_source_key = 'aishe_aikosh_universities' then
      v_published := v_published + 1;
    end if;
  end loop;

  update public.monk_directory_sources set last_checked_at = v_now where id = v_source.id;
  return jsonb_build_object(
    'source_key', p_source_key,
    'received', jsonb_array_length(p_records),
    'inserted', v_inserted,
    'updated', v_updated,
    'rejected', v_rejected,
    'published_from_official_university_directory', v_published
  );
end;
$function$;

revoke all on function public.ingest_monk_directory_batch(text,jsonb) from public, anon, authenticated;
grant execute on function public.ingest_monk_directory_batch(text,jsonb) to service_role;
