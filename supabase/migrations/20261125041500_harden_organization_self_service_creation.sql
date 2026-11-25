-- Keep public self-service organization creation limited to verified business owners.
-- Education workspaces are provisioned only after MONK verifies the institution.
create or replace function public.create_organization(
  org_name text,
  org_slug text,
  org_country text default 'IN',
  org_timezone text default 'Asia/Kolkata',
  org_currency text default 'INR',
  org_locale text default 'en-IN',
  org_industry text default 'Professional services',
  org_vertical text default 'business'
)
returns public.organizations
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  new_org public.organizations;
  caller_metadata jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.current_user_email_verified() then
    raise exception 'Verify your email before creating a workspace' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.legal_consents lc
    where lc.user_id = auth.uid()
  ) then
    raise exception 'Accept the current MONK Terms and Privacy Policy before creating a workspace' using errcode = '42501';
  end if;

  caller_metadata := coalesce(auth.jwt() -> 'user_metadata', '{}'::jsonb);

  if org_vertical = 'education' then
    raise exception 'Campus workspaces require institution verification. Contact MONK institution onboarding; student and staff accounts must join an existing institution.' using errcode = '42501';
  end if;

  if org_vertical <> 'business'
     or caller_metadata ->> 'vertical' <> 'business'
     or caller_metadata ->> 'intended_role' <> 'owner' then
    raise exception 'Only a verified MONK Business owner can create a business workspace. Team members must join by invitation.' using errcode = '42501';
  end if;

  if length(trim(coalesce(org_name, ''))) < 2 or length(trim(org_name)) > 120 then
    raise exception 'Organization name must be between 2 and 120 characters' using errcode = '22023';
  end if;

  if org_slug is null or org_slug !~ '^[a-z0-9][a-z0-9-]{1,47}[a-z0-9]$' then
    raise exception 'Invalid organization URL' using errcode = '22023';
  end if;

  if org_slug in ('admin','api','app','auth','login','signup','support','www','mail','status') then
    raise exception 'This workspace URL is reserved' using errcode = '22023';
  end if;

  insert into public.organizations (name, slug, country, timezone, currency, locale, industry, vertical)
  values (trim(org_name), lower(org_slug), org_country, org_timezone, org_currency, org_locale, org_industry, 'business')
  returning * into new_org;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (new_org.id, auth.uid(), 'owner', 'active');

  update public.user_settings
  set active_organization_id = new_org.id, updated_at = now()
  where user_id = auth.uid();

  perform public.record_audit(new_org.id, 'organization.created', 'organization', new_org.id::text, null, to_jsonb(new_org), null, false);
  return new_org;
end;
$function$;

revoke all on function public.create_organization(text,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.create_organization(text,text,text,text,text,text,text,text) to authenticated, service_role;
