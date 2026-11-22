drop function if exists public.set_organization_classification(text,text,text,text[]);

create or replace function public.set_organization_classification(
  p_entity_type text,
  p_institution_category text default null,
  p_state_code text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid;
  v_vertical text;
  v_enabled_modules text[];
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_entity_type is null or p_entity_type not in (
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
  if not public.has_org_role(v_org_id, array['owner','admin','principal']) then
    raise exception 'Organization administrator permission required';
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

  if v_vertical = 'education' then
    if p_institution_category is null then
      raise exception 'Select the institution category';
    end if;
    if p_state_code is null then
      raise exception 'Select the institution state or union territory';
    end if;
    if not exists (
      select 1 from public.monk_directory_categories
      where category_key = p_institution_category and active
    ) then
      raise exception 'Invalid institution category';
    end if;
  end if;

  if p_state_code is not null and not exists (
    select 1 from public.monk_directory_regions where code = p_state_code
  ) then
    raise exception 'Invalid Indian state or union territory code';
  end if;

  -- Enabled modules are server-owned tenant flags; never trust a client-supplied module list
  -- to decide which legal notices apply.
  select coalesce(array_agg(tf.flag_key order by tf.flag_key), '{}'::text[])
  into v_enabled_modules
  from public.tenant_flags tf
  where tf.organization_id = v_org_id and tf.enabled = true;

  update public.organizations
  set entity_type = p_entity_type,
      institution_category = p_institution_category,
      jurisdiction = 'IN',
      state_code = p_state_code,
      enabled_modules = coalesce(v_enabled_modules, '{}'::text[])
  where id = v_org_id;

  if not found then
    raise exception 'Organization not found';
  end if;
end;
$$;

revoke all on function public.set_organization_classification(text,text,text) from public, anon;
grant execute on function public.set_organization_classification(text,text,text) to authenticated;
