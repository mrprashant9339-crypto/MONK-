# MONK Authentication Staging and Production Release Runbook

## Scope and safety boundaries

This runbook covers the authentication fix in PR #40 and its staged acceptance process.

- Staging Supabase project: `monk-staging` (`ysspnuldfiijagagwiqk`, region `ap-south-1`).
- Staging Vercel branch: `fix/auth-captcha-resend-password-policy`.
- Production Supabase and the current production Vercel deployment must remain untouched until staging acceptance is complete.
- Never put SMTP passwords, Resend API keys, Turnstile secret keys, Supabase secret/service-role keys, or user passwords in Git, browser code, issue comments, or chat.
- Browser E2E tests in CI mock Supabase and Turnstile. They are regression tests, not proof of real email delivery or provider-side CAPTCHA validation.

## Local development isolation

- Running `npm run dev` forces the browser client to the staging Supabase project `ysspnuldfiijagagwiqk` and the dedicated staging Turnstile widget. It does not read a production Supabase URL or production Turnstile key from `.env.local`.
- The staging Turnstile widget allowlist includes only its staging Vercel Preview hostname, `localhost`, and `127.0.0.1`. The production Turnstile widget is not changed.
- Keep all local account creation and CAPTCHA testing on staging. Do not run signup tests against `monk.monster`.

## Verified automated setup

