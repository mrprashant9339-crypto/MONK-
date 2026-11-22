-- Trigger-only SECURITY DEFINER functions must not be exposed as PostgREST RPCs.
revoke all on function public.monk_seed_tenant_flags_for_organization() from public, anon, authenticated;
revoke all on function public.monk_sync_org_enabled_modules_from_flags() from public, anon, authenticated;
