# MONK Release Status — 25 November 2026

## Integration strategy

The earlier PR #36 was created from an older `main` baseline. The current `main` already contains the Phase 6 Business Operations integration, India directory, guardian scope fix, PWA recovery, invitation CORS hardening and the newer Worker-to-Vercel proxy implementation. Replaying the old PR's `worker.js` would overwrite the newer proxy. The replacement branch `fix/monk-release-integration-v2` is based on the latest `main` and deliberately preserves the current proxy Worker.

## Completed in production Supabase

Project: `yucwackrbekwaxiyuobt`

- Added private `business_documents` metadata table with organization-scoped RLS.
- Added private `business-private` Storage bucket, 25 MB file limit and MIME allowlist.
- Added organization-scoped Storage read/upload/update/delete policies. Uploaders may remove their own failed uploads; document approval permission is required to delete another member's file.
- Applied and recorded migrations:
  - `20261125075129_business_private_document_storage`
  - `20261125075145_security_definer_search_path_hardening`
  - `20261125075816_business_document_uploader_cleanup_policy`
  - `20261125075911_remove_user_metadata_workspace_authorization`
  - `20261125080233_harden_internal_definer_triggers_and_legal_consent`
- SECURITY DEFINER review: 38 public functions total. 37 use `search_path = pg_catalog, public, extensions, pg_temp`; the remaining `rls_auto_enable` function intentionally uses the narrower `pg_catalog` path. No public SECURITY DEFINER function is executable by `anon`. All 31 authenticated-callable SECURITY DEFINER functions have the hardened path.
- Removed the use of user-editable JWT `user_metadata` to authorize Business workspace creation. A verified user with recorded legal consent may create their own Business workspace; Campus workspace creation remains institution-verification-only.
- Changed `handle_new_user` so signup metadata cannot create legal-consent records. Consent is recorded through the authenticated `record_legal_consent` RPC after the user accepts the current Terms and Privacy Policy.
- Production SQL regression checks for private storage passed.

## Included in this branch

- Business Documents panel with private uploads, MIME/size validation, signed 60-second download URLs, tenant-specific listing and permission-gated deletion.
- Business navigation exposes Documents only when the signed-in member has `documents.document.read`.
- Release smoke test for private storage boundaries.
- SQL regression test for private bucket, RLS policies and organization scoping.
- Production migrations mirrored under `supabase/migrations` with the exact versions already recorded by Supabase.

## Build validation performed in isolated Vercel sandbox

At the previous implementation snapshot:
- `npm ci`: passed.
- `npm run build`: passed.
- `npm run test:release`: passed.
- `npm run test:e2e`: passed.

The Business Documents MIME fallback, security regressions and later database hardening are included in the PR head. Exact-head GitHub Actions run #1109 passed on commit `2576c6966ed74c88de087afa505fa5cd4ef487fe`: `npm ci`, type-check/build, release smoke tests, browser E2E and Cloudflare Worker-to-Vercel preview checks all passed. A reproducible `package-lock.json` is now committed. Both GitHub CI and Cloudflare deployment workflows use `npm ci --no-audit --no-fund`. The temporary bootstrap workflow ran successfully on the PR and removed itself.

## Hosting observations

