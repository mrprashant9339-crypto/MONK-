-- MONK authentication foundation: deterministic user bootstrap and invitation RBAC seed.
-- Safe to re-run; no user or organization rows are created by this migration.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(concat_ws(' ',
        new.raw_user_meta_data ->> 'first_name',
        new.raw_user_meta_data ->> 'last_name'
      )), ''),
      ''
    )
  )
  on conflict (id) do update
    set full_name = case
      when public.profiles.full_name = '' then excluded.full_name
      else public.profiles.full_name
    end;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  if coalesce(new.raw_user_meta_data ->> 'accepted_legal', 'false') = 'true' then
    if nullif(trim(new.raw_user_meta_data ->> 'terms_version'), '') is null
       or nullif(trim(new.raw_user_meta_data ->> 'privacy_version'), '') is null then
      raise exception 'Terms and Privacy Policy versions are required for legal consent';
    end if;

    insert into public.legal_consents (user_id, terms_version, privacy_version)
    select new.id,
      trim(new.raw_user_meta_data ->> 'terms_version'),
      trim(new.raw_user_meta_data ->> 'privacy_version')
    where not exists (
      select 1 from public.legal_consents lc
      where lc.user_id = new.id
        and lc.terms_version = trim(new.raw_user_meta_data ->> 'terms_version')
        and lc.privacy_version = trim(new.raw_user_meta_data ->> 'privacy_version')
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

insert into public.roles (id, description, is_system)
values
  ('owner', 'Organization owner with full workspace authority', true),
  ('admin', 'Organization administrator', true),
  ('manager', 'Team and project manager', true),
  ('sales', 'Sales and CRM contributor', true),
  ('contributor', 'Standard workspace contributor', true),
  ('auditor', 'Read-only audit access', true),
  ('client', 'External client access', true),
  ('vendor', 'External vendor access', true)
on conflict (id) do update set description = excluded.description, is_system = true;

insert into public.permissions (id, description)
values ('organization.members.invite', 'Invite and revoke organization member invitations')
on conflict (id) do update set description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
values
  ('owner', 'organization.members.invite'),
  ('admin', 'organization.members.invite')
on conflict do nothing;

-- Prevent anonymous or public execution of privileged invitation functions.
revoke all on function public.create_organization_invitation(uuid, text, text, integer) from public, anon;
revoke all on function public.accept_organization_invitation(text) from public, anon;
revoke all on function public.revoke_organization_invitation(uuid) from public, anon;
revoke all on function public.switch_organization(uuid) from public, anon;
revoke all on function public.has_org_permission(uuid, text) from public, anon;

grant execute on function public.create_organization_invitation(uuid, text, text, integer) to authenticated;
grant execute on function public.accept_organization_invitation(text) to authenticated;
grant execute on function public.revoke_organization_invitation(uuid) to authenticated;
grant execute on function public.switch_organization(uuid) to authenticated;
grant execute on function public.has_org_permission(uuid, text) to authenticated;
