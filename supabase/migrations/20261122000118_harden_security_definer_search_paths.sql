-- Prevent temporary-schema object shadowing in SECURITY DEFINER RPCs.
-- All affected application functions schema-qualify auth/extension calls and use public objects.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname = any(array[
        'accept_organization_invitation',
        'archive_project',
        'archive_task',
        'can_read_file',
        'can_read_project',
        'can_read_task',
        'create_contact',
        'create_lead',
        'create_organization',
        'create_organization_invitation',
        'create_project',
        'create_task',
        'current_member_id',
        'current_organization_id',
        'has_org_permission',
        'has_org_role',
        'is_org_member',
        'list_organization_invitations',
        'list_organization_members',
        'remove_organization_member',
        'review_document',
        'revoke_organization_invitation',
        'set_organization_classification',
        'switch_organization',
        'update_organization_member_role',
        'update_project_details',
        'update_task',
        'update_task_details'
      ])
  loop
    execute format(
      'alter function %s set search_path = public, extensions, pg_temp',
      r.signature
    );
  end loop;
end;
$$;
