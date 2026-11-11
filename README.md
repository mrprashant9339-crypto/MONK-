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

The frontend has the MONK Supabase project URL and publishable key as safe public defaults. You can override them with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The publishable key is intentionally public; never put a service-role/secret key in frontend code.

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
Task create/list/complete is persisted to Supabase. The focus timer, task editing/deletion, invitations, project management UI and realtime subscriptions are not implemented yet. Run the build and RLS integration tests before production deployment.
