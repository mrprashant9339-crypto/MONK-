-- Phase 7 guardian portal scope regression checks.
-- Run against a migrated database with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f this_file
-- These assertions inspect policy definitions and storage configuration; they do not read student records.

do $test$
declare
  policy_sql text;
  table_name text;
  policy_name text;
  policy_row record;
  required_policies constant text[][] := array[
    array['education_attendance_records','education_attendance_records_parent_read'],
    array['education_documents','education_documents_parent_read'],
    array['education_results','education_results_parent_read']
  ];
begin
  foreach table_name in array array[
    'education_guardians',
    'education_student_guardians',
    'education_students',
    'education_attendance_records',
    'education_documents',
    'education_results'
  ] loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = table_name
        and c.relkind = 'r'
        and c.relrowsecurity
    ) then
      raise exception 'RLS is missing or table does not exist: public.%', table_name;
    end if;
  end loop;

  select lower(coalesce(p.qual, ''))
    into policy_sql
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename = 'education_student_guardians'
    and p.policyname = 'education_student_guardians_parent_read'
    and p.cmd = 'SELECT'
    and p.roles @> array['authenticated']::name[];

  if policy_sql is null
     or position('education_guardians' in policy_sql) = 0
     or position('education_student_guardians.guardian_id' in policy_sql) = 0
     or position('auth.uid()' in policy_sql) = 0 then
    raise exception 'Guardian-link SELECT policy must bind guardian_id to the authenticated guardian profile';
  end if;

  foreach policy_row in
    select *
    from unnest(required_policies) as p(table_name, policy_name)
  loop
    select lower(coalesce(p.qual, ''))
      into policy_sql
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = policy_row.table_name
      and p.policyname = policy_row.policy_name
      and p.cmd = 'SELECT'
      and p.roles @> array['authenticated']::name[];

    if policy_sql is null
       or position('education_student_guardians' in policy_sql) = 0
       or position('education_guardians' in policy_sql) = 0
       or position('g.user_id' in policy_sql) = 0
       or position('auth.uid()' in policy_sql) = 0 then
      raise exception 'Parent policy %.% must be restricted to explicitly linked children and the signed-in guardian',
        policy_row.table_name, policy_row.policy_name;
    end if;
  end loop;

  select lower(coalesce(p.qual, ''))
    into policy_sql
  from pg_policies p
  where p.schemaname = 'storage'
    and p.tablename = 'objects'
    and p.policyname = 'education_storage_read'
    and p.cmd = 'SELECT'
    and p.roles @> array['authenticated']::name[];

  if policy_sql is null
     or position('education-private' in policy_sql) = 0
     or position('education_student_guardians' in policy_sql) = 0
     or position('education_guardians' in policy_sql) = 0
     or position('g.user_id' in policy_sql) = 0
     or position('auth.uid()' in policy_sql) = 0 then
    raise exception 'Private education storage read policy must restrict guardian access to linked student folders';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'education-private'
      and public = false
      and file_size_limit <= 10485760
  ) then
    raise exception 'education-private bucket must remain private and enforce the 10 MB upload limit';
  end if;
end;
$test$;