- Cloudflare zone `monk.monster` is active.
- Production Worker script `monk` is deployed and its stored source contains the Vercel proxy and Cloudflare Assets fallback code.
- The apex `monk.monster` is bound through a Cloudflare Worker-origin AAAA record. `www.monk.monster/*` is a Worker route.
- `preview.monk.monster/*` is routed to `monk-vercel-preview`.
- Vercel origin `https://origin.monk.monster/` and `/signup` both returned HTTP 200 through the authenticated Vercel fetch integration.
- The preview deployment lookup returned 404 through the Vercel fetch integration, although Cloudflare's route is provisioned. The GitHub Actions preview Worker-to-Vercel test passed, but a new Vercel deployment for the exact PR head is blocked by the 24-hour quota.
- Vercel still reports a failed PR status check with `build-rate-limit`. Two recent branch preview deployments are `READY` for earlier commits, but no Vercel deployment exists for the exact PR head `2576c6966ed74c88de087afa505fa5cd4ef487fe`. The Cloudflare Worker-to-Vercel preview test passed in GitHub Actions run #1109.
- The Vercel origin homepage and `/signup` returned HTTP 200 through the authenticated Vercel fetch integration. The production Worker source has proxy/fallback code and the isolated preview route passed CI; a separate external request to the production apex could not be independently captured in this run. The origin hostname is directly reachable. Do not add Cloudflare Access or change DNS until a Worker service-token design and rollback test are ready.

## Remaining operator and release gates

1. **Supabase Auth CAPTCHA:** Turnstile widget exists in Cloudflare, but the Supabase Auth CAPTCHA enablement and matching secret cannot be verified through the available project integration. Verify in Supabase Dashboard → Authentication → Bot and Abuse Protection, then test valid and invalid tokens.
2. **Google OAuth:** verify provider enabled, client ID/secret, redirect URI and consent-screen branding in Supabase and Google Cloud Console. Use controlled test accounts.
3. **Leaked-password protection:** still reported disabled. Enable it in Supabase Auth password security settings and test weak/known-compromised passwords.
4. **Resend delivery:** `monk.monster` domain is verified and sending is enabled in Resend. The Resend account currently shows no sent email records. A live send test still needs an explicitly supplied verified sender address and recipient test address. Supabase Edge Function `send-education-invitation` is active, but its `RESEND_API_KEY` and `MONK_EMAIL_FROM` values and real recipient delivery have not been independently verified.
5. **Live role acceptance:** three confirmed Auth users, two Business organizations and two active owner memberships were observed; no Campus organization or non-owner role memberships were present. No full set of isolated Campus/Business role accounts was available. Do not alter real users' roles. Create controlled test accounts in a separate staging project, then test Student, Parent/Guardian, Teacher, HOD, Principal, Business Owner, Admin, Manager, Sales, Contributor and Auditor, including cross-tenant denial.
6. **Staging:** the separate `monk-staging` project was restored from INACTIVE and is currently COMING_UP. Wait for ACTIVE_HEALTHY before migrating and creating explicitly labelled test-only accounts.
7. **Institution directory data:** production directory currently has zero institutions, published records, source records or snapshots. No synthetic records have been inserted.
   - Government Open Data License India allows lawful commercial reuse of datasets that are actually published under that license, with provider/source/license attribution: https://data.gov.in/Godl
   - OGD terms say each dataset's own license metadata governs reuse and third-party copyrighted material may require separate permission: https://www.data.gov.in/terms-of-use
   - AISHE website policy says reproduction requires due permission and proposed use of copyrighted material requires Department of Higher Education approval: https://aishe.gov.in/website-policies/
   - The located OGD educational-institutions dataset is aggregate historical counts, not an institution-level directory: https://www.data.gov.in/resource/all-india-level-number-educational-institutions-and-schools-2000-01-2015-16
   - Do not import AISHE/AICTE/UGC institution-level data until the exact dataset's license or written reuse permission is recorded in the source registry.
8. **Business file live test:** SQL policies are verified. Upload, signed download and deletion must still be exercised with at least two controlled organizations to prove tenant isolation end-to-end.
9. **Exact-head CI and Vercel preview:** run after the lockfile is committed and the new branch's latest changes are in the PR. The Vercel daily quota failure must be resolved or allowed to reset before another Vercel preview deployment.
10. **Production cutover:** do not change `monk.monster` DNS, Worker routes, OAuth credentials or Auth settings without explicit release approval and a successful preview/rollback run.

## Data integrity

No fake users, organizations, institutions, student records, attendance, invoices, payments, inventory, or directory listings were created to make acceptance appear complete.
