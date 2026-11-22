-- MONK national directory, discovery and policy foundation.
-- Safe additive migration: no existing tables are altered or dropped.
-- Importers/policy resolver write through trusted server-side credentials only.

create table if not exists public.monk_directory_regions (
  code text primary key,
  name text not null unique,
  region_kind text not null check (region_kind in ('state', 'union_territory')),
  country_code text not null default 'IN' check (country_code = 'IN'),
  created_at timestamptz not null default now()
);

insert into public.monk_directory_regions (code, name, region_kind) values
('AN','Andaman and Nicobar Islands','union_territory'),
('AP','Andhra Pradesh','state'), ('AR','Arunachal Pradesh','state'), ('AS','Assam','state'),
('BR','Bihar','state'), ('CH','Chandigarh','union_territory'), ('CT','Chhattisgarh','state'),
('DN','Dadra and Nagar Haveli and Daman and Diu','union_territory'), ('DL','Delhi','union_territory'),
('GA','Goa','state'), ('GJ','Gujarat','state'), ('HR','Haryana','state'), ('HP','Himachal Pradesh','state'),
('JK','Jammu and Kashmir','union_territory'), ('JH','Jharkhand','state'), ('KA','Karnataka','state'),
('KL','Kerala','state'), ('LA','Ladakh','union_territory'), ('LD','Lakshadweep','union_territory'),
('MP','Madhya Pradesh','state'), ('MH','Maharashtra','state'), ('MN','Manipur','state'),
('ML','Meghalaya','state'), ('MZ','Mizoram','state'), ('NL','Nagaland','state'), ('OD','Odisha','state'),
('PY','Puducherry','union_territory'), ('PB','Punjab','state'), ('RJ','Rajasthan','state'),
('SK','Sikkim','state'), ('TN','Tamil Nadu','state'), ('TS','Telangana','state'),
('TR','Tripura','state'), ('UP','Uttar Pradesh','state'), ('UK','Uttarakhand','state'),
('WB','West Bengal','state')
on conflict (code) do update set name = excluded.name, region_kind = excluded.region_kind;

