# MONK — Workspace Platform

React + Vite + TypeScript application foundation connected to the MONK Supabase project.

## Stack
- React 18, React Router, TypeScript and Vite
- Supabase Auth, Postgres, RPC and Row Level Security
- Multi-tenant organization and project model
- Cloudflare Workers static asset hosting

## Local development
```bash
npm install
npm run dev
``

The frontend has the MONK Supabase project URL and publishable key as safe public defaults. You can override them with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The publishable key is intentionally public; never put a service-role/secret key in frontend code.

## Database model
MONK uses organization-scoped `organizations`, `organization_members`, `projects` and `tasks` tables. The application reads through RLS and performs mutations through authorization-checked RPCs.

Current task RPCs:
- `create_task(task_project_id, task_title, task_due_date, task_priority)`
- `update_task(task_id, next_status, next_blocker_reason)`
- `update_task_details(target_task_id, next_title, next_priority, next_due_date)`
- `archive_task(target_task_id)`

The task edit and archive functions enforce active-organization scope, task visibility, manager/admin/owner privileges or assignment-based contributor/vendor privileges, and write audit events. Archiving is a soft delete.

First-time users create a workspace and then a project. The organization creation RPC assigns the creator the owner role.

## Application features
- Email/password sign-in and account registration
- First-time organization and project setup
- Organization-scoped project and task loading
- Persistent task creation and completion
- Task title/priority/due-date editing RPC
- Soft task archival
- Local 25-minute focus timer with pause and reset

## Security
- RLS is enabled on all 26 public application tables.
- Authenticated users can SELECT only rows allowed by tenant/project/task policies.
- Direct client INSERT/UPDATE/DELETE on task/project tables is revoked; mutations use checked RPCs.
- Anonymous execution of SECURITY DEFINER application functions is revoked.
- New task edit/archive RPCs explicitly revoke PUBLIC and anon execution and grant authenticated execution only.
- No service-role key is shipped to the browser.

SECURITY DEFINER functions that remain executable by authenticated users are reviewed API functions and policy helpers. Each must retain explicit authentication, tenant and role checks. Do not blanket-revoke policy helper execution: policies call these helpers as part of row authorization.

## CI and deployment
GitHub Actions runs `npm install --no-audit --no-fund` followed by `npm run build` on pushes and pull requests targeting `main`. A green CI run must be verified in GitHub Actions before release.

Cloudflare Worker configuration is in `wrangler.jsonc`. Production Worker domain binding is managed in Cloudflare.

## Current scope and limitations
- Task CRUD is not fully complete: task create, status update, title/priority/due-date edit and soft archive are implemented; task assignment UI, comments and bulk operations remain pending.
- Project management supports create, edit and soft archive. Due date, visibility and status are preserved when editing through the current compact edit dialog.
- Focus timer runs locally in the browser; focus sessions are not yet persisted or included in analytics.
- Password recovery, OAuth providers, invitation management UI, team administration, file uploads, notifications and realtime subscriptions remain pending.
- Run the build and tenant-isolation integration tests before production deployment.
