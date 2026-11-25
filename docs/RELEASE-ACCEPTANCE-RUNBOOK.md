# MONK Authentication, Invitation and Release Acceptance Runbook

This runbook separates automated CI coverage from live provider/account acceptance. Do not mark a live test passed until it has been executed with designated test accounts and the recorded result.

## Current integration endpoints
- Supabase project: `yucwackrbekwaxiyuobt`
- Production application origin: `https://monk.monster`
- Invitation Edge Function: `send-education-invitation` (deployed, JWT verification enabled)
- Email secrets read by the function: `RESEND_API_KEY` and `MONK_EMAIL_FROM` (required); `MONK_APP_URL` (optional, defaults to `https://monk.monster`).
- Platform-managed function variables also required: `SUPABASE_URL`, `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Never expose the service-role key to a browser or commit it to Git.

## 1. Configure Google OAuth
1. Open [Supabase Auth Providers](https://supabase.com/dashboard/project/yucwackrbekwaxiyuobt/auth/providers), enable Google, and enter the Google OAuth Web Client ID and Client Secret.
2. In Google Cloud Console, add this exact redirect URI: `https://yucwackrbekwaxiyuobt.supabase.co/auth/v1/callback`.
3. Open [Supabase Auth URL Configuration](https://supabase.com/dashboard/project/yucwackrbekwaxiyuobt/auth/url-configuration). Set Site URL to `https://monk.monster`; allow only the exact production and local callback/reset URLs documented in `AUTHENTICATION-SETUP.md`.
4. Test a new and an existing Google account. Confirm the app returns to the selected Campus/Business vertical and does not grant a role from user metadata.

## 2. Configure invitation email delivery
1. Verify the sending domain in Resend and create an API key with email-send permission.
2. Open [Supabase Edge Function Secrets](https://supabase.com/dashboard/project/yucwackrbekwaxiyuobt/functions/secrets).
3. Set `RESEND_API_KEY`, `MONK_EMAIL_FROM`, and optionally `MONK_APP_URL=https://monk.monster`.
4. Do not send credentials through chat, source code, GitHub commits, or Vite `VITE_*` variables.
5. Create an invitation for a controlled test mailbox; verify provider acceptance, mailbox delivery, and acceptance by only that confirmed mailbox.

## 3. Supabase Auth hardening
Open [Supabase Auth Rate Limits](https://supabase.com/dashboard/project/yucwackrbekwaxiyuobt/auth/rate-limits), [Auth Providers](https://supabase.com/dashboard/project/yucwackrbekwaxiyuobt/auth/providers), and the Auth Bot and Abuse Protection settings.
- Keep email confirmation enabled.
- Configure custom SMTP using the verified sender/provider credentials.
- Enable leaked-password protection (HaveIBeenPwned check).
- Review signup, sign-in, OTP/resend and password-recovery rate limits.
- Configure CAPTCHA with the existing Cloudflare Turnstile site key and matching server-side secret; confirm the Auth dashboard toggle is enabled (it has not yet been independently verified).
- Test signup, password login and password recovery with missing, expired, invalid and valid CAPTCHA tokens.
- Verify the redirect allowlist contains no broad wildcards.

These dashboard settings cannot be changed by repository CI. Record the enabled state and a successful test before release.

## 4. Campus invitation live-user acceptance
Use two controlled accounts with confirmed email addresses: one institution owner/admin and one invitee. Use a fresh invitation for each test.

| Case | Action | Expected result |
|---|---|---|
| Valid student | Invite student mailbox; sign in with same verified mailbox; accept | Student membership created; active organization switched |
| Valid faculty | Invite faculty mailbox; accept with same verified mailbox | Teacher membership created |
| Mismatched email | Open token while signed in to a different verified mailbox | Rejected; no membership; invitation remains unaccepted |
| Unverified email | Accept before confirming email | Rejected until email is confirmed |
| Expired token | Use token after expiry | Rejected; no membership |
| Revoked token | Revoke before acceptance, then open token | Rejected; no membership |
| Reuse token | Accept once, then retry same token | Rejected as consumed |
| Unauthorized inviter | Non-member/unauthorized member attempts invite or revoke | Permission denied |
| Cross-tenant isolation | Member of another organization attempts to read or mutate this workspace | No cross-tenant access |

For negative cases verify both the UI error and database invariant: no unauthorized `organization_members` row; invitation timestamps unchanged unless acceptance succeeded.

## 5. Business profile acceptance
Use a real Business workspace owner and a member without `organization.profile.update`.
1. Open Company Profile; save a valid name, industry, team-size band, domain, website, address and phone.
2. Refresh and verify all fields persist.
3. Confirm the marked workspace profile reuses `companies` and does not appear as a CRM customer.
4. Sign in as a member without update permission; verify save RPC is denied.
5. Switch organizations; verify the first organization's profile is not displayed or editable.

## 6. Production deployment verification
The Vercel project is `monk-platform` (Vite), linked to `mrprashant9339-crypto/MONK-`. The latest inspected production deployment is READY on `main` at commit `75fe54d733ab782cea9ae2bf3af8f2053144d57e` (deployment `dpl_Ga9auMSEbgytJ1DhsCGsA8zub7CT`). GitHub `main` now also has an audit-document-only commit `bfabf4777a59817e7e8304c1ec0f48dbcaba05e`. Project metadata reports `live=false`; Vercel SSO protection is enabled for non-custom deployment domains. The `monk.monster` custom domain is currently attached to Cloudflare Worker `monk`, which serves its own static assets. There is no Worker-to-Vercel reverse proxy today. Do not detach or re-route the custom domain until a separate public Vercel origin hostname, protection strategy, preview test and rollback have been accepted.

After the correct project is linked to `mrprashant9339-crypto/MONK-`:
- Confirm Vite framework/build settings and production branch.
- Configure only the public Supabase URL/publishable key as browser variables; never service-role or provider secrets.
- Verify preview deployment from the exact approved commit.
- Verify `monk.monster` ownership, project attachment and DNS.
- Test login/signup, reset, Google OAuth, invitation email and tenant isolation on production.
- Record deployment URL, ID, commit SHA and test timestamps.

## 7. Directory import and source controls
- The public directory route is `/directory` and reads only published institution rows. The previous static/demo college list has been removed; an empty database produces an honest "records are being prepared" state rather than fabricated colleges.
- `directory-import` is ACTIVE at version 9 with JWT verification. It requires server-managed `app_metadata.platform_role` of `platform_admin` or `directory_admin`; user-editable metadata cannot grant import privileges.
- `ingest_monk_directory_batch` is service-role-only, limited to 250 records and 1 MB per batch, stores compact normalized snapshots, and retains only the latest two snapshots per source record. Cross-source matching is exact and conservative.
- Current database counts: 0 institution rows, 0 published rows, 0 fully verified rows. No college records have been fabricated or imported from third-party scraped lists.
- AIKosh AISHE university dataset has OGL metadata but its public landing page currently has no downloadable data file; import is disabled until the file exists.
- OGD AISHE 2011-12 and 2012-13 college resources are OGL historical datasets. They may be imported only as stale, unpublished discovery candidates, never as current approval.
- AICTE public API and the NMC 10-Mar-2026 notice were identified. AICTE bulk reuse terms are pending; NMC notice reuse is pending. Neither source is enabled for bulk import until its reuse/attribution review is completed.
- AICTE state-wise sync code is prepared but checks source authorization before contacting the upstream API. It will not run while the source is disabled.

## 8. Database acceptance tests
- `supabase/tests/tenant-isolation.sql` was executed against Supabase in a transaction and rolled back. It passed two synthetic tenants' project/task read isolation, active-organization resolution, cross-tenant update denial and cross-tenant insert denial.
- `supabase/tests/invitation-acceptance.sql` was executed against Supabase in a transaction and rolled back. It passed authorized teacher invitation acceptance, one-time token use, mismatched-email rejection, unverified-email rejection and prevention of Campus student roles in a Business workspace.
- `supabase/tests/workspace-provisioning.sql` was executed against Supabase in a transaction and rolled back. It passed the Business-owner self-provisioning path and blocked Campus institution self-provisioning and student self-provisioning.
- These are database regression tests with synthetic users; they do not replace live signup/login or production-user acceptance.

## 9. Current evidence boundary
- GitHub Actions run #1023 completed successfully on commit `42dd85c70515dcee9d9f485238482e0b4b14d945`: TypeScript/production build, release smoke tests and Playwright browser E2E all passed. The E2E suite includes Campus institution-selector visibility and the guard that prevents an incomplete Google signup profile from leaving MONK.
- Latest Vercel feature-branch preview is READY at `https://monk-platform-4usumqgoj-makto-community.vercel.app`; stable branch alias: `https://monk-platform-git-feature-auth-registrat-3476eb-makto-community.vercel.app`. This is a preview, not a production release.
- Cloudflare Turnstile widget `0x4AAAAAAGRN064WbzkNKlkA` is in `managed` mode. Its allowlist now includes `monk.monster`, `www.monk.monster`, localhost addresses, the stable feature-branch Vercel alias and several exact preview hosts. The stable branch alias is the intended preview test origin; ephemeral preview hosts are not permanent.
- Supabase `support-ticket-intake` Edge Function is ACTIVE at version 5. Its deployed code fails closed if `TURNSTILE_SECRET` is missing and validates the Turnstile token and hostname before accepting support submissions.
- No recent Edge Function invocation logs were returned for the queried window, so no successful live support-ticket CAPTCHA verification is evidenced.
- The Supabase project tools available to this workflow do not expose Auth CAPTCHA dashboard configuration or Edge Function secret management. Therefore the presence of `TURNSTILE_SECRET` in Supabase and the enabled state of Auth CAPTCHA could not be independently verified here. Do not mark live CAPTCHA as passed until verified in the dashboard.
- The PKCE callback now performs a single explicit code exchange (including React StrictMode replay protection), validates the saved MONK onboarding context, records legal consent, and writes the completed full name to the existing `profiles` row through `update_my_profile`. Google signup requires a name before redirecting to Google.
- The database `create_organization` RPC now requires a verified email and legal-consent record, permits only Business-owner self-service creation, rejects public Campus workspace creation pending independent institution verification, and uses NULL-safe role checks. The UI mirrors this rule; team members and Campus accounts must join an approved organization.
- The client-executable grant on `public.rls_auto_enable()` has been revoked. The remaining Supabase Security Advisor warnings for authenticated SECURITY DEFINER RPCs require function-by-function review; do not bulk-revoke them because many are application RPCs with internal permission checks. Leaked-password protection remains disabled and must be enabled in Auth settings.
- Google OAuth provider credentials, custom SMTP delivery, actual email signup/confirmation/password-reset, fresh-account Google callback, invitation acceptance, tenant-isolation negative cases and production-domain routing remain unverified. These require provider credentials and controlled test accounts.
- PR #25 remains open and draft; no merge or production promotion has been performed.


## 8. Phase 6 Business and Phase 7 Campus acceptance
- Phase 6 Sales and Business Operations UI integration is proposed in PR #29. Its production database migrations are already applied; do not re-run them without checking migration history.
- Exercise Business owner/admin/manager/sales/auditor roles and prove cross-tenant reads and writes are denied.
- The India-wide directory UI is being integrated in PR #27. The current production directory has zero published records. Test filters and honest empty state; do not insert synthetic institutions.
- Guardian relationship RLS and support-intake server-only table SQL regression tests passed against the current production database. The client guardian-id filter is included in PR #27.
- Complete fresh Student, Faculty/Teacher, Parent, HOD, Principal/Institution Admin onboarding with separate controlled accounts before declaring Phase 7 accepted.


## Production Vercel origin cutover
- The Worker uses `MONK_VERCEL_ORIGIN=https://origin.monk.monster`; change this variable if the origin hostname changes.
- Known application routes are fetched from the Vercel root document, then route metadata is applied at the Worker edge. Static assets are fetched by their original path.
- The existing Cloudflare Assets binding remains the failover. Check `x-monk-origin: vercel` for normal origin traffic and `x-monk-origin-fallback: assets` for failover.
- Rollback: redeploy the previous Worker version or clear `MONK_VERCEL_ORIGIN` and redeploy so all requests use the Assets fallback.
- Keep the origin hostname DNS-only and do not point it back to the public apex; that would create a proxy loop. Restrict direct origin access with Cloudflare Access/service tokens in a separate hardening change.


## Preview Worker route management
- `preview.monk.monster/*` is a separately provisioned Cloudflare route to `monk-vercel-preview`.
- The GitHub Wrangler token has Workers Script upload permission but not zone Worker Routes write permission. Keep `routes` out of `wrangler.preview.jsonc`; deploy with `workers_dev: true` so Wrangler can update the script without touching zone routes. The separately provisioned `preview.monk.monster/*` route remains attached.


## Vercel Verified Proxy and checkpoint handling
- Forward the incoming Cloudflare `CF-Connecting-IP` header to the Vercel origin. Vercel documents Cloudflare as a Verified Proxy Lite provider.
- Verify the response marker `x-monk-cf-ip-forwarded: yes`.
- If Vercel returns a Security Checkpoint page (for example, Code 21), the Worker must not expose it; it falls back to the Cloudflare Assets bundle and marks `x-monk-origin-fallback: assets`.
- Production acceptance requires `/` and `/signup` to return the MONK app shell, never a Vercel checkpoint. Either Vercel origin or the safe Assets fallback is acceptable until Verified Proxy is consistently recognized.