create table if not exists public.monk_directory_categories (
  category_key text primary key,
  label text not null,
  domain_keys text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.monk_directory_categories (category_key, label, domain_keys) values
('university','Universities',array['multidisciplinary']),
('engineering','Engineering & Technology',array['engineering','technology']),
('medical','Medical Colleges',array['medical']),
('dental','Dental Colleges',array['dental']),
('ayush','AYUSH Institutions',array['ayush']),
('nursing','Nursing Colleges',array['nursing']),
('pharmacy','Pharmacy Colleges',array['pharmacy']),
('law','Law Colleges',array['law']),
('commerce','Commerce Colleges',array['commerce']),
('management','Management Institutes',array['management']),
('arts_science','Arts & Science Colleges',array['arts','science']),
('education','Teacher Education',array['education']),
('agriculture','Agriculture & Veterinary',array['agriculture','veterinary']),
('architecture','Architecture & Planning',array['architecture','planning']),
('design','Design & Creative Arts',array['design','creative_arts']),
('polytechnic','Polytechnic',array['technical_diploma']),
('iti','ITI & Industrial Training',array['vocational']),
('research','Research Institutes',array['research']),
('coaching','Coaching & Test Preparation',array['coaching']),
('vocational','Vocational & Skill Training',array['vocational','skills']),
('other','Other Institutions',array['other'])
on conflict (category_key) do update set label = excluded.label, domain_keys = excluded.domain_keys;

create table if not exists public.monk_directory_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  authority_name text not null,
  domain_keys text[] not null default '{}',
  source_url text not null,
  source_kind text not null default 'official_portal',
  terms_review_status text not null default 'pending' check (terms_review_status in ('pending','approved','restricted','blocked')),
  last_checked_at timestamptz,
  import_enabled boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

insert into public.monk_directory_sources (source_key, authority_name, domain_keys, source_url, notes) values
('aishe','AISHE / Ministry of Education',array['higher_education'],'https://dashboard.aishe.gov.in/','Broad higher-education universe; not a professional-course approval authority.'),
('ugc','University Grants Commission',array['universities','degree_awarding_authority'],'https://www.ugc.gov.in/universitydetails/','Verify university status and relevant notices.'),
('aicte','All India Council for Technical Education',array['technical_education','engineering','management'],'https://www.aicte-india.org/','Verify programme, campus, intake and academic year.'),
('nmc','National Medical Commission',array['medical'],'https://www.nmc.org.in/information-desk/college-and-course-search/','Medical college/course and seat information.'),
('dci','Dental Council of India',array['dental'],'https://dciindia.gov.in/','Dental education regulator.'),
('bci','Bar Council of India',array['law'],'https://www.barcouncilofindia.org/','Law programme approval/recognition checks.'),
('pci','Pharmacy Council of India',array['pharmacy'],'https://www.pci.nic.in/','Pharmacy institution, approval status and intake.'),
('inc','Indian Nursing Council',array['nursing'],'https://online.indiannursingcouncil.org/Reports/YearlyReportByState.aspx','Year- and state-specific nursing institution records.'),
('ncte','National Council for Teacher Education',array['teacher_education'],'https://web.ncte.gov.in/page/recognized-institutions','Teacher education recognition.'),
('coa','Council of Architecture',array['architecture'],'https://www.coa.gov.in/','Architecture education and registration authority.'),
('icar','Indian Council of Agricultural Research',array['agriculture'],'https://icar.org.in/','Agricultural education/research references.'),
('ncvt','DGT / NCVT',array['iti','vocational'],'https://www.ncvtmis.gov.in/','ITI and vocational training references.'),
('state_dte','State DTE / Technical Education Boards',array['polytechnic','state_affiliation'],'https://www.education.gov.in/','Use each state technical board/DTE as the authoritative source.')
on conflict (source_key) do update set authority_name = excluded.authority_name, domain_keys = excluded.domain_keys, source_url = excluded.source_url, notes = excluded.notes;

create table if not exists public.monk_directory_institutions (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  normalized_name text not null,
  aliases text[] not null default '{}',
  institution_kind text not null check (institution_kind in ('university','college','standalone_institute','academy','coaching_centre','vocational_centre','research_centre')),
  category_key text not null references public.monk_directory_categories(category_key),
  ownership_key text not null check (ownership_key in ('central_government','state_government','local_body','government_aided','private','deemed','autonomous','trust_society','other')),
  state_code text references public.monk_directory_regions(code),
  district text,
  city text,
  locality text,
  postal_code text,
  address text,
  latitude numeric(9,6) check (latitude is null or latitude between -90 and 90),
  longitude numeric(9,6) check (longitude is null or longitude between -180 and 180),
  website_url text,
  phone_public text,
  email_public text,
  aishe_code text,
  official_identifiers jsonb not null default '{}'::jsonb,
  verification_state text not null default 'unverified' check (verification_state in ('verified','partially_verified','unverified','stale','disputed','closed')),
  verified_fields text[] not null default '{}',
  published boolean not null default false,
  source_updated_at timestamptz,
  last_verified_at timestamptz,
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (
    to_tsvector('simple', coalesce(canonical_name,'') || ' ' || coalesce(district,'') || ' ' || coalesce(city,'') || ' ' || coalesce(locality,'') || ' ' || coalesce(address,''))
  ) stored
);

create unique index if not exists monk_directory_institutions_aishe_code_uidx
  on public.monk_directory_institutions (aishe_code) where aishe_code is not null;
create index if not exists monk_directory_institutions_search_idx
  on public.monk_directory_institutions using gin (search_document);
create index if not exists monk_directory_institutions_geo_idx
  on public.monk_directory_institutions (state_code, district, city, category_key, ownership_key);
create index if not exists monk_directory_institutions_verification_idx
  on public.monk_directory_institutions (verification_state, published, next_review_at);

create table if not exists public.monk_directory_programmes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.monk_directory_institutions(id) on delete cascade,
  programme_name text not null,
  programme_level text,
  discipline text,
  duration_months integer check (duration_months is null or duration_months > 0),
  study_mode text,
  eligibility text,
  awarding_body text,
  affiliation_body text,
  academic_year text,
  intake integer check (intake is null or intake >= 0),
  source_id uuid references public.monk_directory_sources(id),
  source_record_id text,
  verification_state text not null default 'unverified' check (verification_state in ('verified','partially_verified','unverified','stale','disputed','closed')),
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (institution_id, programme_name, academic_year, source_id, source_record_id)
);

create table if not exists public.monk_directory_approvals (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.monk_directory_institutions(id) on delete cascade,
  programme_id uuid references public.monk_directory_programmes(id) on delete cascade,
  regulator_source_id uuid not null references public.monk_directory_sources(id),
  approval_type text not null,
  approval_status text not null check (approval_status in ('approved','conditional','withdrawn','not_approved','unknown')),
  academic_year text not null,
  approved_intake integer check (approved_intake is null or approved_intake >= 0),
  valid_from date,
  valid_until date,
  source_url text not null,
  source_record_id text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create table if not exists public.monk_directory_verification_events (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.monk_directory_institutions(id) on delete cascade,
  programme_id uuid references public.monk_directory_programmes(id) on delete cascade,
  field_key text not null,
  previous_state text,
  new_state text not null check (new_state in ('verified','partially_verified','unverified','stale','disputed','closed')),
  source_id uuid references public.monk_directory_sources(id),
  evidence_url text,
  evidence_record_id text,
  academic_year text,
  reviewer_ref text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.monk_directory_source_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.monk_directory_sources(id),
  source_record_id text,
  snapshot_hash text not null,
  source_published_at timestamptz,
  retrieved_at timestamptz not null default now(),
  payload jsonb not null,
  import_status text not null default 'received' check (import_status in ('received','validated','imported','rejected','needs_review')),
  import_error text,
  unique (source_id, source_record_id, snapshot_hash)
);

create table if not exists public.monk_policy_documents (
  id uuid primary key default gen_random_uuid(),
  policy_key text not null,
  version text not null,
  title text not null,
  jurisdiction text not null default 'IN',
  entity_conditions jsonb not null default '{}'::jsonb,
  effective_at timestamptz not null,
  content_markdown text not null,
  content_sha256 text not null,
  publication_state text not null default 'draft' check (publication_state in ('draft','published','retired')),
  created_at timestamptz not null default now(),
  unique (policy_key, version),
  unique (policy_key, content_sha256)
);

create table if not exists public.monk_policy_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  priority integer not null default 100,
  conditions jsonb not null,
  required_policy_keys text[] not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.monk_policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null,
  policy_document_id uuid not null references public.monk_policy_documents(id),
  accepted_sha256 text not null,
  accepted_at timestamptz not null default now(),
  method text not null,
  locale text not null default 'en-IN',
  consent_evidence jsonb not null default '{}'::jsonb,
  unique (user_id, organization_id, policy_document_id, accepted_sha256)
);

