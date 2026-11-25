-- Cache auth context lookups once per statement instead of per candidate row.
-- The policy predicates are otherwise preserved byte-for-byte.
do $$
declare
  p record;
  new_qual text;
  new_check text;
  statement text;
begin
  for p in
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (policyname, tablename) in (
        ('education_students_claim_own', 'education_students'),
        ('education_students_claim_read', 'education_students'),
        ('education_attendance_records_hod_manage', 'education_attendance_records'),
        ('education_attendance_records_teacher_manage', 'education_attendance_records'),
        ('education_student_guardians_parent_read', 'education_student_guardians'),
        ('education_student_guardians_student_read', 'education_student_guardians'),
        ('education_results_hod_read', 'education_results'),
        ('education_results_teacher_manage', 'education_results'),
        ('education_guardians_claim', 'education_guardians'),
        ('education_guardians_claim_read', 'education_guardians'),
        ('monk_acceptances_owner_read', 'monk_policy_acceptances'),
        ('monk_saved_places_owner_all', 'monk_user_saved_places')
      )
  loop
    new_qual := p.qual;
    new_check := p.with_check;

    if new_qual is not null then
      new_qual := regexp_replace(new_qual, 'auth\.uid\(\)', '(select auth.uid())', 'gi');
      new_qual := regexp_replace(new_qual, 'auth\.jwt\(\)', '(select auth.jwt())', 'gi');
    end if;
    if new_check is not null then
      new_check := regexp_replace(new_check, 'auth\.uid\(\)', '(select auth.uid())', 'gi');
      new_check := regexp_replace(new_check, 'auth\.jwt\(\)', '(select auth.jwt())', 'gi');
    end if;

    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);

    statement := format(
      'create policy %I on %I.%I as %s for %s to %s',
      p.policyname, p.schemaname, p.tablename, p.permissive, p.cmd,
      array_to_string(p.roles, ', ')
    );
    if new_qual is not null then
      statement := statement || format(' using (%s)', new_qual);
    end if;
    if new_check is not null then
      statement := statement || format(' with check (%s)', new_check);
    end if;
    execute statement;
  end loop;
end
$$;
