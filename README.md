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
```

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
- Education institution profile, campus and department setup
- Academic years, programmes, subjects and batch management
- Student and faculty records with transactional enrollment synchronization
- Timetable scheduling with faculty/batch conflict validation
- Attendance sessions and batch roster marking
- Local 25-minute focus timer with pause and reset

## Security
- RLS is enabled on all 39 public application tables, including the 13 Phase 3 education tables.
- Authenticated users can SELECT only rows allowed by tenant/project/task policies.
- Direct client INSERT/UPDATE/DELETE on task/project tables is revoked; mutations use checked RPCs.
- Anonymous execution of SECURITY DEFINER application functions is revoked.
- New task edit/archive RPCs explicitly revoke PUBLIC and anon execution and grant authenticated execution only.
- No service-role key is shipped to the browser.

SECURITY DEFINER functions that remain executable by authenticated users are reviewed API functions and policy helpers. Each must retain explicit authentication, tenant and role checks. Do not blanket-revoke policy helper execution: policies call these helpers as part of row authorization.

## CI and deployment
GitHub Actions runs `npm install --no-audit --no-fund` followed by `npm run build` on pushes and pull requests targeting `main`. Phase 2 CI run #105 passed on PR #5: dependency installation and `npm run build` (`tsc -b && vite build`) both succeeded. Continue requiring green CI for subsequent changes.

Cloudflare Worker configuration is in `wrangler.jsonc`. Production Worker domain binding is managed in Cloudflare.

## Current scope and limitations
- Task CRUD is not fully complete: task create, status update, title/priority/due-date edit and soft archive are implemented; task assignment UI, comments and bulk operations remain pending.
- Project management supports create, edit and soft archive. Due date, visibility and status are preserved when editing through the current compact edit dialog.
- Focus timer runs locally in the browser; focus sessions are not yet persisted or included in analytics.
- Password recovery, OAuth providers, invitation email delivery, file uploads, notifications and realtime subscriptions remain pending.
- Run the build and tenant-isolation integration tests before production deployment.

## Phase 2 workspace management
- Project create, edit and soft archive.
- Organization team listing, permission-checked role changes and member removal.
- Invitation creation, one-time link copying, invitation status listing and revocation.
- Email-bound invitation acceptance through the existing Supabase RPC.
- Organization switching through membership-checked RPC.
- Audit activity timeline under the existing audit-log RLS policy.

Phase 2 database RPCs are defined in `supabase/migrations/20261112065511_phase_2_workspace_management.sql` and `supabase/migrations/20261112065836_phase_2_member_email_cast.sql`. Security regression assertions are in `supabase/tests/phase_2_security.sql`. The assertions were executed against the connected Supabase project and passed. Authenticated browser workflows and the GitHub Actions build still require end-to-end verification before release.


## Phase 3 — Education Management System

The education vertical reuses the existing organization tenant boundary. During first-time setup or from the workspace management header, users can create a new Business or Education organization. The existing organization is preserved and the new organization becomes active. Existing business organizations are not converted.

### Education schema
- Institution profile and verification state; campuses and departments.
- Academic years, programmes, subjects and batches.
- Student records, faculty records and enrolments.
- Timetable entries and attendance sessions/records.

All 13 education tables are organization-scoped, have RLS enabled, and use organization-aware foreign keys for linked records. Policies require the active organization to have the `education` vertical and the corresponding `education.*` permission. PUBLIC and anonymous table privileges are revoked. Education mutations update timestamps and append organization audit events.

### Current education UI
- Institution profile create/update.
- Campus and department creation/listing.
- Academic year, programme and batch creation/listing.
- Student and faculty record creation/listing.
- Subject creation, timetable scheduling with overlap checks, and attendance sessions with batch roster marking.
- Student admission creates the academic enrollment in the same database transaction; batch changes keep enrollment history synchronized.
- Administration UI is currently restricted to owner, admin and manager organization roles. Teacher/student self-service portals, timetable and attendance screens, admissions workflow, document verification and email notifications are not yet delivered.

### Phase 3 verification
- `supabase/tests/phase_3_education_security.sql` executed against the connected Supabase database and passed.
- GitHub Actions CI runs #133 and #151 passed: dependency installation and `npm run build` (`tsc -b && vite build`) succeeded for the education foundation and the timetable/attendance additions. Phase 3 PRs #6 and #7 were merged into `main`.
- Tests assert 13 tables, RLS, tenant-vertical guards, revoked anonymous privileges, authenticated read access and audit triggers.
- No institution, campus, student, faculty or attendance sample data was inserted. Existing business organizations were not converted.
- Create an Education organization to use the education workspace; existing project organizations are currently Business vertical.
