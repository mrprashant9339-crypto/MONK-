-- Supabase/PostgREST upsert needs a non-partial unique index target.
drop index if exists public.monk_directory_approvals_source_identity_uidx;
create unique index monk_directory_approvals_source_identity_uidx
  on public.monk_directory_approvals (
    institution_id,
    regulator_source_id,
    approval_type,
    academic_year,
    source_record_id
  );
