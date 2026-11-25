# MONK Authentication Deployment Checklist

This release reuses the existing Supabase Auth project and the existing organization membership/RLS model. Never store Google OAuth client secrets, Supabase service-role keys, SMTP credentials, or CAPTCHA secrets in the browser bundle or Git repository.

## Supabase project

Project: `yucwackrbekwaxiyuobt`  
Project URL: `https://yucwackrbekwaxiyuobt.supabase.co`  
Production site: `https://monk.monster`

### Required Auth URL configuration

- Set the Supabase Auth Site URL to `https://monk.monster`.
- Add production redirect URLs:
  - `https://monk.monster/auth/callback`
  - `https://monk.monster/reset-password`
- Add the exact local development redirects used by the team, such as `http://localhost:5173/auth/callback` and `http://localhost:5173/reset-password`.
- Keep redirect URLs restricted to owned origins. Do not use broad wildcard domains.

### Google OAuth provider

1. In Google Cloud Console, create an OAuth 2.0 Web application client.
2. Add this exact Authorized redirect URI in Google Cloud:
   `https://yucwackrbekwaxiyuobt.supabase.co/auth/v1/callback`
3. In Supabase Dashboard → Authentication → Sign In / Providers → Google, enable Google and enter the Google Client ID and Client Secret.
4. Save the provider configuration and test both new-account consent and existing-account sign-in.
5. Do not put the Google Client Secret in `VITE_*` variables, source code, or GitHub.

The frontend calls Supabase Auth with provider `google` and redirects to `/auth/callback`. The callback performs one explicit PKCE code exchange; automatic URL detection is disabled to prevent React StrictMode from attempting to consume the one-time authorization code twice. Campus/Business intent, role, legal-consent versions and pre-OAuth profile fields are retained across the provider redirect in browser storage and written to Supabase Auth metadata only after the callback is validated.

For Google signup, the user must enter a full name and accept the current Terms and Privacy Policy before leaving MONK. Do not treat Google's account chooser as a completed MONK profile. The callback validates the stored onboarding context, records legal consent, and updates the caller's own existing `profiles` row through the narrow `update_my_profile` RPC. If the callback has no valid MONK onboarding context or no usable full name, the session is rejected and the user must restart from the MONK signup/login page.

Google sign-in cannot succeed until provider credentials and redirect allowlists are configured in the dashboard.

### Google consent-screen branding (required before production)
1. Open Google Cloud Console → Google Auth Platform → Branding (older projects: APIs & Services → OAuth consent screen).
2. Set **App name** to `MONK`. Set the user-support email and developer contact email to mailboxes controlled by the legal operator.
3. Add `monk.monster` to authorized domains. Use the production privacy policy URL `https://monk.monster/privacy` and terms URL `https://monk.monster/terms`. Add the official MONK logo only if it meets Google's branding requirements.
4. Verify the publishing status and audience. If the app remains in Testing, add each controlled test Google account to the test-user list; do not use a public user's account for testing.
5. In Google Auth Platform → Clients, confirm the Web OAuth client has the exact Supabase callback URI from Step 1. Save the client ID and secret in Supabase Auth → Providers → Google. Never commit the client secret or send it in chat.
6. Test both a new Google account and an existing account. The Google account chooser should display **MONK**, not the internal Supabase project name.

Changing the Supabase project name does not change the Google account chooser branding; that name is controlled by the Google OAuth consent-screen branding configuration.

### Supabase Auth CAPTCHA (required before production)
1. Open Supabase Dashboard → Authentication → Bot and Abuse Protection.
2. Enable CAPTCHA protection and select Cloudflare Turnstile.
3. Enter the existing MONK Turnstile site key and its secret in this Auth CAPTCHA setting, then save.
4. The Auth CAPTCHA secret is separate from the Edge Function `TURNSTILE_SECRET`. Configuring one does not configure the other.
5. Test signup, password sign-in and password recovery with a real browser-generated token. A Playwright mock token is only an automated UI test and is not live Siteverify evidence.
6. Confirm a missing/invalid token is rejected and a valid token is accepted. Review Supabase Auth logs and the Edge Function logs separately.

The connected Supabase integration does not expose the Auth CAPTCHA dashboard toggle/provider secret or Google Cloud OAuth branding settings. Do not mark these items complete until an operator verifies them in the respective dashboards. In Google Cloud OAuth consent-screen branding, set the application name to `MONK`; the hostname shown by the Google account chooser is the Supabase Auth callback host, not a project name entered by the user.

### Email and password security

- Keep email confirmations enabled for production.
- Configure a verified custom SMTP sender for reliable verification and password-reset delivery.
- Set a minimum password length of at least 12 characters and enable the project's leaked-password protection.
- Review Auth rate limits for signup, password sign-in, OTP/confirmation resend, and password recovery.
- Enable CAPTCHA (Cloudflare Turnstile or another supported provider) for public signup and recovery once site/secret keys are available.
- Configure security notification emails for password and email changes where available.
- Keep PKCE enabled; the browser client must use only the publishable key.

## Role and tenant safety

- The signup role is stored only as user intent. It is not a permission grant.
- Business Owners and institution administrators may start a new organization onboarding.
- Students, parents, teachers, HODs, principals, managers, sales, accounts, operations, staff, clients and vendors must join through an authorized invitation or existing verified institution record.
- Actual access is determined by organization membership, server-side permission checks and RLS. Never authorize using `user_metadata`.
- Student and guardian self-claim requires a verified email matching the institution's pre-created record. Do not let a user self-assign a college, admission number, HOD, principal or staff role.
- Public self-service workspace creation is limited to verified MONK Business owners with recorded legal consent. Campus workspace creation is blocked at the database RPC until the institution is independently verified and provisioned by MONK; selecting the "institution administrator" intent is not proof of authority.
- Student, parent, faculty, HOD, principal, institution administrators, and all Business team roles must join through a verified invitation or the approved institution-onboarding process. User metadata is intent only and must never grant membership or permissions.

## Release verification

- Verify Google sign-in, email signup, email confirmation, resend, password reset and password update on production.
- Test Campus and Business journeys on desktop and Android-sized viewports.
- Test invitation acceptance with matching and mismatched emails, expired tokens and revoked invitations.
- Test two separate organizations to confirm cross-tenant isolation.
- Run Supabase Security Advisors and resolve high-risk findings. Existing SECURITY DEFINER RPC warnings must be reviewed individually; do not blanket-revoke functions that are used by the application.
- Confirm the deployment commit and Cloudflare Worker routes before declaring production-ready.
