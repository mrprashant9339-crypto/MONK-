create or replace function public.enforce_legal_consent_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if new.terms_version is distinct from '2026-11-22'
     or new.privacy_version is distinct from '2026-11-22' then
    raise exception 'Unsupported legal document version' using errcode = '22023';
  end if;
  new.user_id := v_user_id;
  new.accepted_at := pg_catalog.now();
  return new;
end;
$function$;

drop trigger if exists legal_consents_enforce_insert on public.legal_consents;
create trigger legal_consents_enforce_insert
before insert on public.legal_consents
for each row execute function public.enforce_legal_consent_insert();

drop policy if exists "own legal consent insert" on public.legal_consents;
create policy "own legal consent insert"
on public.legal_consents
for insert to authenticated
with check (user_id = (select auth.uid()));

grant insert on table public.legal_consents to authenticated;
revoke update, delete, truncate, references, trigger
  on table public.legal_consents from authenticated;

create or replace function public.record_legal_consent(
  p_terms_version text,
  p_privacy_version text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_consent_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_terms_version is distinct from '2026-11-22'
     or p_privacy_version is distinct from '2026-11-22' then
    raise exception 'Unsupported legal document version' using errcode = '22023';
  end if;
  insert into public.legal_consents(user_id, terms_version, privacy_version)
  values (auth.uid(), p_terms_version, p_privacy_version)
  on conflict (user_id, terms_version, privacy_version)
  do update set accepted_at = public.legal_consents.accepted_at
  returning id into v_consent_id;
  return v_consent_id;
end;
$function$;

revoke all on function public.record_legal_consent(text, text) from public, anon;
grant execute on function public.record_legal_consent(text, text) to authenticated;
revoke all on function public.enforce_legal_consent_insert() from public, anon, authenticated;
