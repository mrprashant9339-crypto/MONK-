# MONK — Workspace Platform

React + Vite + TypeScript application foundation connected to the MONK Supabase project.

## Stack
- React 18, React Router, TypeScript and Vite
- Supabase Auth, Postgres, RPC and Row Level Security
- Multi-tenant organization and project model

## Local development
```bash
npm install
npm run dev
```

The frontend requires explicit `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configuration for every environment. There is no production URL/key fallback. For local development, use a local Supabase stack or deliberately supply staging credentials. The publishable key is intentionally public; never put a service-role/secret key in frontend code.

## Database model
MONK reuses the existing `organizations`, `organization_members`, `projects` and `tasks` tables. Tasks are organization/project scoped. The app reads through RLS and creates/updates tasks through checked RPCs:
- `create_task(task_project_id, task_title, task_due_date, task_priority)`
- `update_task(task_id, next_status, next_blocker_reason)`

First-time users create a workspace and then a project. The organization creation RPC assigns the creator the owner role.

## Security
- RLS remains enabled on task/project tables.
- Authenticated users can SELECT only rows allowed by tenant/project/task policies.
- Direct client INSERT/UPDATE/DELETE on tasks/projects is revoked.
- Anonymous execution of SECURITY DEFINER functions is revoked; approved application RPCs/helpers are explicitly granted to authenticated users.
- No service-role key is shipped to the browser.

## Current scope and limitations
Task create/list/complete and organization authentication, switching and invitation flows are connected to Supabase. Focus timer, task editing/deletion, full project management UI and realtime subscriptions remain outside this phase. Run build and multi-user RLS/E2E tests before production deployment.


## Authentication release verification

### Email delivery
Configure a custom SMTP provider in Supabase Dashboard → Authentication → SMTP Settings. Keep email confirmations enabled and autoconfirm disabled. Set SPF, DKIM and DMARC for the sender domain, then use Authentication → URL Configuration to set:
- Site URL: `https://monk.monster`
- Redirect allow list: `https://monk.monster/**` and `http://localhost:5173/**` for development only.

Test signup confirmation and password recovery using two dedicated test mailboxes. Supabase's built-in SMTP is restricted to project-team addresses and is not suitable for production delivery.

### Google OAuth
In Google Cloud Console create a Web application OAuth client. Set Authorized JavaScript origins to `https://monk.monster` (and local origin only during development). Set its Authorized redirect URI to the exact Supabase callback URL shown on Authentication → Providers → Google, normally `https://<project-ref>.supabase.co/auth/v1/callback`. Enable Google provider in Supabase and store Client ID/Secret only in the provider settings. Add `https://monk.monster/**` and local development callback to Supabase URL Configuration. Never commit provider secrets.

### Real two-user E2E
A manual GitHub Actions workflow is available at `.github/workflows/auth-e2e.yml`. Configure these GitHub Actions repository secrets using a **staging Supabase project**, two separate verified test accounts. The E2E test creates two isolated organizations through the authenticated `create_organization` RPC, so organization IDs are not stored as GitHub secrets:
- `MONK_E2E_SUPABASE_URL`
- `MONK_E2E_SUPABASE_ANON_KEY`
- `MONK_E2E_OWNER_EMAIL`, `MONK_E2E_OWNER_PASSWORD`
- `MONK_E2E_INVITEE_EMAIL`, `MONK_E2E_INVITEE_PASSWORD`

Then run GitHub Actions → MONK Auth Multi-user E2E → Run workflow. The workflow fails immediately if any required secret is missing (it never reports a skipped E2E job as a successful test). The test checks two independent logins, profile and legal-consent records, invitation authorization, token creation, acceptance, role assignment, single-use enforcement, organization switching and cross-tenant denial. It refuses to mutate the production MONK project by default. Do not place credentials in source code, issue comments or chat.
