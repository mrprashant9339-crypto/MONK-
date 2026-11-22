-- Organization classification is server-owned and powers server-side policy resolution.
alter table public.organizations
  add column if not exists entity_type text,
  add column if not exists institution_category text,
  add column if not exists jurisdiction text not null default 'IN',
  add column if not exists state_code text,
  add column if not exists enabled_modules text[] not null default '{}';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organizations_entity_type_check'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_entity_type_check
      check (entity_type is null or entity_type in (
        'government_college','private_college','government_university','private_university',
        'coaching_institute','government_body','trust_society','business',
        'sole_proprietor','company','partnership','other'
      ));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'organizations_state_code_fkey'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_state_code_fkey
      foreign key (state_code) references public.monk_directory_regions(code);
  end if;
end $$;

create or replace function public.set_organization_classification(
  p_entity_type text,
  p_institution_category text default null,
  p_state_code text default null,
  p_enabled_modules text[] default '{}'::text[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid;
  v_vertical text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_entity_type not in (
    'government_college','private_college','government_university','private_university',
    'coaching_institute','government_body','trust_society','business',
    'sole_proprietor','company','partnership','other'
  ) then
    raise exception 'Unsupported organization type';
  end if;

  v_org_id := public.current_organization_id();
  if v_org_id is null then
    raise exception 'No active organization membership';
  end if;

  select vertical into v_vertical
  from public.organizations
  where id = v_org_id;

  if v_vertical = 'education' and p_entity_type in ('business','sole_proprietor','company','partnership') then
    raise exception 'Business legal entity type cannot be assigned to an education workspace';
  end if;
  if v_vertical = 'business' and p_entity_type in (
    'government_college','private_college','government_university','private_university','coaching_institute'
  ) then
    raise exception 'Education institution type cannot be assigned to a business workspace';
  end if;
  if p_state_code is not null and not exists (
    select 1 from public.monk_directory_regions where code = p_state_code
  ) then
    raise exception 'Invalid Indian state or union territory code';
  end if;

  update public.organizations
  set entity_type = p_entity_type,
      institution_category = p_institution_category,
      jurisdiction = 'IN',
      state_code = p_state_code,
      enabled_modules = coalesce(p_enabled_modules, '{}'::text[])
  where id = v_org_id;

  if not found then
    raise exception 'Organization not found';
  end if;
end;
$$;

revoke all on function public.set_organization_classification(text,text,text,text[]) from public, anon;
grant execute on function public.set_organization_classification(text,text,text,text[]) to authenticated;

-- Rules are server-evaluated. Policy documents themselves must be inserted and legally reviewed
-- before the corresponding policy keys can be returned as ready for acceptance.
insert into public.monk_policy_rules (rule_key, priority, conditions, required_policy_keys, active) values
('base_platform_privacy', 1, '{"all":true}'::jsonb, array['platform','privacy'], true),
('government_college', 10, '{"entity_type":"government_college"}'::jsonb, array['education','government_entity','student_data'], true),
('private_college', 10, '{"entity_type":"private_college"}'::jsonb, array['education','private_entity','student_data','data_processing'], true),
('government_university', 10, '{"entity_type":"government_university"}'::jsonb, array['education','government_entity','student_data','research_data'], true),
('private_university', 10, '{"entity_type":"private_university"}'::jsonb, array['education','private_entity','student_data','data_processing','research_data'], true),
('coaching_institute', 10, '{"entity_type":"coaching_institute"}'::jsonb, array['coaching_services','consumer_terms','student_data'], true),
('government_body', 10, '{"entity_type":"government_body"}'::jsonb, array['government_entity','data_processing'], true),
('trust_society', 10, '{"entity_type":"trust_society"}'::jsonb, array['private_entity','data_processing'], true),
('business', 10, '{"entity_type":"business"}'::jsonb, array['business_services','customer_data'], true),
('sole_proprietor', 10, '{"entity_type":"sole_proprietor"}'::jsonb, array['business_services','customer_data'], true),
('company', 10, '{"entity_type":"company"}'::jsonb, array['business_services','customer_data','data_processing'], true),
('partnership', 10, '{"entity_type":"partnership"}'::jsonb, array['business_services','customer_data'], true),
('payments_module', 30, '{"enabled_modules_contains":"payments"}'::jsonb, array['payments'], true),
('location_module', 30, '{"enabled_modules_contains":"location"}'::jsonb, array['location'], true),
('marketplace_module', 30, '{"enabled_modules_contains":"marketplace"}'::jsonb, array['marketplace'], true)
on conflict (rule_key) do update
set priority = excluded.priority,
    conditions = excluded.conditions,
    required_policy_keys = excluded.required_policy_keys,
    active = excluded.active;
