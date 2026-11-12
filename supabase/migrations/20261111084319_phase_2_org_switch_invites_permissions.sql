create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

alter table public.organizations add column if not exists vertical text not null default 'business';
update public.organizations set vertical = case when lower(industry) like '%education%' then 'education' else 'business' end
where vertical is null or vertical not in ('education','business');
alter table public.organizations drop constraint if exists organizations_vertical_check;
alter table public.organizations add constraint organizations_vertical_check check (vertical in ('education','business'));

drop policy if exists "member organizations" on public.organizations;
create policy "member organizations" on public.organizations for select to authenticated
using (deleted_at is null and public.is_org_member(id));

drop policy if exists "own memberships across organizations" on public.organization_members;
create policy "own memberships across organizations" on public.organization_members for select to authenticated
using (user_id = (select auth.uid()) and status = 'active');

create or replace function public.create_organization(
  org_name text, org_slug text, org_country text default 'IN', org_timezone text default 'Asia/Kolkata',
  org_currency text default 'INR', org_locale text default 'en-IN',
  org_industry text default 'Professional services', org_vertical text default 'business'
) returns public.organizations language plpgsql security definer
set search_path = public, extensions
as $function$
declare new_org public.organizations;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if length(trim(coalesce(org_name,''))) < 2 or length(trim(org_name)) > 120 then
    raise exception 'Organization name must be between 2 and 120 characters' using errcode = '22023';
  end if;
  if org_slug is null or org_slug !~ '^[a-z0-9][a-z0-9-]{1,47}[a-z0-9]$' then
    raise exception 'Invalid organization URL' using errcode = '22023';
  end if;
  if org_slug in ('admin','api','app','auth','login','signup','support','www','mail','status') then
    raise exception 'This workspace URL is reserved' using errcode = '22023';
  end if;
  if org_vertical not in ('education','business') then raise exception 'Invalid organization vertical' using errcode = '22023'; end if;
  insert into public.organizations (name,slug,country,timezone,currency,locale,industry,vertical)
  values (trim(org_name),lower(org_slug),org_country,org_timezone,org_currency,org_locale,org_industry,org_vertical)
  returning * into new_org;
  insert into public.organization_members (organization_id,user_id,role,status)
  values (new_org.id,auth.uid(),'owner','active');
  update public.user_settings set active_organization_id=new_org.id,updated_at=now() where user_id=auth.uid();
  perform public.record_audit(new_org.id,'organization.created','organization',new_org.id::text,null,to_jsonb(new_org),null,false);
  return new_org;
