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

The frontend already calls Supabase Auth with provider `google` and redirects to `/auth/callback`. Google sign-in cannot succeed until the provider credentials and redirect allowlist are configured in the dashboard.

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

## Release verification

- Verify Google sign-in, email signup, email confirmation, resend, password reset and password update on production.
- Test Campus and Business journeys on desktop and Android-sized viewports.
- Test invitation acceptance with matching and mismatched emails, expired tokens and revoked invitations.
- Test two separate organizations to confirm cross-tenant isolation.
- Run Supabase Security Advisors and resolve high-risk findings. Existing SECURITY DEFINER RPC warnings must be reviewed individually; do not blanket-revoke functions that are used by the application.
- Confirm the deployment commit and Cloudflare Worker routes before declaring production-ready.
