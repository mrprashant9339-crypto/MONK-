create or replace function public.record_legal_consent(accepted_terms_version text, accepted_privacy_version text)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare new_consent_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if length(trim(coalesce(accepted_terms_version,'')))=0 or length(trim(coalesce(accepted_privacy_version,'')))=0 then
    raise exception 'Both legal document versions are required' using errcode='22023';
  end if;
  insert into public.legal_consents(user_id,terms_version,privacy_version)
  values(auth.uid(),trim(accepted_terms_version),trim(accepted_privacy_version))
  on conflict do nothing
  returning id into new_consent_id;
  if new_consent_id is null then
    select id into new_consent_id from public.legal_consents
    where user_id=auth.uid() and terms_version=trim(accepted_terms_version)
      and privacy_version=trim(accepted_privacy_version)
    order by accepted_at desc limit 1;
  end if;
  return new_consent_id;
end;
$$;
revoke all on function public.record_legal_consent(text,text) from public,anon;
grant execute on function public.record_legal_consent(text,text) to authenticated;