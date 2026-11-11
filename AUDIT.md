# MONK engineering audit — 2026-11-11

## Scope inspected
- GitHub `main` source tree, Vite/TypeScript configuration, application bootstrap, Supabase client, app component and CI workflow.
- Connected Supabase project schema, migration history, RLS policies, SECURITY DEFINER functions, function grants, storage policies and Supabase security/performance/health advisors.

## Findings and fixes

### Fixed
1. CI workflow failed before dependency installation because setup-node npm caching requires a lockfile, and this repository has no lockfile. Removed the npm cache option; the workflow now installs with `npm install --no-audit --no-fund` and runs `npm run build`.
2. The auth user trigger function `public.handle_new_user()` was executable by authenticated users through PostgREST despite being trigger-only. Revoked EXECUTE from PUBLIC, anon and authenticated. The auth.users trigger continues to invoke the function as its owner. This was applied to the connected database and recorded as a migration.

### Verified database controls
- RLS is enabled on `projects` and `tasks`.
- Anonymous execution of inspected public SECURITY DEFINER functions is denied.
- Direct authenticated INSERT/UPDATE/DELETE on projects/tasks is denied; authenticated SELECT is allowed and filtered by RLS.
- Application writes use checked RPCs such as `create_task` and `update_task`.
- The schema includes organization/project composite foreign keys for task and project membership relationships.
- No Storage schema policies were returned by the audit query; storage access must be designed before enabling uploads.

## Open findings / not production-cleared
1. Supabase Security Advisor still reports 15 authenticated-callable SECURITY DEFINER functions. Some are intentionally used by RLS or application RPCs, but each requires an explicit function-level review and authenticated test matrix. Do not blanket-revoke them.
2. Supabase Security Advisor reports `citext` installed in `public`; moving it requires dependency and migration planning.
3. The CI run that exposed the missing lockfile failed. The corrected workflow was pushed and a new run was started; its final build result must be checked before declaring CI green.
4. No reproducible lockfile currently exists. Generate and commit one after confirming npm dependency resolution, then switch CI to `npm ci`.
5. The current UI implements basic authentication, first workspace/project creation, task listing, creation and completion. Task editing/deletion, member invitations, robust project management, notifications and realtime are not complete.
6. Auth error handling, loading race behavior, sign-up confirmation, password reset, OAuth, role-based UI, and tenant-boundary integration tests require additional validation.
7. Cloudflare deployment and custom-domain/DNS verification have not been performed.

## Test evidence
- GitHub Actions run before CI fix: failed at setup-node due to missing package lock file; dependency install/build steps were skipped.
- CI fix commit: removes setup-node npm caching while no lockfile is present.
- Supabase post-fix privilege query: `handle_new_user()` returns false for both anon and authenticated EXECUTE privileges.
- Existing project/task table grants and RLS behavior verified through database catalog/privilege queries.

## Production gate
Do not mark MONK production-ready until CI succeeds, lockfile is committed, cross-tenant and role tests pass, remaining SECURITY DEFINER functions are reviewed, auth flows are tested, and Cloudflare deployment/domain/HTTPS are verified.
