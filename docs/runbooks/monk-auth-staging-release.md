# MONK Authentication Staging and Production Release Runbook

## Scope and safety boundaries

This runbook covers the authentication fix in PR #40 and its staged acceptance process.

- Staging Supabase project: `monk-staging` (`ysspnuldfiijagagwiqk`, region `ap-south-1`).
- Staging Vercel branch: `fix/auth-captcha-resend-password-policy`.
- Production Supabase and the current production Vercel deployment must remain untouched until staging acceptance is complete.
- Never put SMTP passwords, Resend API keys, Turnstile secret keys, Supabase secret/service-role keys, or user passwords in Git, browser code, issue comments, or chat.
- Browser E2E tests in CI mock Supabase and Turnstile. They are regression tests, not proof of real email delivery or provider-side CAPTCHA validation.

## Verified automated setup

- PR #40 contains the CAPTCHA resend fix, shared password policy, expiry handling, unit/regression tests, and mocked Playwright coverage.
- CI run 46034273600 completed successfully.
- A dedicated Cloudflare Turnstile widget named `MONK Auth Staging - November 2026` was created for the staging preview hostname.
- The staging Turnstile site key is configured only on the Vercel Preview environment for this branch.
- The staging Vercel deployment built successfully from commit `47680dffe6c3fac875c18bceedbcc08a2dd79d1b`.
- Staging migration `20261125143000_welcome_email_delivery` is applied.
- Staging Edge Function `send-welcome-email` is active with JWT verification enabled.
- Staging currently has zero auth users, zero email delivery events, and zero notification outbox rows.
- `email_delivery_events` exists and has RLS enabled with no client policies, keeping it server-only.

## Manual staging prerequisites

Complete these only in the staging Supabase project, never in production during this test phase.

1. **Auth CAPTCHA**
   - Open Supabase Dashboard → Authentication → Bot and Abuse Protection.
   - Enable CAPTCHA protection and select Cloudflare Turnstile.
   - Enter the secret for the dedicated staging widget (not the production widget).
   - Save, then verify the setting is enabled. Do not expose the secret in chat or logs.

2. **Auth URL configuration**
   - Set the staging Site URL to the staging preview origin.
   - Add exact redirect URLs used by the app, including `/auth/callback` and `/reset-password` on the staging preview origin.
   - Keep production URLs and settings separate.

3. **Auth SMTP**
   - Configure staging Auth SMTP with an authorized sender/domain and valid SMTP credentials.
   - Confirm sender address and delivery provider are approved for verification and password recovery messages.
   - Do not use production SMTP credentials unless explicitly intended and approved for staging.

4. **Edge Function secrets**
   - In staging Edge Functions → Secrets, configure `RESEND_API_KEY`, `MONK_EMAIL_FROM`, `MONK_APP_URL`, and `MONK_SUPPORT_EMAIL`.
   - Confirm the function's Supabase server-side API key is available through the platform-provided environment.
   - `MONK_APP_URL` must point to the staging preview origin.
   - The sender must use the verified `monk.monster` domain. Never expose secret values.

## Controlled live acceptance test

Use one mailbox controlled by the project owner/tester. Do not use a customer mailbox or create an account for an unconsenting person. Record only pass/fail, timestamps, and provider message IDs; do not record passwords or tokens.

1. Open the staging preview in a clean browser session and verify the staging Turnstile widget loads without a hostname error.
2. Register a new test account with a valid password meeting all five rules: at least 12 characters, uppercase, lowercase, digit, and special character.
3. Verify that a verification email arrives, its link opens the staging callback, and the account becomes confirmed.
4. Sign in with the new account; verify normalized email handling and successful session creation.
5. On the pending-verification path, request a resend; verify the new CAPTCHA challenge is required and the resend email arrives.
6. Request password recovery; verify the reset email arrives and its link opens the staging reset route.
7. Set a new compliant password and sign in with it. Verify the old password no longer works.
8. Verify the welcome email is sent once for the verified account; inspect the Resend event and the staging `email_delivery_events` row.
9. Verify failed/expired CAPTCHA attempts are rejected and do not send email.
10. Remove the test account and any test-only records after preserving non-sensitive test evidence, if cleanup is appropriate.

## Release gates

Do not merge or deploy production until all of these are true:

- CI is green for the exact PR head commit.
- Staging CAPTCHA, redirect URLs, SMTP, and Edge Function secrets are configured.
- Signup, email verification, resend, login, forgot-password, reset-password, and welcome-email delivery all pass live tests.
- Supabase Auth logs contain no relevant CAPTCHA/SMTP errors.
- Resend reports the expected messages as delivered (not merely accepted/queued).
- No duplicate welcome email is produced by retries or repeated verification callbacks.
- The final PR diff and deployment environment variables are reviewed.
- Production migration/function/env changes, if any, have a separate explicit rollout and rollback plan.

## Production rollout after acceptance

1. Mark PR #40 ready for review and merge only after release gates pass.
2. Confirm the resulting main commit and CI checks.
3. Deploy the exact merged commit to the existing `monk-platform` production project; do not create a replacement project.
4. Confirm the deployment is READY and aliases include `monk.monster` and `www.monk.monster`.
5. Verify production environment variables still reference the production Supabase project and production CAPTCHA site key.
6. Run non-destructive production smoke tests only; do not create an unsolicited real customer account or send test email to a customer.
7. Monitor Auth, Edge Function, Resend, and Vercel errors. Roll back to the previous production deployment if authentication or email delivery regresses.

## Rollback

- Vercel: promote the last known-good production deployment through the existing project rollback workflow.
- Git: revert the merge commit; do not force-push main.
- Supabase: do not blindly reverse the welcome-email migration or delete delivery records. Roll back only a reviewed, additive schema/function change using a tested forward-fix or migration.
- Cloudflare: leave the dedicated staging widget isolated; do not modify the production widget while rolling back staging.
