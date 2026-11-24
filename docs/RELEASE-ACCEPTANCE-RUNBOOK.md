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
The accessible Vercel team currently exposes `monk-frontend-preview` with only its Vercel domain. It is not confirmed as the owner of `monk.monster`, and no Git repository linkage for MONK was returned. Do not attach the production domain or deploy production until the correct Vercel project/team is confirmed.

After the correct project is linked to `mrprashant9339-crypto/MONK-`:
- Confirm Vite framework/build settings and production branch.
- Configure only the public Supabase URL/publishable key as browser variables; never service-role or provider secrets.
- Verify preview deployment from the exact approved commit.
- Verify `monk.monster` ownership, project attachment and DNS.
- Test login/signup, reset, Google OAuth, invitation email and tenant isolation on production.
- Record deployment URL, ID, commit SHA and test timestamps.

## 7. Current evidence boundary
- GitHub Actions run #989 on commit `28fa908de24a0e5504de6a3e58b74935920ccc84` passed TypeScript/build, release smoke tests and browser E2E.
- Automated browser tests cover public routes, responsive layout, auth screens and role-choice cards; they do not create real Supabase users or send provider email.
- Invitation Edge Function is deployed with JWT verification. It validates authenticated inviter, organization permission, token hash, email, role, expiry and revocation before sending.
- Live-account acceptance, provider email delivery, Google OAuth credentials, dashboard security settings and production-domain deployment remain unverified until completed above.
