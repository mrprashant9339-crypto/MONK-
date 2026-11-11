# MONK — Workspace Platform

React + Vite + TypeScript application foundation for the MONK workspace platform.

## Stack
- React 18, React Router, TypeScript and Vite
- Supabase Auth, Postgres, RPC and Row Level Security
- Multi-tenant organization and project model

## Local development
```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `VITE_SUPABASE_URL` and either `VITE_SUPABASE_PUBLISHABLE_KEY` or the legacy `VITE_SUPABASE_ANON_KEY`. The browser app intentionally has **no hard-coded project URL or key**. If variables are absent, the client remains unconfigured rather than silently connecting to production. Only publishable/anon keys belong in frontend environment variables; never expose a service-role/secret key.

## Staging environment (Task 3)
The dedicated Supabase staging project is `monk-staging`:
- Project ref: `ysspnuldfiijagagwiqk`
- Region: `ap-south-1` (Mumbai)
- API URL: `https://ysspnuldfiijagagwiqk.supabase.co`

Configure the following GitHub Actions repository secrets before running the manual staging workflow:
- `MONK_STAGING_SUPABASE_URL` — must be the staging URL above.
- `MONK_STAGING_SUPABASE_ANON_KEY` — staging publishable/anon key only.

Run **Actions → MONK Staging Smoke → Run workflow**. The job rejects any URL other than the staging project and checks the Supabase Auth health endpoint. It then builds the frontend. This smoke workflow does not apply migrations, create users, copy production data, or mutate production.

For local staging verification:
```bash
MONK_STAGING_SUPABASE_URL=https://ysspnuldfiijagagwiqk.supabase.co \
MONK_STAGING_SUPABASE_ANON_KEY=<staging-publishable-key> \
npm run staging:smoke
```

### Current staging limitation
The staging project is active and its Auth service/roles/extensions are present, but its public schema currently has zero MONK tables and zero applied MONK migrations. Task 3 therefore establishes environment isolation and a repeatable health/build check; it does **not** claim the application database is ready. Foundation migrations must be recovered and reviewed before database deployment. No production data is copied into staging.

## Database model
The application expects organization-scoped data and checked RPCs. Database functionality must not be treated as ready until the reviewed migrations are applied to staging and RLS tests pass.

## Security
- RLS is the database security boundary.
- Direct client access must remain tenant-scoped.
- No service-role key is shipped to the browser.
- Production is not a target for staging workflows.

## Authentication release verification
### Email delivery
Configure a custom SMTP provider in Supabase Dashboard → Authentication → SMTP Settings. Keep email confirmations enabled and autoconfirm disabled. Configure SPF, DKIM and DMARC for the sender domain, then set the correct Site URL and redirect allow list. Provider credentials must remain in Supabase settings, not source control.

### Google OAuth
Configure a Web application OAuth client in Google Cloud Console. Set the authorized origin to the deployed app origin and the callback URI to the exact Supabase callback URL shown in Authentication → Providers → Google. Store the Client ID/Secret only in Supabase provider settings.

### Real two-user E2E
The manual workflow `.github/workflows/auth-e2e.yml` requires two verified staging test users, two separate organizations and its eight `MONK_E2E_*` GitHub secrets. Never place credentials in source code, issue comments or chat.
