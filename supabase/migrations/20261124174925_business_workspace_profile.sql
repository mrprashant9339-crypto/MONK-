-- Canonical business identity profile stored in the existing tenant companies table.
-- The marker prevents a CRM customer record from being mistaken for the workspace's own profile.
create unique index if not exists companies_one_workspace_profile_idx
on public.companies (organization_id)
where deleted_at is null and custom->>'monk_workspace_profile' = 'true';

create or replace function public.upsert_business_workspace_profile(
  p_name text,
  p_domain text default null,
  p_industry text default null,
  p_size_band text default null,
  p_address text default null,
  p_phone text default null,
  p_website text default null
)
returns public.companies
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_org_id uuid := public.current_organization_id();
  v_company public.companies;
  v_domain text := nullif(lower(trim(coalesce(p_domain,''))), '');
  v_website text := nullif(trim(coalesce(p_website,'')), '');
begin
  if auth.uid() is null or v_org_id is null then
    raise exception 'Authentication and an active workspace are required' using errcode='42501';
  end if;
  if not public.has_org_permission(v_org_id, 'organization.profile.update') then
    raise exception 'You do not have permission to update this workspace profile' using errcode='42501';
  end if;
  if length(trim(coalesce(p_name,''))) not between 2 and 160 then
    raise exception 'Company name must contain 2–160 characters' using errcode='22023';
  end if;
  if v_domain is not null and v_domain !~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$' then
    raise exception 'Enter a valid company domain' using errcode='22023';
  end if;
  if v_website is not null and v_website !~ '^https?://' then
    raise exception 'Website must begin with http:// or https://' using errcode='22023';
  end if;
  if p_size_band is not null and p_size_band not in ('1-10','11-50','51-200','201-500','501-1000','1000+') then
    raise exception 'Select a valid team size' using errcode='22023';
  end if;

  select * into v_company
  from public.companies
  where organization_id = v_org_id
    and deleted_at is null
    and custom->>'monk_workspace_profile' = 'true'
  for update;

  if v_company.id is null then
    insert into public.companies(
      organization_id,name,domain,industry,size_band,address,phone,website,status,custom,owner_id,source
    ) values (
      v_org_id,trim(p_name),v_domain,nullif(trim(coalesce(p_industry,'')),''),
      p_size_band,nullif(trim(coalesce(p_address,'')),''),
      nullif(trim(coalesce(p_phone,'')),''),v_website,'active',
      jsonb_build_object('monk_workspace_profile','true'),auth.uid(),'workspace_profile'
    ) returning * into v_company;
  else
    update public.companies set
      name=trim(p_name),domain=v_domain,
      industry=nullif(trim(coalesce(p_industry,'')),''),
      size_band=p_size_band,
      address=nullif(trim(coalesce(p_address,'')),''),
      phone=nullif(trim(coalesce(p_phone,'')),''),
      website=v_website,updated_at=now()
    where id=v_company.id and organization_id=v_org_id
    returning * into v_company;
  end if;

  perform public.record_audit(
    v_org_id,'organization.business_profile.updated','company',v_company.id::text,
    null,jsonb_build_object('company_id',v_company.id),null,false
  );
  return v_company;
end;
$$;

revoke all on function public.upsert_business_workspace_profile(text,text,text,text,text,text,text) from public, anon;
grant execute on function public.upsert_business_workspace_profile(text,text,text,text,text,text,text) to authenticated;
