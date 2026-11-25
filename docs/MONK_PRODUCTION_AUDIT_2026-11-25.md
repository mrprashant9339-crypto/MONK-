# MONK Production Audit and Remediation Plan
**Audit date:** 25 November 2026  
**Repository:** `mrprashant9339-crypto/MONK-`  
**Production baseline:** `75fe54d733ab782cea9ae2bf3af8f2053144d57e`  
**Product baseline:** India-first multi-tenant platform with separate Campus and Business journeys.

## Executive summary
The production `main` commit passes GitHub Actions run #1058. That proves the configured build and browser suite pass; it does not prove that every product workflow is complete or that external providers are configured. This audit separates source-code defects, unmerged implementation, live configuration and acceptance evidence.

## Findings

| ID | Priority | Area | Finding | Required remediation |
|---|---|---|---|---|
| MONK-001 | P0 | Business | Phase 6 UI was not integrated into production `main`; PR #22 remains open/unmerged. Its production database migrations are already applied. | Integrate the existing Sales and Business Operations UI; run role and tenant-isolation tests. |
| MONK-002 | P0 | Campus | Phase 7 is not fully accepted. PR #23 is a draft based on `frontend-first-complete`; PR #27 ports the source-aware India directory and guardian-scope regression work onto the current production baseline, but the full role workflows remain untested. | Directory UI and guardian scope are integrated in PR #27; complete Principal/HOD/Faculty/Student/Parent live acceptance. |
| MONK-003 | P0 | Auth E2E | Three existing Auth users are confirmed, but their role metadata is unset. One linked Google identity does not prove fresh-account OAuth. | Test signup, verification, login, Google OAuth, reset, invitation acceptance/revocation with isolated test identities. |
| MONK-004 | P0 | CAPTCHA | Cloudflare Turnstile widget and secret presence are verified; Supabase Auth CAPTCHA dashboard enablement/secret configuration is not readable from the connected integration. | Operator verifies Supabase Auth → Bot and Abuse Protection and tests valid/missing/invalid tokens. |
| MONK-005 | P0 | Staging | Staging Supabase project `monk-staging` is inactive. | Activate isolated staging, apply migrations, and run all live-account tests there. |
| MONK-006 | P1 | Google OAuth | Google Cloud consent branding and provider credentials are not independently verified. | Verify MONK name/logo, support email, authorized domain, publishing status, test users, OAuth client and exact Supabase callback. |
| MONK-007 | P1 | Directory | Production directory has 0 institutions, 0 published rows, 0 source records and 0 snapshots. | Import only files with documented reuse rights; historical OGD rows remain stale/unpublished. |
| MONK-008 | P1 | Data rights | AISHE/UGC/AICTE and several regulators do not have confirmed bulk-reuse authorization. AIKosh landing page has no downloadable file. | Obtain explicit permission or an independently licensed official file; record attribution and source version before enabling import. |
| MONK-009 | P1 | Hosting | Worker currently serves its own Vite `dist/` assets; it is not a Vercel reverse proxy. Vercel deployment is READY, but project metadata reports `live=false`; non-custom Vercel deployment domains are SSO-protected. | Establish a public Vercel origin/protection strategy, test on a separate hostname, then perform a reversible cutover. |
| MONK-010 | P1 | DB security | Supabase Advisor reports 31 authenticated-callable SECURITY DEFINER functions and 2 RLS-enabled/no-policy informational findings. All inspected functions have an explicit search_path and none is executable by anon; the support tables are intentionally server-only (no anon/authenticated table grants). Guardian-scope and support-intake SQL regression scripts both passed against production. | Review each function's authorization checks, search_path and EXECUTE grants; do not blanket-revoke application RPCs. |
| MONK-011 | P1 | Password security | Leaked-password protection is disabled. | Enable compromised-password protection and test signup/password updates. |
| MONK-012 | P1 | Email | SMTP/Resend delivery is not proven end-to-end. | Configure verified sender and secrets; test verification, reset and invitation delivery. |
| MONK-013 | P1 | Business files | Phase 6 describes Documents as a local browser preview, not secure persistent storage. | Implement private Storage, tenant-scoped policies, signed URL lifecycle, metadata, retention and file validation. |
| MONK-014 | P2 | PWA | Production `main` did not register a service worker or verified offline fallback. | Implemented in PR #27 with GET-only same-origin caching, offline page, network notice and error boundary; merge only after exact-head CI. |
| MONK-015 | P2 | Guardian portal | Client relationship lookup was broader than the signed-in guardian, although database RLS already scopes rows. | Implemented in PR #27; guardian-scope SQL regression passed against production. |
| MONK-016 | P2 | Dependency reproducibility | The repository has no committed package-lock.json, so `npm ci` cannot run and CI currently relies on `npm install`. | Generate and commit a reviewed lockfile, then switch CI to `npm ci`. |
| MONK-017 | P2 | Design | PR #24 is a separate preview-only draft and is unmergeable/dirty. | Review against approved brand assets; integrate only approved, functional screens. |
| MONK-018 | P2 | Docs | Some README/release-runbook statements were historical or contradictory. | Refresh documentation to the verified production baseline and keep evidence current. |
| MONK-019 | P2 | Invitation API | The deployed invitation Edge Function used wildcard CORS and did not bound the request body, although JWT and organization permission checks were present. | PR #27 restricts CORS to approved origins and caps request bodies; deployment and live invitation test remain pending. |

