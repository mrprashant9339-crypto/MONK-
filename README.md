# MONK — Multi-tenant Campus and Business Platform

MONK is an India-first workspace platform with two distinct product journeys: Campus for educational institutions and Business for companies, shops and startups.

## Stack

- React, Vite, TypeScript and React Router
- Supabase Auth, PostgreSQL, Edge Functions, Storage and Row Level Security
- Cloudflare Workers for the current public production origin
- Vercel project `monk-platform` for the separately deployed Vite build
- Resend integration through Supabase Edge Functions (delivery still requires verified sender configuration)

## Local development

```bash
npm install
npm run dev
npm run build
npm run test:release
npm run test:e2e
```

The repository currently has no committed `package-lock.json`; CI therefore uses `npm install`. A reviewed lockfile is tracked as a production-readiness task before switching to `npm ci`.

Never place a Supabase service-role key, OAuth client secret, Resend API key or Turnstile secret in frontend code or a `VITE_*` variable. The browser may use only the Supabase publishable/anon key; database RLS and permission-checked RPCs are the security boundary.

## Product architecture

### Campus
- Institution, campus, department, programme, batch, student and faculty records
- Principal, HOD, teacher, student and parent/guardian access boundaries
- Admissions, timetable, attendance, assignments, examinations, result publication and private education documents
- Institution discovery reads only published directory records; it must not infer regulatory approval from a directory listing

### Business
- Multi-tenant organization workspaces, projects, tasks, members and invitations
- CRM foundations for leads, contacts and companies
- Phase 6 Business Operations adds organization structure, deals, activities, product catalog, inventory, orders, invoices, finance and reporting. Its UI integration is in PR #27 and is not part of the current production `main` until that PR is accepted and merged.
- Business document storage is not yet a complete private, persistent file workflow.

## Production snapshot — 25 November 2026

- GitHub `main` now includes audit documentation commit `bfabf4777a59817e7e8304c1ec0f48dbcaba05e0`; the application source baseline remains `75fe54d733ab782cea9ae2bf3af8f2053144d57e`.
- Latest confirmed production-main GitHub CI run: #1069, success. Cloudflare deployment run #217 deployed the unchanged app bundle but failed its live E2E suite on the direct `/signup` route; PR #29 contains the fix.
- Remediation PR #29 is integrating Phase 6 Business UI, the source-aware India directory, guardian query hardening and PWA recovery. Do not treat its code as deployed until merged and deployed.
- Supabase production project `yucwackrbekwaxiyuobt` is active. The separate `monk-staging` project is inactive.
- Production Auth currently has 3 confirmed accounts and 1 linked Google identity; this is not proof that fresh OAuth or Campus role onboarding has passed.
- Cloudflare Turnstile widget for MONK exists in Managed mode; its public site key matches the frontend and a secret is present in Cloudflare. Supabase Auth CAPTCHA enablement/secret configuration still requires dashboard verification.
- The production directory currently has 0 institutions, 0 published records, 0 source records and 0 snapshots. No fabricated institution rows are published.
- Supabase Auth leaked-password protection is disabled and must be enabled.
- Supabase Security Advisor reports 31 authenticated-callable SECURITY DEFINER functions and 2 informational RLS-enabled/no-policy findings. The inspected functions have explicit search paths and none is executable by `anon`; support tables are intentionally server-only. Review each authenticated function individually; do not blanket-revoke application RPCs.

## Hosting and routing snapshot

- `monk.monster` is currently served by Cloudflare Worker `monk`, using its static-assets binding to serve the Vite build.
- The Worker has an enabled custom domain; its current traffic is on the deployed Worker version.
- Vercel project `monk-platform` has a READY production deployment. Project metadata reports `live=false`; deployment protection is enabled for non-custom deployment domains. An isolated custom origin `origin.monk.monster` and preview Worker host `preview.monk.monster` are being used to validate the proxy path.
- The Worker is not yet a production reverse proxy to Vercel. The Vercel origin returned 404 for direct SPA deep links and its next build hit an account build-rate limit. The isolated preview Worker now maps known SPA paths to the origin root while proxying assets directly; production cutover remains blocked until the preview deep-link suite passes.

## Current release gates

1. Accept and merge PR #27 only after exact-head CI succeeds and its code review is complete.
2. Verify Supabase Auth CAPTCHA, Google Cloud OAuth branding/credentials, email verification, password reset and fresh Google login with controlled accounts.
3. Activate isolated staging and test Student, Faculty/Teacher, Parent, Institution Admin/Principal, HOD and Business roles with two separate organizations.
4. Enable leaked-password protection and review SECURITY DEFINER functions and grants individually.
5. Verify Resend sender-domain configuration and real delivery for verification, reset and invitations.
6. Obtain explicit bulk-reuse rights or independently licensed official files before importing current AISHE/UGC/AICTE/regulator data. Historical OGD rows must remain stale and unpublished.
7. Implement private persistent Business document storage with tenant-scoped policies, signed URL expiry and file validation.
8. Test Worker-to-Vercel routing on a separate origin hostname, including cookies, redirects, static assets, OAuth callbacks, 404s and rollback, before any production cutover.

## Release evidence

- Full issue register: `docs/MONK_PRODUCTION_AUDIT_2026-11-25.md`
- External/operator acceptance tracker: GitHub issue #28
- Remediation implementation: PR #29
- Authentication and live-account runbook: `docs/RELEASE-ACCEPTANCE-RUNBOOK.md`

Do not create fake customer, student, parent, faculty, institution, inventory, invoice or attendance records to make acceptance appear complete.
