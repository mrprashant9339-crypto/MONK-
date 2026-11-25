# MONK — Production Completion Plan and Evidence

**Updated:** 25 November 2026  
**Repository:** `mrprashant9339-crypto/MONK-`  
**Production domain:** `https://monk.monster`  
**Supabase project:** `yucwackrbekwaxiyuobt`

This document distinguishes shipped code, production database configuration, automated checks and live acceptance. A phase is not production-cleared merely because its UI or migration exists.

## Phase completion matrix

| Phase | Implementation status | Remaining release evidence |
|---|---|---|
| 1. Authentication and email | Signup/login, PKCE callback, consent/profile completion, password recovery screens, invitation flow and verified-signup welcome email are implemented. The `email_delivery_events` migration is applied and `send-welcome-email` is ACTIVE with JWT verification. | Verify Supabase Auth SMTP for confirmation/recovery, Edge Function Resend secrets, Turnstile Auth CAPTCHA, Google OAuth branding/credentials, leaked-password protection and fresh-account live mailboxes. |
| 2. Business dashboard and operations | CRM, Sales, organization structure, deals, activities, catalog, stock ledger, orders, fulfilment, invoices, payments, journals, trial balance and reports use organization-scoped database workflows and permission checks. | Live acceptance with owner/admin/manager/sales/auditor test identities and two separate organizations. Do not seed fake business transactions. |
| 3. Campus portal and role permissions | Institution setup, campuses, departments, academic years, programmes, batches, students, faculty, timetable, attendance, admissions, guardian links, private documents, exams, results and reports are implemented with RLS/permission boundaries. | Live acceptance for institution admin/principal, HOD, faculty, student and parent identities across two test institutions. |
| 4. Institution directory and verification | Source-aware India-wide search, filters, import pipeline, source registry, verification states and approval workflow are implemented. | Production has zero institution records. Import only official datasets whose reuse terms permit it. OGD historical records must remain stale/unpublished; AICTE/other sources stay disabled until authorization and attribution are documented. |
| 5. Notifications and realtime | Existing notification centre, unread/read state, mark-all-read and user-filtered Postgres Changes subscription are implemented. Realtime publication and read-state migration are applied. | Exercise notification producers and realtime delivery with controlled users; verify per-user and per-organization isolation. |
| 6. Private documents and file security | Campus and Business private buckets are non-public. Business document vault now supports permission-gated upload, list, search, category filtering, short-lived signed downloads and authorized removal. Business document table privileges have been reduced to authenticated CRUD plus service_role; anonymous access is revoked. | Verify upload/download/delete, MIME/size limits, signed URL expiry and cross-tenant denial using two test organizations. Malware scanning is not currently enabled and must not be claimed. |
| 7. Legal, privacy and support | Public legal/trust pages, cookie consent, support-ticket intake, Turnstile validation, server-side ticket storage, privacy request submission and vulnerability disclosure guidance are implemented. Public support mailbox is `support@monk.monster`. | Confirm provider notification secrets and mailbox delivery; verify operator/legal identity, retention schedule and privacy-request handling procedure. Security disclosure is a mailto workflow, not a monitored bug-bounty portal. |
| 8. Mobile responsiveness and PWA | Responsive Campus/Business public journeys, mobile layouts, manifest, service-worker registration, offline shell, network notice and error boundary are implemented. | Verify installability and offline behavior on supported Android browsers and iOS Safari; a service worker does not make authenticated database operations available offline. |
| 9. Security and performance audit | Tenant RLS, role permissions, private buckets, least-privilege support/email tables, document grants and source-aware directory controls are in place. A fresh Supabase Advisor review was run. | Review 31 authenticated-callable SECURITY DEFINER functions individually; resolve leaked-password protection warning; assess 37 multiple-permissive-policy performance findings. Three no-policy RLS tables are intentional server-only tables (`email_delivery_events`, `support_tickets`, `support_intake_rate_limits`) with service_role grants only. |
| 10. Complete production testing | GitHub CI passes build, release smoke, browser E2E and preview Worker tests on the welcome-email PR. The deployment pipeline successfully deployed the Worker and passed preview checks, but production E2E exposed a false-200 404 defect. This branch adds a real 404 fix and regression tests. | Exact-head PR CI, production Worker deployment, live public route tests, role/tenant acceptance, email delivery and rollback verification must pass before release sign-off. |

## Implemented in the current completion branch

- Business private document vault integrated into the Business navigation, using the existing `business-private` bucket and `business_documents` metadata table.
- Document categories are constrained to the exact database enum/check values.
- Anonymous grants on `public.business_documents` revoked; authenticated CRUD and service-role access retained.
- Data Rights requests now submit through the server-side support intake with Turnstile instead of remaining only as a local draft.
- Support notifications accept the shared `MONK_EMAIL_FROM` / `MONK_SUPPORT_EMAIL` settings while retaining legacy secret aliases.
- Support and legal contact details use `support@monk.monster`.
- Cloudflare Worker no longer serves the SPA shell for unknown routes or missing static assets; unknown non-read methods return 405.
- Regression tests cover route allowlisting, static asset handling, real 404 responses and unsupported methods.

## Verified provider and infrastructure facts

- Resend domain `monk.monster` is verified and sending is enabled.
- A Resend API key named `MONK Production Email` exists. The key value is secret and is not retrievable through the list operation.
- The connected Supabase integration can deploy functions and apply migrations, but does not expose the Edge Function secret values or the Auth SMTP/CAPTCHA dashboard settings. Therefore secret presence and real mailbox delivery must be verified in Supabase/Resend dashboards.
- `send-welcome-email` is ACTIVE with JWT verification enabled; the delivery ledger migration is applied.
- Supabase project is ACTIVE_HEALTHY.
- Production directory institution count is zero; no fake college records have been inserted.
- No live Business or Campus tenant records have been fabricated to make acceptance tests pass.

## Operator-only release gates

1. In Supabase Edge Function Secrets, confirm `RESEND_API_KEY`, `MONK_EMAIL_FROM=MONK Support <support@monk.monster>`, `MONK_APP_URL=https://monk.monster`, `MONK_SUPPORT_EMAIL=support@monk.monster`, and `TURNSTILE_SECRET`. Keep the existing `SUPABASE_URL` and platform-managed secret/publishable keys available to the runtime.
2. In Supabase Auth, verify custom SMTP for confirmation and password recovery, enable Turnstile CAPTCHA and leaked-password protection, and verify the redirect allowlist.
3. In Google Cloud and Supabase Auth Providers, verify the MONK OAuth consent screen, credentials, authorized domain and callback URL.
4. Use controlled test mailboxes and separate Campus/Business test tenants to run the full acceptance matrix.
5. Confirm official institution-data reuse rights before importing or publishing any dataset.
6. Run exact-head GitHub CI and the Cloudflare production deployment workflow. Review the deployment commit and run the live smoke tests. Preserve the existing asset fallback and rollback path until the new origin is verified.

## Release decision

The implementation branch is a production-readiness candidate, not a claim that all external provider configuration or live user acceptance has passed. Do not mark MONK fully production-ready until every operator-only gate above has recorded evidence.
