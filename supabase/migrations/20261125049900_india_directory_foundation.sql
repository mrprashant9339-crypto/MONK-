-- Replayable India-wide institution directory foundation.
-- Production previously had these objects from out-of-band SQL; this migration
-- makes the directory schema reproducible in staging and future environments.

create table if not exists public.monk_directory_regions (
  code text primary key,
  name text not null unique,
  region_kind text not null check (region_kind in ('state','union_territory')),
  country_code text not null default 'IN' check (country_code='IN'),
  created_at timestamptz not null default now()
);

create table if not exists public.monk_directory_categories (
  category_key text primary key,
  label text not null,
  domain_keys text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.monk_directory_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  authority_name text not null,
  domain_keys text[] not null default '{}',
  source_url text not null,
  source_kind text not null default 'official_portal',
  terms_review_status text not null default 'pending'
    check (terms_review_status in ('pending','approved','restricted','blocked')),
  last_checked_at timestamptz,
  import_enabled boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

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
  latitude numeric check (latitude is null or latitude between -90 and 90),
  longitude numeric check (longitude is null or longitude between -180 and 180),
  website_url text,
  phone_public text,
  email_public text,
  aishe_code text,
  official_identifiers jsonb not null default '{}',
  verification_state text not null default 'unverified' check (verification_state in ('verified','partially_verified','unverified','stale','disputed','closed')),
  verified_fields text[] not null default '{}',
  published boolean not null default false,
  source_updated_at timestamptz,
  last_verified_at timestamptz,
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (
    to_tsvector('simple'::regconfig,
      coalesce(canonical_name,'') || ' ' || coalesce(district,'') || ' ' ||
      coalesce(city,'') || ' ' || coalesce(locality,'') || ' ' || coalesce(address,''))
  ) stored,
  primary_source_id uuid references public.monk_directory_sources(id),
  primary_source_record_id text
);

create table if not exists public.monk_directory_programmes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.monk_directory_institutions(id) on delete cascade,
  programme_name text not null,
  programme_level text,
  discipline text,
  duration_months integer check (duration_months is null or duration_months>0),
  study_mode text,
  eligibility text,
  awarding_body text,
  affiliation_body text,
  academic_year text,
  intake integer check (intake is null or intake>=0),
  source_id uuid references public.monk_directory_sources(id),
  source_record_id text,
  verification_state text not null default 'unverified' check (verification_state in ('verified','partially_verified','unverified','stale','disputed','closed')),
  last_verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.monk_directory_approvals (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.monk_directory_institutions(id) on delete cascade,
  programme_id uuid references public.monk_directory_programmes(id) on delete cascade,
  regulator_source_id uuid not null references public.monk_directory_sources(id),
  approval_type text not null,
  approval_status text not null check (approval_status in ('approved','conditional','withdrawn','not_approved','unknown')),
  academic_year text not null,
  approved_intake integer check (approved_intake is null or approved_intake>=0),
  valid_from date,
  valid_until date,
  source_url text not null,
  source_record_id text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
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
  source_id uuid not null references public.monk_directory_sources(id) on delete cascade,
  source_record_id text,
  snapshot_hash text not null,
  source_published_at timestamptz,
  retrieved_at timestamptz not null default now(),
  payload jsonb not null,
  import_status text not null default 'received' check (import_status in ('received','validated','imported','rejected','needs_review')),
  import_error text,
  unique(source_id,source_record_id,snapshot_hash)
);

create table if not exists public.monk_directory_source_records (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.monk_directory_sources(id) on delete cascade,
  source_record_id text not null,
  institution_id uuid not null references public.monk_directory_institutions(id) on delete cascade,
  last_seen_snapshot_id uuid references public.monk_directory_source_snapshots(id),
  last_seen_at timestamptz not null default now(),
  first_seen_at timestamptz not null default now(),
  unique(source_id,source_record_id)
);

