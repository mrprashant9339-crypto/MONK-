# MONK — Multi-tenant Workspace and Education Platform

MONK is a React + Vite + TypeScript web application backed by Supabase Auth, PostgreSQL and Row Level Security. Cloudflare Workers serves the static Vite build.

## Stack and local development

- React 18, React Router, TypeScript, Vite and Tailwind CSS
- Supabase Auth, Postgres, RPC, Storage and RLS
- Cloudflare Workers static assets
- Resend through a Supabase Edge Function for optional invitation email

```bash
npm install
npm run dev
npm run build
```

The browser uses only the Supabase publishable/anon key. Never place a service-role or secret key in frontend code.

## Business workspace

- Email/password registration and sign-in
- Create and switch between multiple Business or Education organizations
- Project create, edit and soft archive
- Persistent tasks: create, status update, title/priority/due-date edit and soft archive
- Organization team listing, role changes and member removal
- One-time organization invitations, revocation and email-bound acceptance
- Audit activity timeline
- Local 25-minute focus timer with pause/reset

Task assignment UI, comments, bulk operations, persistent focus sessions, notifications and realtime updates remain outside the current delivered scope.

## Education workspace

Education is a separate organization vertical. Creating an Education workspace does not convert existing Business organizations.

### Roles

- **Principal:** institution-wide education administration and academic oversight.
- **HOD:** department-scoped academic oversight and timetable/attendance management.
- **Teacher:** assigned classes, attendance marking and draft marks entry for assigned exam subjects.
- **Student:** own profile, timetable, attendance, admission application, documents and published results.
- **Parent:** explicitly linked children, attendance, authorized documents and published results.

Business roles remain separate. Education roles cannot be assigned in Business organizations. Student, parent and faculty records can only be claimed by authenticated accounts matching the pre-created verified email.

### Academic modules

- Institution profile, campuses, departments and HOD assignment
- Academic years, programmes, subjects and batches
- Student and faculty records
- Admission applications, review and transactional admission/enrollment
- Guardian-to-student linking and parent invitations
- Timetable scheduling and overlap validation
- Attendance sessions and present/absent/late/excused marking
- Private student/application documents and verification workflow
- Examination setup, subject mapping, teacher draft marks, result validation and leadership publication
- Attendance and published-result summary views

Programme-wide exams are supported; teacher visibility and marks entry are limited to the teacher's assigned subject/batches.

## Database and security

- All 20 education tables have RLS enabled; live catalog check found zero anonymous SELECT grants on those tables.
- Education foreign keys have covering indexes.
- Education Storage uses the private `education-private` bucket with scoped upload/download policies.
- Mutations use organization/role/assignment-checked database functions and triggers.
- Student and guardian self-claim grants are restricted to identity-link columns.
- The `citext` extension is in the `extensions` schema.
- Browser code contains no Supabase service-role key.

The SQL regression file is `supabase/tests/phase_2_security.sql` and `supabase/tests/phase_3_education_security.sql`. Both were executed against the connected Supabase project; the Phase 3 assertion block returned without exception.

The Supabase advisor still reports 27 authenticated-callable SECURITY DEFINER functions. These must be reviewed individually; several are application RPCs or policy helpers. Do not blanket-revoke them without tracing their callers and authorization checks. The advisor also reports 37 multiple-permissive-policy warnings, 35 unindexed foreign keys outside the education schema, and unused indexes. Auth leaked-password protection is still disabled and must be enabled in Supabase Auth password/security settings.

## Invitations and email

The Supabase Edge Function `send-education-invitation` is deployed and ACTIVE with JWT verification enabled. It validates the caller's permission and invitation token details before attempting Resend delivery.

To enable outbound email, configure these Edge Function secrets in Supabase:
- `RESEND_API_KEY`
- `MONK_EMAIL_FROM` — a sender/domain verified in Resend
- Optional `MONK_APP_URL` — defaults to `https://monk.monster`

Until the required secrets are configured, invitations still generate a secure one-time URL that can be copied and shared manually. No successful email delivery is claimed.

## CI and deployment

GitHub Actions workflow `.github/workflows/ci.yml` runs `npm install` and `npm run build` (`tsc -b && vite build`) on pushes and pull requests targeting `main`.

- Phase 2 PR #5: CI run #105 passed.
- Education foundation PR #6: CI run #133 passed.
- Timetable/attendance PR #7: CI run #151 passed.
- Workspace creation PR #8: CI run #161 passed.
- Role/academic workflow PR #9: CI run #198 passed.
- Teacher marks validation PR #13: CI run #232 passed.

The latest confirmed run #232 completed successfully, including dependency installation and TypeScript/Vite production build.

Cloudflare Worker `monk` and the `monk.monster` custom domain already exist. A new production deployment from the latest source has **not** been performed or verified; the existing Worker version cannot be tied conclusively to the latest Git commit.

## Release gates still requiring configuration or live-account testing

1. Enable Supabase Auth leaked-password protection.
2. Configure the Resend Edge Function secrets and verify a real invitation email.
3. Provision two isolated test organizations and separate owner/admin/HOD/teacher/student/parent accounts; run authenticated browser tests for tenant isolation, role boundaries, invitation acceptance, admission, document access, attendance and published results.
4. Review the remaining SECURITY DEFINER and permissive-policy advisor findings individually.
5. Deploy the latest verified build to Cloudflare and run a production browser smoke test on `https://monk.monster`.

No fake customer, student, parent, faculty, institution or attendance records were inserted to make these tests appear successful.
