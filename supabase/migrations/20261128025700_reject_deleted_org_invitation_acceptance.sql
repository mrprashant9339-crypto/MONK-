-- Reject invitations for organizations that have since been soft-deleted.
-- This check must happen before inserting/reactivating membership so invitation
-- acceptance does not rely on the later audit call to abort the transaction.

create or replace function public.accept_organization_invitation(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $function$
declare
  inv public.invitations;
  user_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if invite_token is null or length(invite_token) <> 64 then
    raise exception 'Invalid or expired invitation' using errcode = '22023';
  end if;

  select lower(email)
  into user_email
  from auth.users
  where id = auth.uid()
    and email_confirmed_at is not null;

  if user_email is null then
    raise exception 'Verify your email address before accepting an invitation'
      using errcode = '42501';
  end if;

  select *
  into inv
  from public.invitations
  where token_hash = encode(extensions.digest(invite_token, 'sha256'), 'hex')
  for update;

  if not found
     or inv.accepted_at is not null
     or inv.revoked_at is not null
     or inv.expires_at <= now() then
    raise exception 'Invalid or expired invitation' using errcode = '22023';
  end if;

  if lower(inv.email::text) <> user_email then
    raise exception 'This invitation belongs to a different email address'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organizations o
    where o.id = inv.organization_id
      and o.deleted_at is null
  ) then
    raise exception 'Organization not found' using errcode = 'P0002';
  end if;

  insert into public.organization_members(organization_id, user_id, role, status)
  values(inv.organization_id, auth.uid(), inv.role, 'active')
  on conflict(organization_id, user_id) do update
    set role = excluded.role,
        status = 'active',
        updated_at = now();

  update public.invitations
  set accepted_at = now()
  where id = inv.id;

  update public.user_settings
  set active_organization_id = inv.organization_id,
      updated_at = now()
  where user_id = auth.uid();

  perform public.record_audit(
    inv.organization_id,
    'organization.invitation.accepted',
    'invitation',
    inv.id::text,
    null,
    jsonb_build_object('user_id', auth.uid(), 'role', inv.role),
    null,
    false
  );

  return inv.organization_id;
end;
$function$;