- PR #40 contains the CAPTCHA resend fix, shared password policy, expiry handling, unit/regression tests, and mocked Playwright coverage.
- Auth-code CI run `46150026651` for commit `9cfa26bbcb313b14fd85432ccd91982861e94a97` passed. The latest CI run `46154694694` for current PR head `c2e2932b92dbfdcee0d2304dddfcc35d1aa2e789` also passed (TypeScript production build, release/security smoke tests, Playwright E2E, Cloudflare Worker → Vercel Preview, and artifact upload). The browser tests mock Supabase and Turnstile and are not live-provider acceptance.
- A dedicated Cloudflare Turnstile widget named `MONK Auth Staging - November 2026` is restricted to the staging Preview hostname plus `localhost` and `127.0.0.1` for local testing.
- The staging Turnstile site key is configured only on the Vercel Preview environment for this branch.
- Current staging Vercel Preview deployment `dpl_4QmgtNHfQV3iAJF7Bd8UT2h6tnX5` is READY for current PR head `c2e2932b92dbfdcee0d2304dddfcc35d1aa2e789`. Its deployment URL is `https://monk-platform-41ky1byks-makto-community.vercel.app`; its stable branch alias is `https://monk-platform-git-fix-auth-captcha-resen-873234-makto-community.vercel.app`. The deployment reports `aliasError=null`. The branch-specific Preview environment contains the staging Supabase URL, staging publishable key and dedicated staging Turnstile site key.
- Staging migration `20261125143000_welcome_email_delivery` is applied.
- Staging Edge Function `send-welcome-email` is ACTIVE at version 4 with `verify_jwt=true`.
- Staging currently has zero auth users, zero email delivery events, and zero notification outbox rows.
- `email_delivery_events` exists and has RLS enabled; `anon` and `authenticated` have no table privileges and no client policies exist. Staging catalog checks confirmed only `service_role` can read/write the ledger.
- `claim_welcome_email(uuid)` is `SECURITY INVOKER`, with EXECUTE granted only to `service_role`.
- Separate follow-up issue [#41](https://github.com/mrprashant9339-crypto/MONK-/issues/41) tracks the pre-existing authenticated-executable `SECURITY DEFINER` RPC warnings. The latest staging Security Advisor snapshot on 2026-11-28 reports 36 such findings across organization, project, team and business workflows (the issue was originally opened when 37 were reported). These are outside this auth/email change; do not blanket-revoke them. Each RPC requires a separate function-by-function review of authorization checks and grants before claiming platform-wide security sign-off.
- A staging SQL assertion script is committed at `supabase/tests/auth_email_delivery_security.sql`.
- Welcome email delivery sends a stable per-user Resend idempotency key. If provider delivery is uncertain, the event moves to `manual_review`; stale sends older than the 24-hour provider idempotency window are not retried automatically.
- The retry guard migration `welcome_email_retry_guard` is applied in staging (migration ledger version `20261127173753`); the updated `supabase/tests/auth_email_delivery_security.sql` assertion passes after the migration.

## Manual staging prerequisites

Complete these only in the staging Supabase project, never in production during this test phase.

1. **Auth CAPTCHA**
   - Open Supabase Dashboard → Authentication → Bot and Abuse Protection.
   - Enable CAPTCHA protection and select Cloudflare Turnstile.
   - Enter the secret for the dedicated staging widget (not the production widget).
   - Save, then verify the setting is enabled. Do not expose the secret in chat or logs.

2. **Auth URL configuration**
   - Set the staging Site URL to the stable branch Preview alias: `https://monk-platform-git-fix-auth-captcha-resen-873234-makto-community.vercel.app`. Prefer this over a per-deployment URL so the default redirect does not become stale on the next Preview deployment.
   - Add exact redirect URLs for both `/auth/callback` and `/reset-password` on the stable branch Preview alias above.
   - Use the stable branch alias to open the staging Preview; do not depend on a per-deployment hostname for redirect configuration.
   - For local development, also allow exactly `http://localhost:5173/auth/callback`, `http://localhost:5173/reset-password`, `http://127.0.0.1:5173/auth/callback`, and `http://127.0.0.1:5173/reset-password`. Keep all Preview and localhost URLs in staging only.
   - Keep production URLs and settings separate.

3. **Auth SMTP**
   - Enable Custom SMTP and configure Resend using host `smtp.resend.com`, port `465`, username `resend`, and a dedicated Resend API key as the password.
   - Use sender address `support@monk.monster` and sender name `MONK Support`; the `monk.monster` sending domain is verified and sending-enabled in Resend.
   - Confirm sender address and delivery provider are approved for verification and password recovery messages. See [Resend SMTP credentials](https://resend.com/changelog/smtp-service).
   - Do not use production SMTP credentials unless explicitly intended and approved for staging.

4. **Edge Function secrets**
   - In staging Edge Functions → Secrets, configure `RESEND_API_KEY`, `MONK_EMAIL_FROM`, `MONK_APP_URL`, and `MONK_SUPPORT_EMAIL`.
   - Confirm the function's Supabase server-side API key is available through the platform-provided environment.
   - `MONK_APP_URL` must be the exact staging Preview origin (for example, `https://monk-platform-git-fix-auth-captcha-resen-873234-makto-community.vercel.app`), with no path, query, or fragment. The function allows that one configured origin plus localhost development origins; it does not hard-code preview hostnames or allow production origins on staging.
   - For the production Edge Function, configure its own `MONK_APP_URL=https://monk.monster` (and `www` routing as needed); do not reuse staging's app URL.
   - The sender must use the verified `monk.monster` domain. Never expose secret values.

## Controlled live acceptance test

Use one mailbox controlled by the project owner/tester. Do not use a customer mailbox or create an account for an unconsenting person. Record only pass/fail, timestamps, and provider message IDs; do not record passwords or tokens.

1. Open the staging preview in a clean browser session and verify the staging Turnstile widget loads without a hostname error.
2. Register a new test account with a valid password meeting all five rules: at least 12 characters, uppercase, lowercase, digit, and special character.
3. Confirm the initial verification email arrives, then remain on the pending-verification screen without opening its link.
4. Request a verification resend; verify a fresh CAPTCHA challenge is required and the second verification email arrives. Use the resent email's link to open the staging callback and confirm the account.
5. Sign in with the newly verified account; verify normalized email handling and successful session creation.
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
- No duplicate welcome email is produced by retries or repeated verification callbacks. The Edge Function reuses a stable Resend idempotency key for the same user.
- Simulate a provider timeout/5xx and confirm the ledger enters `manual_review`. Simulate a clearly rejected 4xx and confirm it enters `failed` for a safe retry.
- Confirm stale `sending` events older than 24 hours move to `manual_review`, never automatic retry. Reconcile provider events before an operator changes the state back to `failed`.
- `supabase/tests/auth_email_delivery_security.sql` passes in staging, including the 24-hour retry guard and `manual_review` status.
- The final PR diff and deployment environment variables are reviewed.
- Production migration/function/env changes, if any, have a separate explicit rollout and rollback plan.

## Production rollout after acceptance

1. Mark PR #40 ready for review and merge only after release gates pass.
2. Confirm the resulting main commit and CI checks.
3. Apply any reviewed additive Supabase migration and deploy the reviewed `send-welcome-email` Edge Function to production with `verify_jwt=true` and production-only secrets/`MONK_APP_URL=https://monk.monster`.
4. Deploy the exact merged commit to the existing `monk-platform` production project; do not create a replacement project.
5. Confirm the deployment is READY and aliases include `monk.monster` and `www.monk.monster`.
6. Verify production environment variables still reference the production Supabase project and production CAPTCHA site key.
7. Run non-destructive production smoke tests only; do not create an unsolicited real customer account or send test email to a customer.
8. Monitor Auth, Edge Function, Resend, and Vercel errors. Roll back to the previous production deployment if authentication or email delivery regresses.

## Rollback

- Vercel: promote the last known-good production deployment through the existing project rollback workflow.
- Git: revert the merge commit; do not force-push main.
- Supabase: do not blindly reverse the welcome-email migration or delete delivery records. Preserve `manual_review` records for reconciliation. Roll back only a reviewed, additive schema/function change using a tested forward-fix or migration.
- Cloudflare: leave the dedicated staging widget isolated; do not modify the production widget while rolling back staging.
