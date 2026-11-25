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
Open [Supabase Auth Rate Limits](https://supabase.com/dashboard/project/yucwackrbekwaxiyuobt/auth/rate-limits) and [Auth Providers](https://supabase.com/dashboard/project/yucwackrbekwaxiyuobt/auth/providers).
- Keep email confirmation enabled.
- Configure custom SMTP using the verified sender/provider credentials.
- Enable leaked-password protection (HaveIBeenPwned check).
- Review signup, sign-in, OTP/resend and password-recovery rate limits.
- Configure CAPTCHA with a site key and secret for the production origin, then verify signup and recovery.
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
The connected Vercel project is `monk-platform` (Vite), linked to `mrprashant9339-crypto/MONK-`. Its current production deployment is on `main` at commit `7f743cecf16ea80ff57672fc7cd2831fa8024f3f`. The feature branch has a separate preview deployment. The custom domain `monk.monster` is still served through the existing Cloudflare Worker route/binding; do not detach or re-route it until the approved Vercel production deployment and authentication are fully accepted.

After the correct project is linked to `mrprashant9339-crypto/MONK-`:
- Confirm Vite framework/build settings and production branch.
- Configure only the public Supabase URL/publishable key as browser variables; never service-role or provider secrets.
- Verify preview deployment from the exact approved commit.
- Verify `monk.monster` ownership, project attachment and DNS.
- Test login/signup, reset, Google OAuth, invitation email and tenant isolation on production.
- Record deployment URL, ID, commit SHA and test timestamps.

## 7. Current evidence boundary
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
