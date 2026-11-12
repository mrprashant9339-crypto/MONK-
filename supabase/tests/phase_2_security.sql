-- Phase 2 database security assertions. Run with Supabase SQL Editor or psql.
do $test$
declare
  table_name text;
  function_signature text;
begin
  foreach table_name in array array['projects','organization_members','invitations','audit_logs'] loop
    if not (select c.relrowsecurity from pg_class c where c.oid=format('public.%I',table_name)::regclass) then
      raise exception 'RLS is disabled on public.%',table_name;
    end if;
  end loop;

  foreach function_signature in array array[
    'public.update_project_details(uuid,text,text,text,date,text,text)',
    'public.archive_project(uuid)',
    'public.list_organization_members()',
    'public.update_organization_member_role(uuid,text)',
    'public.remove_organization_member(uuid)',
    'public.list_organization_invitations()'
  ] loop
    if has_function_privilege('anon',function_signature,'EXECUTE') then
      raise exception 'anon can execute %',function_signature;
    end if;
    if not has_function_privilege('authenticated',function_signature,'EXECUTE') then
      raise exception 'authenticated cannot execute %',function_signature;
    end if;
  end loop;

  if has_table_privilege('authenticated','public.projects','INSERT')
     or has_table_privilege('authenticated','public.projects','UPDATE')
     or has_table_privilege('authenticated','public.projects','DELETE') then
    raise exception 'Authenticated users have direct project write privileges';
  end if;
  if has_table_privilege('authenticated','public.organization_members','INSERT')
     or has_table_privilege('authenticated','public.organization_members','UPDATE')
     or has_table_privilege('authenticated','public.organization_members','DELETE') then
    raise exception 'Authenticated users have direct organization member write privileges';
  end if;
  if has_table_privilege('authenticated','public.invitations','INSERT')
     or has_table_privilege('authenticated','public.invitations','UPDATE')
     or has_table_privilege('authenticated','public.invitations','DELETE') then
    raise exception 'Authenticated users have direct invitation write privileges';
  end if;
end;
$test$;
