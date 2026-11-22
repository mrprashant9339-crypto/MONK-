-- Make regulator approval imports idempotent by source identity.
create unique index if not exists monk_directory_approvals_source_identity_uidx
  on public.monk_directory_approvals (
    institution_id,
    regulator_source_id,
    approval_type,
    academic_year,
    source_record_id
  )
  where source_record_id is not null;
