# MONK Authentication, Invitation and Release Acceptance Runbook

This runbook separates automated CI coverage from live provider/account acceptance. Do not mark a live test passed until it has been executed with designated test accounts and the recorded result.

## Current integration endpoints

- Supabase project: `yucwackrbekwaxiyuobt`
- Production application origin: `https://monk.monster`
- Invitation Edge Function: `send-education-invitation` (deployed, JWT verification enabled)
- Invitation email secrets read by the function:
  - `RESEND_API_KEY` (required)
  - `MONK_EMAIL_FROM` (required; must be a sender/domain verified by Resend)
  - `MONK_APP_URL` (optional; defaults to `https://monk.monster`)
- Supabase platform-managed function variables also required: `SUPABASE_URL`, `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Never expose the service role key to a browser or commit it to Git.

## 1. Configure Google OAuth

1. Open [Supabase Auth Providers](https://supabase.com/dashboard/project/yucwackrbekwaxiyuobt/auth/providers).
2. Enable Google and add the Google OAuth Web Client ID and Client Secret.
3. In Google Cloud Console, add this exact redirect URI:
   `https://yucwackrbekwaxiyuobt.supabase.co/auth/v1/callback`
4. Open [Supabase Auth URL Configuration](https://supabase.com/dashboard/project/yucwackrbekwaxiyuobt/auth/url-configuration).
5. Set Site URL to `https://monk.monster`; allow only the exact production and local callback/reset URLs documented in `AUTHENTICATION-SETUP.md`.
6. Test a new Google account and an existing Google account. Confirm the app returns to the correct Campus/Business vertical and does not grant a role from user metadata.

## 2. Configure invitation email delivery

1. Verify the sending domain in Resend and create an API key with email-send permission.
2. Open [Supabase Edge Function Secrets](https://supabase.com/dashboard/project/yucwackrbekwaxiyuobt/functions/secrets).
3. Set `RESEND_API_KEY`, `MONK_EMAIL_FROM`, and optionally `MONK_APP_URL=https://monk.monster`.
4. Do not send credentials through chat, source code, GitHub commits, or Vite `VITE_*` variables.
5. Create an invitation for a controlled test mailbox. Confirm provider acceptance and mailbox delivery, then verify the invitation can be accepted only by that confirmed mailbox.

## 3. Supabase Auth hardening

Open [Supabase Auth Security and Rate Limits](https://supabase.com/dashboard/project/yucwackrbekwaxiyuobt/auth/rate-limits) and [Auth Providers / Settings](https://supabase.com/dashboard/project/yucwackrbekwaxiyuobt/auth/providers).

- Keep email confirmation enabled.
- Configure custom SMTP using the verified sender/provider credentials.
- Enable leaked-password protection (HaveIBeenPwned check).
- Review signup, sign-in, OTP/resend and password-recovery rate limits.
- Configure CAPTCHA with a site key and secret for the production origin, then verify both signup and recovery flows.
- Verify the allowed redirect URL list contains no broad wildcards.

The dashboard settings above cannot be changed by the repository CI workflow. Record the final enabled state and a successful test before release.

## 4. Campus invitation live-user acceptance

Use two controlled accounts with confirmed email addresses: one institution owner/admin and one invitee. Use a fresh invitation for each test.

| Case | Action | Expected result |
|---|---|---|
| Valid student | Invite student mailbox; sign in with same verified mailbox; accept | Membership created with student role, active organization switched |
| Valid faculty | Invite faculty mailbox; accept using same verified mailbox | Membership created with teacher role |
| Mismatched email | Open token while signed in to a different verified mailbox | Rejected; no membership created; invitation remains unaccepted |
| Unverified email | Sign in before confirming email, then accept | Rejected until email is confirmed |
| Expired token | Use a token after expiry | Rejected; no membership created |
| Revoked token | Revoke before acceptance, then open token | Rejected; no membership created |
| Reuse token | Accept once, then try the same token again | Rejected as already consumed |
| Unauthorized inviter | Non-member or unauthorized member attempts invitation creation/revocation | Permission denied |
| Cross-tenant isolation | Invitee belongs to another organization; attempt to read or mutate the inviter's workspace | No cross-tenant access |

For each negative case, verify both the visible error and the database invariant (no unauthorized `organization_members` row; invitation timestamps unchanged unless the action was a valid acceptance).

## 5. Business profile acceptance

With a real Business workspace owner and a separate member without `organization.profile.update`:

1. Open the Business workspace and Company Profile.
2. Save a valid name, industry, team-size band, domain, website, address and phone.
3. Refresh and confirm all fields persist.
4. Confirm the marked workspace profile is stored in the existing `companies` model and does not appear as a CRM customer record.
5. Sign in as a member without profile-update permission; verify the save RPC is denied.
6. Switch to a second organization and verify the first organization's profile is not displayed or editable.

## 6. Production deployment verification

The accessible Vercel team currently exposes a project named `monk-frontend-preview` with only its Vercel preview domain; it is not confirmed as the owner of `monk.monster` and no Git repository linkage was returned for the MONK repository. Do not attach the production domain or deploy production until the owner confirms the correct Vercel project/team.

After the correct Vercel project is linked to `mrprashant9339-crypto/MONK-`:
- Confirm framework/build settings use the repository's Vite build.
- Configure only the required public Supabase URL/publishable key as browser variables; no service-role or provider secrets.
- Verify the production branch and preview deployment from the exact approved commit.
- Verify `monk.monster` is attached and domain ownership/DNS is valid.
- Verify Worker routes, login/signup, password reset, Google OAuth, invitation email, and tenant isolation on production.
- Record the deployment URL, deployment ID, commit SHA, and test timestamps.

## 7. Current evidence boundary

- GitHub Actions run #989 on commit `28fa908de24a0e5504de6a3e58b74935920ccc84` passed TypeScript/build, release smoke tests and browser E2E.
- The automated browser suite tests public routes, responsive layout, auth screens, role-choice cards and other public-site flows. It does not create real Supabase users or send provider email.
- The invitation Edge Function is deployed and has JWT verification enabled. Its code validates the authenticated inviter, organization permission, invitation token hash, email, role, expiry and revocation state before sending.
- Live-account acceptance, provider email delivery, Google OAuth credentials, dashboard security settings and production-domain deployment remain unverified until the steps above are completed.
