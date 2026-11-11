create or replace function public.create_organization_invitation(
  target_org uuid, invite_email text, invite_role text, expires_in_days integer default 7
) returns table(invitation_id uuid, invitation_token text, expires_at timestamptz)
language plpgsql security definer set search_path = public, extensions
as $function$
declare raw_token text; normalized_email text; expiry timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  normalized_email := lower(trim(coalesce(invite_email,'')));
  if normalized_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$' then
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
    jsonb_build_object('email',normalized_email,'role',invite_role,'expires_at',expiry));
  return next;
end;
$function$;

create or replace function public.switch_organization(target_org uuid)
returns uuid language plpgsql security definer set search_path=public
as $function$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not public.is_org_member(target_org) then
    raise exception 'Organization not found' using errcode='P0002';
  end if;
  update public.user_settings set active_organization_id=target_org,updated_at=now()
  where user_id=auth.uid();
  if not found then raise exception 'User settings not found' using errcode='P0002'; end if;
  return target_org;
end;
$function$;
revoke all on function public.create_organization_invitation(uuid,text,text,integer) from public,anon;
revoke all on function public.switch_organization(uuid) from public,anon;
grant execute on function public.create_organization_invitation(uuid,text,text,integer) to authenticated;
grant execute on function public.switch_organization(uuid) to authenticated;