## Verified infrastructure snapshot
- GitHub `main`: `75fe54d733ab782cea9ae2bf3af8f2053144d57e`.
- GitHub Actions run #1058: success.
- Vercel `monk-platform`: latest production deployment READY on that commit; project metadata reports `live=false`.
- Vercel `monk.monster` domain: verified; Cloudflare nameservers are active.
- Cloudflare Worker `monk`: custom domain `monk.monster` enabled; ASSETS binding serves static Vite output.
- Supabase production: active; 3 confirmed Auth users; 1 Google identity; institution directory empty.
- Turnstile: managed widget exists, site key matches frontend, secret presence verified without exposing its value.

## Remediation branch work
- Phase 6 Sales and Business Operations components are being integrated without replacing the newer production AuthExperience or directory code.
- Matching Phase 6 migrations are added to source control; they are already applied in production and must not be re-applied blindly.
- Parent portal relationship lookup is being narrowed to the authenticated guardian.
- Offline recovery, GET-only same-origin service-worker caching, network status notice and React error boundary are being added.
- CI remains on `npm install` because the repository has no lockfile; the failed `npm ci` experiment is recorded as MONK-016.
- Update the README and release runbook to remove stale deployment, CI and Auth claims.
- Release smoke tests cover these changes.

## External/operator blockers (not safe to fake)
1. Supabase Auth CAPTCHA dashboard toggle and secret configuration.
2. Google Cloud OAuth consent screen and provider credentials.
3. Fresh verified test mailboxes / Google account and isolated student, faculty and institution-admin identities.
4. Staging Supabase activation and isolated configuration.
5. SMTP/Resend sender credentials and verified delivery.
6. Official data reuse permission or downloadable OGL source file.
7. Vercel origin hostname/protection decision before Worker reverse-proxy cutover.

## Release acceptance gates
- [ ] Exact-head GitHub CI passes on the remediation branch.
- [ ] Phase 6 tested with owner/admin/manager/sales/auditor roles and cross-tenant denial.
- [ ] Campus Principal/HOD/Faculty/Student/Parent workflows pass with two isolated institutions.
- [ ] CAPTCHA, Google OAuth, email verification and password reset pass with fresh controlled accounts.
- [ ] Private file isolation and signed URL expiry are tested.
- [ ] SECURITY DEFINER findings are individually reviewed.
- [ ] Directory import has source file, licence/terms evidence, dry-run report and unpublished verification defaults.
- [ ] Worker/Vercel origin is tested on a separate hostname, including redirects, cookies, assets, auth callbacks, 404s and rollback.
- [ ] Production smoke tests pass after an explicitly approved release.

## Scope boundary
Do not merge this branch or perform a production DNS/Worker/Vercel cutover until CI and external release gates are reviewed. Do not create fake student, faculty, institution, sales, inventory or finance records to make tests appear successful.