create table if not exists public.monk_organization_policy_state (
  organization_id uuid primary key,
  organization_type text not null,
  jurisdiction text not null default 'IN',
  policy_set jsonb not null default '[]'::jsonb,
  resolved_at timestamptz not null default now(),
  resolver_version text not null
);

create table if not exists public.monk_discovery_search_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider_key text not null,
  category_key text,
  radius_m integer check (radius_m is null or radius_m between 100 and 100000),
  result_count integer,
  request_cost numeric(12,6),
  outcome text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.monk_user_saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_key text not null,
  provider_place_id text not null,
  label text,
  created_at timestamptz not null default now(),
  unique (user_id, provider_key, provider_place_id)
);

-- RLS defaults: public catalogue is read-only to clients; trusted importers own writes.
alter table public.monk_directory_regions enable row level security;
alter table public.monk_directory_categories enable row level security;
alter table public.monk_directory_sources enable row level security;
alter table public.monk_directory_institutions enable row level security;
alter table public.monk_directory_programmes enable row level security;
alter table public.monk_directory_approvals enable row level security;
alter table public.monk_directory_verification_events enable row level security;
alter table public.monk_directory_source_snapshots enable row level security;
alter table public.monk_policy_documents enable row level security;
alter table public.monk_policy_rules enable row level security;
alter table public.monk_policy_acceptances enable row level security;
alter table public.monk_organization_policy_state enable row level security;
alter table public.monk_discovery_search_audit enable row level security;
alter table public.monk_user_saved_places enable row level security;

drop policy if exists monk_regions_public_read on public.monk_directory_regions;
create policy monk_regions_public_read on public.monk_directory_regions for select to anon, authenticated using (true);
drop policy if exists monk_categories_public_read on public.monk_directory_categories;
create policy monk_categories_public_read on public.monk_directory_categories for select to anon, authenticated using (active);
drop policy if exists monk_institutions_public_read on public.monk_directory_institutions;
create policy monk_institutions_public_read on public.monk_directory_institutions for select to anon, authenticated using (published);
drop policy if exists monk_programmes_public_read on public.monk_directory_programmes;
create policy monk_programmes_public_read on public.monk_directory_programmes for select to anon, authenticated using (
  exists (select 1 from public.monk_directory_institutions i where i.id = institution_id and i.published)
);
drop policy if exists monk_approvals_public_read on public.monk_directory_approvals;
create policy monk_approvals_public_read on public.monk_directory_approvals for select to anon, authenticated using (
  exists (select 1 from public.monk_directory_institutions i where i.id = institution_id and i.published)
);
drop policy if exists monk_policy_published_read on public.monk_policy_documents;
create policy monk_policy_published_read on public.monk_policy_documents for select to anon, authenticated using (publication_state = 'published');
drop policy if exists monk_acceptances_owner_read on public.monk_policy_acceptances;
create policy monk_acceptances_owner_read on public.monk_policy_acceptances for select to authenticated using (user_id = auth.uid());
drop policy if exists monk_saved_places_owner_all on public.monk_user_saved_places;
create policy monk_saved_places_owner_all on public.monk_user_saved_places for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- No client INSERT/UPDATE/DELETE policies are intentionally defined for official catalogue,
-- source snapshots, verification events, policy rules, policy state, or provider audit rows.
-- Those operations must be performed by authenticated server-side jobs with service credentials.

grant select on public.monk_directory_regions, public.monk_directory_categories,
  public.monk_directory_institutions, public.monk_directory_programmes,
  public.monk_directory_approvals, public.monk_policy_documents
  to anon, authenticated;
grant select on public.monk_directory_sources to authenticated;
grant select on public.monk_policy_acceptances, public.monk_user_saved_places to authenticated;
grant insert, update, delete on public.monk_user_saved_places to authenticated;
grant all on public.monk_directory_regions, public.monk_directory_categories,
  public.monk_directory_sources, public.monk_directory_institutions,
  public.monk_directory_programmes, public.monk_directory_approvals,
  public.monk_directory_verification_events, public.monk_directory_source_snapshots,
  public.monk_policy_documents, public.monk_policy_rules, public.monk_policy_acceptances,
  public.monk_organization_policy_state, public.monk_discovery_search_audit,
  public.monk_user_saved_places to service_role;