create index if not exists monk_directory_institutions_search_idx on public.monk_directory_institutions using gin(search_document);
create index if not exists monk_directory_institutions_published_idx on public.monk_directory_institutions(state_code,category_key,district,city,canonical_name) where published=true;
create index if not exists monk_directory_programmes_institution_idx on public.monk_directory_programmes(institution_id);
create index if not exists monk_directory_programmes_verified_idx on public.monk_directory_programmes(institution_id,programme_level,discipline,academic_year) where verification_state='verified';
create index if not exists monk_directory_approvals_programme_idx on public.monk_directory_approvals(programme_id);
create index if not exists monk_directory_approvals_regulator_source_idx on public.monk_directory_approvals(regulator_source_id);
create index if not exists monk_directory_institutions_category_idx on public.monk_directory_institutions(category_key);
create index if not exists monk_directory_programmes_source_idx on public.monk_directory_programmes(source_id);
create index if not exists monk_directory_source_records_snapshot_idx on public.monk_directory_source_records(last_seen_snapshot_id);
create index if not exists monk_directory_verification_events_institution_idx on public.monk_directory_verification_events(institution_id,created_at desc);

alter table public.organizations add column if not exists state_code text;
do $fk$
begin
  if not exists(select 1 from pg_constraint where conname='organizations_state_code_fkey') then
    alter table public.organizations add constraint organizations_state_code_fkey
      foreign key(state_code) references public.monk_directory_regions(code);
  end if;
end;
$fk$;

alter table public.monk_directory_regions enable row level security;
alter table public.monk_directory_categories enable row level security;
alter table public.monk_directory_sources enable row level security;
alter table public.monk_directory_institutions enable row level security;
alter table public.monk_directory_programmes enable row level security;
alter table public.monk_directory_approvals enable row level security;
alter table public.monk_directory_verification_events enable row level security;
alter table public.monk_directory_source_snapshots enable row level security;
alter table public.monk_directory_source_records enable row level security;

revoke all on public.monk_directory_regions,public.monk_directory_categories,public.monk_directory_sources,
 public.monk_directory_institutions,public.monk_directory_programmes,public.monk_directory_approvals,
 public.monk_directory_verification_events,public.monk_directory_source_snapshots,public.monk_directory_source_records
 from public,anon,authenticated;
grant select on public.monk_directory_regions,public.monk_directory_categories,public.monk_directory_sources,
 public.monk_directory_institutions,public.monk_directory_programmes,public.monk_directory_approvals,
 public.monk_directory_verification_events to anon,authenticated;
grant select on public.monk_directory_source_records to authenticated;

drop policy if exists monk_regions_public_read on public.monk_directory_regions;
create policy monk_regions_public_read on public.monk_directory_regions for select to anon,authenticated using(true);
drop policy if exists monk_categories_public_read on public.monk_directory_categories;
create policy monk_categories_public_read on public.monk_directory_categories for select to anon,authenticated using(active);
drop policy if exists monk_sources_public_read on public.monk_directory_sources;
create policy monk_sources_public_read on public.monk_directory_sources for select to anon,authenticated using(true);
drop policy if exists monk_institutions_public_read on public.monk_directory_institutions;
create policy monk_institutions_public_read on public.monk_directory_institutions for select to anon,authenticated using(published);
drop policy if exists monk_programmes_public_read on public.monk_directory_programmes;
create policy monk_programmes_public_read on public.monk_directory_programmes for select to anon,authenticated
 using(exists(select 1 from public.monk_directory_institutions i where i.id=institution_id and i.published));
drop policy if exists monk_approvals_public_read on public.monk_directory_approvals;
create policy monk_approvals_public_read on public.monk_directory_approvals for select to anon,authenticated
 using(exists(select 1 from public.monk_directory_institutions i where i.id=institution_id and i.published));
drop policy if exists monk_verification_events_public_read on public.monk_directory_verification_events;
create policy monk_verification_events_public_read on public.monk_directory_verification_events for select to anon,authenticated
 using(exists(select 1 from public.monk_directory_institutions i where i.id=institution_id and i.published));