end;
$function$;
revoke all on function public.create_organization(text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.create_organization(text,text,text,text,text,text,text,text) to authenticated;

create or replace function public.has_org_permission(target_org uuid, permission_key text)
returns boolean language sql stable security definer set search_path = public
as $function$
  select exists (
    select 1 from public.organization_members om
    join public.role_permissions rp on rp.role_id = om.role
    where om.organization_id = target_org and om.user_id = (select auth.uid())
      and om.status = 'active' and rp.permission_id = permission_key
  );
$function$;
revoke all on function public.has_org_permission(uuid,text) from public,anon;
grant execute on function public.has_org_permission(uuid,text) to authenticated;

create or replace function public.create_organization_invitation(
 target_org uuid, invite_email text, invite_role text, expires_in_days integer default 7
) returns table(invitation_id uuid, invitation_token text, expires_at timestamptz)
language plpgsql security definer set search_path = public, extensions
as $function$
declare raw_token text; normalized_email text; expiry timestamptz;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 normalized_email := lower(trim(coalesce(invite_email,'')));
 if normalized_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
   raise exception 'Enter a valid email address' using errcode='22023';
 end if;
 if invite_role not in ('admin','manager','sales','contributor','auditor','client','vendor') then
   raise exception 'This role cannot be assigned through an invitation' using errcode='22023';
 end if;
 if not public.has_org_permission(target_org,'organization.members.invite') then
   raise exception 'You do not have permission to invite members' using errcode='42501';
 end if;
 if invite_role='admin' and not public.has_org_role(target_org,array['owner']) then
   raise exception 'Only the organization owner can invite an administrator' using errcode='42501';
 end if;
 if exists(select 1 from public.organization_members om join auth.users u on u.id=om.user_id
   where om.organization_id=target_org and lower(u.email)=normalized_email and om.status='active') then
   raise exception 'This person is already an active organization member' using errcode='23505';
 end if;
 if exists(select 1 from public.invitations i where i.organization_id=target_org and lower(i.email::text)=normalized_email
   and i.accepted_at is null and i.revoked_at is null and i.expires_at>now()) then
   raise exception 'An active invitation already exists for this email' using errcode='23505';
 end if;
 raw_token := encode(extensions.gen_random_bytes(32),'hex');
 expiry := now() + make_interval(days => greatest(1,least(coalesce(expires_in_days,7),30)));
 insert into public.invitations(organization_id,email,role,token_hash,invited_by,expires_at)
 values(target_org,normalized_email::citext,invite_role,encode(extensions.digest(raw_token,'sha256'),'hex'),auth.uid(),expiry)
 returning id into invitation_id;
 invitation_token := raw_token; expires_at := expiry;
 perform public.record_audit(target_org,'organization.invitation.created','invitation',invitation_id::text,null,
   jsonb_build_object('email',normalized_email,'role',invite_role,'expires_at',expiry),null,false);
 return next;
end;
$function$;

create or replace function public.accept_organization_invitation(invite_token text)
returns uuid language plpgsql security definer set search_path = public, extensions
as $function$
declare inv public.invitations; user_email text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if invite_token is null or length(invite_token) <> 64 then raise exception 'Invalid or expired invitation' using errcode='22023'; end if;
 select lower(email) into user_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if user_email is null then raise exception 'Verify your email address before accepting an invitation' using errcode='42501'; end if;
 select * into inv from public.invitations
 where token_hash=encode(extensions.digest(invite_token,'sha256'),'hex') for update;
 if not found or inv.accepted_at is not null or inv.revoked_at is not null or inv.expires_at<=now() then
   raise exception 'Invalid or expired invitation' using errcode='22023';
 end if;
 if lower(inv.email::text) <> user_email then raise exception 'This invitation belongs to a different email address' using errcode='42501'; end if;
 insert into public.organization_members(organization_id,user_id,role,status)
 values(inv.organization_id,auth.uid(),inv.role,'active')
 on conflict(organization_id,user_id) do update set role=excluded.role,status='active',updated_at=now();
 update public.invitations set accepted_at=now() where id=inv.id;
 update public.user_settings set active_organization_id=inv.organization_id,updated_at=now() where user_id=auth.uid();
 perform public.record_audit(inv.organization_id,'organization.invitation.accepted','invitation',inv.id::text,null,
   jsonb_build_object('user_id',auth.uid(),'role',inv.role),null,false);
 return inv.organization_id;
end;
$function$;

create or replace function public.revoke_organization_invitation(invitation_id uuid)
returns boolean language plpgsql security definer set search_path = public
as $function$
declare org_id uuid;
begin
 select organization_id into org_id from public.invitations where id=invitation_id;
 if org_id is null then return false; end if;
 if not public.has_org_permission(org_id,'organization.members.invite') then
   raise exception 'You do not have permission to revoke invitations' using errcode='42501';
 end if;
 update public.invitations set revoked_at=now()
 where id=invitation_id and accepted_at is null and revoked_at is null;
 if found then
   perform public.record_audit(org_id,'organization.invitation.revoked','invitation',invitation_id::text,null,null,null,false);
   return true;
 end if;
 return false;
end;
$function$;
revoke all on function public.create_organization_invitation(uuid,text,text,integer) from public,anon;
revoke all on function public.accept_organization_invitation(text) from public,anon;
revoke all on function public.revoke_organization_invitation(uuid) from public,anon;
grant execute on function public.create_organization_invitation(uuid,text,text,integer) to authenticated;
grant execute on function public.accept_organization_invitation(text) to authenticated;
grant execute on function public.revoke_organization_invitation(uuid) to authenticated;
