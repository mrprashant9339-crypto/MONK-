-- Update only the caller's own existing profile row through a narrow RPC.
create or replace function public.update_my_profile(p_full_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare updated_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_full_name is null or length(trim(p_full_name)) < 2 or length(trim(p_full_name)) > 100 then
    raise exception 'Full name must be between 2 and 100 characters' using errcode = '22023';
  end if;
  insert into public.profiles (id, full_name)
  values (auth.uid(), trim(p_full_name))
  on conflict (id) do update
    set full_name = excluded.full_name, updated_at = now()
  returning * into updated_profile;
  return updated_profile;
end;
$function$;

revoke all on function public.update_my_profile(text) from public, anon;
grant execute on function public.update_my_profile(text) to authenticated;
