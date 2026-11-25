# MONK — Multi-tenant Campus and Business Platform

MONK is an India-first workspace platform with two product journeys: Campus for educational institutions and Business for companies, shops and startups.

## Stack and development

- React, Vite, TypeScript and React Router
- Supabase Auth, PostgreSQL, Edge Functions, Storage and Row Level Security
- Cloudflare Worker currently serves the public `monk.monster` origin using static Vite assets
- Vercel project `monk-platform` builds preview/production deployments separately; it is not currently the production origin
- Resend is integrated through Supabase Edge Functions; real delivery still requires verified sender configuration

```bash
npm install
npm run dev
npm run build
npm run test:release
npm run test:e2e
```

There is no committed `package-lock.json` yet, so CI uses `npm install`. Generate and review a lockfile before switching CI to `npm ci`.

Never put Supabase service-role keys, OAuth secrets, Resend API keys or Turnstile secrets in browser code or `VITE_*` variables. Browser code may use only the Supabase publishable/anon key. RLS and permission-checked server-side functions are the security boundary.

## Product journeys

### Campus
Institution, campus, department, programme, batch, student and faculty workflows; Principal, HOD, teacher, student and guardian access; admissions, timetable, attendance, assignments, examinations, result publication and private education documents. Public directory discovery must show only source-backed published records and must not imply regulatory approval.

### Business
Multi-tenant organizations, projects, tasks, members, invitations and CRM foundations. Phase 6 adds Sales and Business Operations: deals, activities, product catalog, inventory, orders, invoices, finance and reporting. The Phase 6 UI and India-wide directory/guardian/PWA remediations are in PR #36 and are not live on production until reviewed, merged and deployed.

Business document storage is not yet a complete private persistent file workflow. Do not treat local browser preview as secure document storage.

## Verified production snapshot — 25 November 2026

- Production application origin: `https://monk.monster`, currently served by Cloudflare Worker `monk` with its static-assets binding.
- Repository remediation PR: [#36](https://github.com/mrprashant9339-crypto/MONK-/pull/36), branch `fix/monk-production-audit-release`; latest known head at this audit update: `714b2bd40f6bd96eed987e5b1cb2ae5f8814acb1`.
- GitHub Actions run #1073 passed on implementation commit `aed68d164e3a0395014649e9033c565cdd1acefd` (type-check, production build, release smoke tests and browser E2E). The later documentation-only head update has not yet received a new Actions run.
- Vercel's PR preview deployment failed because the account exceeded the Free plan daily deployment limit (100 deployments); this is a hosting quota blocker, not a code-test result.
- Supabase production project `yucwackrbekwaxiyuobt` is active; separate staging project `monk-staging` is inactive.
- Production directory currently has 0 institutions, 0 published rows, 0 source records and 0 snapshots. No synthetic institutions have been inserted.
- Auth currently has 3 confirmed users and 1 linked Google identity; this does not prove fresh signup/OAuth or all Campus roles.
- Cloudflare Turnstile widget exists in Managed mode; public site key matches frontend and a secret is present in Cloudflare. Supabase Auth CAPTCHA enablement/secret configuration still needs dashboard verification.
- Leaked-password protection is disabled and must be enabled.
- Security inspection found 31 authenticated-callable SECURITY DEFINER functions and 2 informational RLS-enabled/no-policy findings. Inspected functions have explicit search paths and none is executable by `anon`; support tables are intentionally server-only. Review functions individually; do not blanket-revoke app RPCs.

## Hosting and release safety

The Cloudflare Worker is not a reverse proxy to Vercel. Vercel project metadata previously reported `live=false`, and non-custom deployment URLs are SSO protected. Do not change DNS, detach `monk.monster`, or route the Worker to a protected Vercel hostname without a tested public origin, cookie/OAuth/asset checks and rollback plan. Future domain changes should be handled through a single documented origin configuration rather than hard-coded assumptions.

## Remaining release gates

1. Review PR #36, resolve mergeability/review requirements, and rerun exact-head GitHub CI.
2. Resolve Vercel deployment quota or use the approved Cloudflare Worker deployment path; verify the exact commit and live smoke tests.
3. Verify Supabase Auth CAPTCHA, Google OAuth consent/provider credentials, email verification, password reset and fresh Google login with controlled accounts.
4. Activate isolated staging and test Campus Principal/HOD/Teacher/Student/Guardian plus Business owner/admin/manager/sales/auditor roles across two tenants.
5. Enable leaked-password protection and review SECURITY DEFINER functions/grants individually.
6. Verify Resend sender-domain configuration and real verification/reset/invitation delivery.
7. Obtain documented bulk-reuse rights or independently licensed official data before importing directory records.
8. Implement private persistent Business document storage with tenant-scoped policies, signed URL expiry, metadata, retention and file validation.
9. Test Worker/origin routing on a separate hostname before any production cutover.

## Evidence and trackers

- Full findings register: `docs/MONK_PRODUCTION_AUDIT_2026-11-25.md`
- External/operator blockers: [GitHub issue #28](https://github.com/mrprashant9339-crypto/MONK-/issues/28)
- Code remediation: [GitHub PR #36](https://github.com/mrprashant9339-crypto/MONK-/pull/36)
- Live-account acceptance: `docs/RELEASE-ACCEPTANCE-RUNBOOK.md`

Never create fake customer, student, parent, faculty, institution, inventory, invoice or attendance records to make acceptance appear complete.