drop policy if exists monk_source_record_map_public_read on public.monk_directory_source_records;
create policy monk_source_record_map_public_read on public.monk_directory_source_records for select to authenticated
 using(exists(select 1 from public.monk_directory_institutions i where i.id=institution_id and i.published));
drop policy if exists monk_source_snapshots_server_only on public.monk_directory_source_snapshots;
create policy monk_source_snapshots_server_only on public.monk_directory_source_snapshots for select to anon,authenticated using(false);

insert into public.monk_directory_categories(category_key,label,domain_keys,active) values
('agriculture','Agriculture & Veterinary',array['agriculture','veterinary'],true),
('allied_health','Allied & Healthcare Professions',array['allied_health','physiotherapy','occupational_therapy','optometry'],true),
('architecture','Architecture & Planning',array['architecture','planning'],true),
('arts_science','Arts & Science Colleges',array['arts','science'],true),
('ayush','AYUSH Institutions',array['ayush'],true),
('coaching','Coaching & Test Preparation',array['coaching'],true),
('commerce','Commerce Colleges',array['commerce'],true),
('dental','Dental Colleges',array['dental'],true),
('design','Design & Creative Arts',array['design','creative_arts'],true),
('education','Teacher Education',array['education'],true),
('engineering','Engineering & Technology',array['engineering','technology'],true),
('iti','ITI & Industrial Training',array['vocational'],true),
('law','Law Colleges',array['law'],true),
('management','Management Institutes',array['management'],true),
('medical','Medical Colleges',array['medical'],true),
('nursing','Nursing Colleges',array['nursing'],true),
('other','Other Institutions',array['other'],true),
('pharmacy','Pharmacy Colleges',array['pharmacy'],true),
('polytechnic','Polytechnic',array['technical_diploma'],true),
('rehabilitation','Rehabilitation & Special Education',array['rehabilitation','special_education'],true),
('research','Research Institutes',array['research'],true),
('university','Universities',array['multidisciplinary'],true),
('veterinary','Veterinary Colleges',array['veterinary'],true),
('vocational','Vocational & Skill Training',array['vocational','skills'],true)
on conflict(category_key) do update set label=excluded.label,domain_keys=excluded.domain_keys,active=excluded.active;

insert into public.monk_directory_regions(code,name,region_kind,country_code) values
('AN','Andaman and Nicobar Islands','union_territory','IN'),
('AP','Andhra Pradesh','state','IN'),('AR','Arunachal Pradesh','state','IN'),('AS','Assam','state','IN'),
('BR','Bihar','state','IN'),('CH','Chandigarh','union_territory','IN'),('CT','Chhattisgarh','state','IN'),
('DL','Delhi','union_territory','IN'),('DN','Dadra and Nagar Haveli and Daman and Diu','union_territory','IN'),
('GA','Goa','state','IN'),('GJ','Gujarat','state','IN'),('HP','Himachal Pradesh','state','IN'),
('HR','Haryana','state','IN'),('JH','Jharkhand','state','IN'),('JK','Jammu and Kashmir','union_territory','IN'),
('KA','Karnataka','state','IN'),('KL','Kerala','state','IN'),('LA','Ladakh','union_territory','IN'),
('LD','Lakshadweep','union_territory','IN'),('MH','Maharashtra','state','IN'),('ML','Meghalaya','state','IN'),
('MN','Manipur','state','IN'),('MP','Madhya Pradesh','state','IN'),('MZ','Mizoram','state','IN'),
('NL','Nagaland','state','IN'),('OD','Odisha','state','IN'),('PB','Punjab','state','IN'),
('PY','Puducherry','union_territory','IN'),('RJ','Rajasthan','state','IN'),('SK','Sikkim','state','IN'),
('TN','Tamil Nadu','state','IN'),('TR','Tripura','state','IN'),('TS','Telangana','state','IN'),
('UK','Uttarakhand','state','IN'),('UP','Uttar Pradesh','state','IN'),('WB','West Bengal','state','IN')
on conflict(code) do update set name=excluded.name,region_kind=excluded.region_kind,country_code=excluded.country_code;
