# MONK 30-Point Security Audit — 28 November 2026

## Audit metadata

- Repository: `mrprashant9339-crypto/MONK-`
- Audited branch: `main`
- Audited commit: `6a7dcabdc5d42226fba0a264131622e373df4af4`
- Application: India-first multi-tenant Campus and Business platform
- Stack observed: React 18, TypeScript, Vite, Supabase Auth/Postgres/Edge Functions/Realtime/Storage, Cloudflare Workers, Vercel origin, Resend
- Supabase production: `yucwackrbekwaxiyuobt` (ACTIVE_HEALTHY)
- Supabase staging: `ysspnuldfiijagagwiqk` (ACTIVE_HEALTHY)
- Production database and production Worker were not modified during this audit.
- Scope: source tree, migrations, SQL security tests, Edge Functions, CI workflows, GitHub PR/CI state, read-only Supabase Security Advisor and selected catalog/function-definition queries.

## Executive summary

The audit confirms that MONK already has meaningful security controls: browser code uses a Supabase publishable key rather than a service-role key; Supabase Auth uses PKCE; Edge Functions use explicit origin allowlists and server-side identity checks; business documents use a private bucket and tenant-scoped policies; and SQL regression suites cover tenant isolation and SECURITY DEFINER boundaries.

The application is not production-security-cleared. Current production Security Advisor results show 31 authenticated-executable SECURITY DEFINER functions, three RLS-enabled/no-policy informational findings for server-only tables, and leaked-password protection disabled. Staging reports 36 authenticated-executable SECURITY DEFINER functions and the same three server-only table notices. These function warnings are not all vulnerabilities by themselves; each function requires an individual authorization and grant review.

Several concrete privilege/tenant defects were reproduced in staging and have fixes in open PRs #42–#46. Those PRs report staging-only migrations and passing rollback-only behavior tests. They are not merged into `main`, so staging validation must not be described as production remediation. PR #40 has CI coverage for authentication/password recovery but still lists live provider acceptance as a release gate. PR #37 contains lockfile, private document storage, tenant/RLS and SECURITY DEFINER hardening, with exact-head CI passing; its latest Vercel preview is blocked by the account build-rate limit.

## Phase 1 — Architecture and trust boundaries

### Trust boundaries

1. **Browser / public frontend:** React SPA. The browser is untrusted. `src/lib/supabase.ts` uses a publishable/legacy anon key and Supabase JS PKCE; no service-role key belongs in this boundary.
2. **Supabase Auth:** Issues and refreshes user sessions. Authorization must use the authenticated identity and database membership/permission records, not editable user metadata.
3. **Supabase Data API / Postgres:** RLS is the primary tenant boundary. SECURITY DEFINER RPCs intentionally cross the normal RLS boundary and therefore require explicit identity, tenant, permission, parameter and EXECUTE-grant review.
4. **Supabase Edge Functions:** Server-side endpoints. They validate bearer sessions with `auth.getUser()`, validate request bodies and apply origin/CAPTCHA/rate-limit controls where implemented. Service-role credentials are server-only.
5. **Supabase Storage:** Business document bucket is private; metadata and object access are intended to be tenant- and permission-scoped.
6. **Cloudflare Worker / Vercel origin:** Public delivery and routing boundary. Worker/preview/production origin behavior and security headers must be verified independently of a successful frontend build.
7. **Resend:** External email provider. API credentials must remain in Edge Function secrets; email delivery, idempotency and sender configuration require real staging acceptance.
8. **External data source:** Directory import currently targets a fixed AICTE endpoint; source-reuse approval gates must remain enforced.

### Existing security assets found

- `src/lib/supabase.ts`: publishable key, PKCE flow, persisted Supabase session and automatic token refresh.
- `src/components/AuthExperience.tsx`: one-time PKCE code-exchange guard and `auth.getUser()` in OAuth callback processing.
- `src/components/TurnstileWidget.tsx`: public site key only; server-side verification is required and is implemented in selected Edge Functions.
- `supabase/tests/phase_3_tenant_isolation_live.sql`: two-organization negative/positive tenant-isolation checks.
- `supabase/tests/phase_3_security_definer_review.sql`: catalog checks for pinned search paths, PUBLIC/anon grants and suspicious dynamic SQL.
- `supabase/functions/send-education-invitation/index.ts`, `send-welcome-email/index.ts`, and `support-ticket-intake/index.ts`: explicit origin allowlists, bearer validation and bounded input handling.
- `supabase/migrations/20261125095538_business_private_documents_reproducible.sql`: private bucket, 25 MB limit and tenant/permission-scoped Storage and metadata policies.
- `tests/release-smoke.test.mjs`: includes a browser-source check that rejects service-role/secret-key literals.
- CI currently runs TypeScript/build, release tests, Playwright E2E and Worker-to-Vercel preview checks. On the audited `main`, dependency installation still uses `npm install`; PR #37 adds a lockfile and `npm ci`.

## Phase 2 — 30-category vulnerability assessment

Status meanings:
- **Confirmed / remediation pending:** evidence demonstrates a defect or material control gap; a fix exists or is required but is not yet production-integrated.
- **Partial:** some controls exist, but full coverage or live verification is incomplete.
- **Unverified:** repository evidence is insufficient to assert pass or fail.
- **Not applicable:** the audited product baseline does not currently implement the relevant capability. Reassess when that capability is introduced.

| # | Category | Assessment | Severity | Evidence / next action |
|---:|---|---|---|---|
| 1 | Broken Access Control | Confirmed / remediation pending | Critical | Staging reproduced role-boundary and soft-deleted-tenant access defects. PRs #43–#46 add role ceilings and deleted-org guards; production rollout remains pending. |
| 2 | IDOR / BOLA | Partial | Critical | Two-tenant SQL tests exist. PR #46 reproduced and fixed access to a soft-deleted tenant in staging; rerun cross-tenant tests against the integrated release and production only after approved rollout. |
| 3 | Exposed API Keys | Partial | High | Frontend contains a publishable Supabase key and Turnstile site key, both public by design. No service-role key was found in inspected frontend files; full Git history/secret-provider scan is still unverified. |
| 4 | Price Manipulation | Not applicable to current payment flow | N/A | No live payment-provider checkout/settlement integration was found in the audited source. If payment processing is introduced, prices, taxes, discounts and totals must be server-calculated. |
| 5 | Negative Quantity Exploit | Unverified / conditional | Medium | Business inventory/order workflows exist, but no complete boundary-value audit of every quantity/refund mutation was evidenced. Validate positive bounded integers and database constraints before enabling transactional workflows. |
| 6 | Fake Payment | Not applicable to current live provider flow | N/A | No verified payment-provider webhook/settlement integration was found. Do not mark orders paid or fulfil them based on browser state when a provider is added. |
| 7 | Coupon & Reward Abuse | Not applicable | N/A | No coupon, referral-credit or loyalty redemption capability was identified in the audited tree. |
| 8 | Privilege Escalation | Confirmed / staging fixes validated | Critical | Staging reproduced admin-to-owner assignment, custom-role permission self-escalation and Education-principal promotion to Business manager. PRs #43–#45 add guards and rollback-only tests; production remains pending. |
| 9 | Authentication & OTP Bypass | Partial | High | Supabase Auth handles credentials/verification; PKCE and Turnstile are present. PR #40 adds password policy, CAPTCHA lifecycle and recovery tests. Its browser tests mock providers; real CAPTCHA, SMTP and session acceptance remain open. |
| 10 | Prompt Injection | Not applicable | N/A | No AI model/tool execution integration was identified in the audited source. Reassess before adding AI actions or retrieval. |
| 11 | Cross-Site Scripting (XSS) | Partial / unverified | High | React text rendering provides default escaping and invitation email code includes HTML escaping. A production CSP and a complete dangerous-DOM/sanitizer audit were not verified. Add CSP after inventorying required scripts and test stored/reflected/DOM paths. |
| 12 | Malicious File Upload | Partial | High | Business documents use an allowlisted MIME set, size cap and private tenant-scoped Storage policies. MIME metadata is not a malware/content-signature scan; enforce server-side content inspection/quarantine before treating uploads as trusted. |
| 13 | Environment Variable Exposure | Partial | High | `.env.example` contains placeholders and public browser configuration; `.gitignore` excludes `.env` and `.env.local`. Full history scanning, CI secret scanning and credential-rotation status remain unverified. |
| 14 | SQL / NoSQL Injection | Partial | High | Browser data access uses Supabase query-builder methods; inspected migrations use static/controlled SQL. Complete review of every RPC, dynamic SQL path and Edge Function input remains required. |
| 15 | JWT Vulnerabilities | Partial | High | Supabase-managed JWT and PKCE are used; Edge Functions validate sessions via `auth.getUser()`. No custom JWT signing was found. Verify issuer/audience/expiry at each non-Supabase service boundary and test revocation/session freshness. |
| 16 | Rate Limit Bypass & DoS | Partial | High | Support intake uses Turnstile and an atomic database rate-limit RPC (5/hour per hashed IP). A global distributed policy for every public/auth/API route, payload/timeouts and concurrency limits is not verified. |
| 17 | Row-Level Security Bypass | Confirmed review backlog | Critical | Security Advisor: staging 36 authenticated-callable SECURITY DEFINER warnings; production 31. Neither environment reports anon execution in the selected catalog checks. Three RLS/no-policy INFO findings are server-only tables with no client grants. PR #42 fixes a forged-audit-RPC path in staging; do not blanket-revoke required RPCs. |
| 18 | Predictable Security Tokens | Partial | High | Invitation acceptance hashes a 64-character token with SHA-256, locks the invitation row, and checks expiry/accepted/revoked/email state. Verify token creation entropy and single-use behavior for all reset/invitation/session tokens. |
| 19 | Cross-Site Request Forgery (CSRF) | Low risk for current bearer-token model; verify | Medium | Supabase JS stores/attaches bearer session tokens rather than relying on an application-auth cookie for these calls. Continue to reject untrusted origins and ensure no future cookie-auth mutation endpoint lacks CSRF protection. |
| 20 | CORS Misconfiguration | Partial | High | Invitation, welcome-email and support functions have explicit origin allowlists; an integration test checks allowed and untrusted invitation preflights. Verify every deployed Edge Function and keep allowed methods/headers minimal. |
| 21 | Server-Side Request Forgery (SSRF) | Not applicable to current user-controlled URL flow | N/A | Directory sync uses a fixed AICTE endpoint rather than a user-supplied destination. Preserve fixed destinations and outbound restrictions if URL import/proxy/webhook features are added. |
| 22 | Insecure Session Management | Partial | High | Supabase PKCE, persisted sessions and automatic refresh are configured. Test logout/revocation, recovery-session expiry, privilege-change rotation and cross-device session handling with real staging accounts. |
| 23 | OAuth / SSO Vulnerabilities | Partial | High | Google OAuth callback uses PKCE code exchange and `getUser()`; consent/profile data is handled separately. Provider console configuration and fresh-account live OAuth tests are not independently verified. |
| 24 | Prototype Pollution | Unverified | Medium | No concrete unsafe merge finding was confirmed from the sampled source. Run a full source/dependency scan for recursive merge/assignment of untrusted objects and known vulnerable packages. |
| 25 | Regular Expression DoS (ReDoS) | Partial | Medium | Inspected email/slug expressions are simple and inputs are length-bounded. Complete regex inventory and worst-case tests remain unverified. |
| 26 | WebSocket Hijacking | Partial | High | Supabase Realtime is used for user/organization notifications; subscriptions filter by user and rely on database authorization. Verify channel authorization, RLS and origin/session handling with two live tenants. |
| 27 | Server-Side Template Injection | Not applicable | N/A | No server-side template engine was identified. Email content is generated by Edge Functions; retain escaping and never evaluate user-controlled template expressions. |
| 28 | Dependency Vulnerabilities | Confirmed reproducibility gap on main | Medium | Audited `main` has no `package-lock.json` and CI uses `npm install`. PR #37 adds a lockfile and `npm ci`; automated Dependabot/npm audit results still need to be recorded. |
| 29 | Mass Assignment | Confirmed / remediation pending | Critical | Role and permission RPCs had privilege-delegation gaps reproduced in staging. PRs #43–#45 add explicit role/permission ceilings. Keep protected fields off client update allowlists and never authorize from `user_metadata`. |
| 30 | Security Misconfiguration | Confirmed production hardening gap | High | Production Security Advisor reports leaked-password protection disabled, 31 SECURITY DEFINER warnings and three server-only RLS/no-policy INFO notices. CAPTCHA/SMTP/OAuth dashboard configuration and complete response security headers remain operator/live checks. |

## Phase 2 — Verified live database observations

Read-only checks on 28 November 2026:

| Check | Staging | Production |
|---|---:|---:|
| Project status | ACTIVE_HEALTHY | ACTIVE_HEALTHY |
| Authenticated-executable SECURITY DEFINER warnings | 36 | 31 |
| RLS enabled, no policy (INFO) | 3 | 3 |
| Leaked-password protection warning | Not reported by Advisor | 1 WARN |
| Anonymous EXECUTE on selected SECURITY DEFINER functions | false | false |

The three RLS/no-policy notices are:
- `public.email_delivery_events`
- `public.support_intake_rate_limits`
- `public.support_tickets`

These are intended server-only tables; absence of client policies is not itself a vulnerability when client grants are also absent. Keep their service-only access and verify grants after every schema change.

Selected staging catalog definitions confirm `search_path` is pinned for reviewed SECURITY DEFINER functions. Staging PR migrations currently include safeguards for role assignment, custom permission delegation, Education role ceilings, audit RPC authorization and soft-deleted organizations. The production database does not yet have all of those staging-only migrations.

## Phase 3 — Remediation plan (ordered)

### P0 — Required before production security acceptance

1. Integrate PR #37 security/reproducibility changes: private Business document storage, tenant policies, SECURITY DEFINER search-path hardening, removal of user-metadata authorization, reproducible lockfile and `npm ci`.
2. Integrate PR #40 authentication changes only after its live staging runbook passes: CAPTCHA enabled in Supabase Auth, real signup/verification/login/recovery, Resend delivery and duplicate/failure handling.
3. Integrate PR #42 audit RPC fix; retain trigger behavior and ensure direct authenticated calls cannot forge audit rows.
4. Integrate PR #43–#45 role/permission delegation ceilings.
5. Integrate PR #46 deleted-organization membership, role, permission, switch and invitation guards.
6. Rerun all SQL catalog and rollback-only behavior suites on one integrated staging candidate. Confirm zero fixture residue and active-tenant positive controls.
7. Review every remaining SECURITY DEFINER function individually. Keep only intentionally callable RPCs with an internal authorization check and least-privilege EXECUTE grants.

### P1 — Required before broad public launch

8. Enable production leaked-password protection after staging acceptance and controlled rollout.
9. Complete full secret scanning, rotate any confirmed leaked credentials, and enable push/PR secret scanning.
10. Add and verify a restrictive CSP and complete security headers at the actual public Worker/origin response.
11. Complete upload content-signature validation and malware quarantine/scanning; retain private storage and short-lived signed downloads.
12. Verify all Edge Function CORS policies, rate limits, request-size bounds, timeouts and authorization.
13. Complete two-tenant Realtime tests, logout/session invalidation, OAuth, email and role-specific live acceptance.
14. Add dependency vulnerability scanning and keep lockfile-based installs reproducible.

### P2 — Capability-triggered controls

15. Before enabling payment processing, add server-authoritative pricing, provider signature verification, amount/currency/order binding and idempotent fulfillment.
16. Before introducing coupons/rewards, add atomic redemption and uniqueness/usage constraints.
17. Before adding AI tools, implement prompt-injection-resistant tool permissions, independent authorization and confirmation for sensitive actions.
18. Before accepting arbitrary URLs or webhook destinations, add SSRF-safe allowlisting and outbound network controls.

## Phase 4–5 — Existing remediation and test work

The following work already exists and should be reused, not reimplemented:

| PR | Remediation | Evidence / state |
|---:|---|---|
| #37 | Private Business documents, tenant/RLS controls, SECURITY DEFINER search-path and user-metadata hardening, lockfile / `npm ci` | PR body reports exact-head CI #1116 passed; staging SQL checks passed; Vercel preview for latest head is blocked by free-plan build-rate limit. Open; not production deployed. |
| #40 | Password policy, CAPTCHA lifecycle, password recovery, welcome-email idempotency and server-only delivery ledger | Exact-head CI reported PASS; provider tests are mocked; live staging CAPTCHA/SMTP/Resend acceptance remains a gate. Open; not production deployed. |
| #42 | Prevent forged audit RPC calls while preserving education audit triggers | Staging migration and rollback-only tests reported PASS; CI reported PASS. Open; production untouched. |
| #43 | Restrict built-in role assignment and ownership/admin transitions | Staging migration and authenticated behavior tests reported PASS; CI reported PASS. Open; production untouched. |
| #44 | Prevent custom-role permission self-escalation | Staging migration and authenticated behavior tests reported PASS; CI reported PASS. Open; production untouched. |
| #45 | Prevent Education principal role escalation into Business manager permissions | Staging migration and authenticated behavior tests reported PASS; CI reported PASS. Open; production untouched. |
| #46 | Deny access to soft-deleted organizations and reject deleted-org invitations | Staging migrations and rollback-only tenant/RLS tests reported PASS; exact-head CI run #1166 reported PASS. Open; production untouched. |

These PRs are independent and are not yet a single integrated production candidate. Their staging results are useful evidence but must be rerun together after integration. The audit did not merge these PRs, deploy a Worker, modify production Supabase, change production secrets or create fake user/business/campus records.

## Phase 6 — Release acceptance gates

Do not declare MONK production-security-ready until all are true:

- [ ] All remediation PRs are reviewed and integrated into one candidate branch.
- [ ] Exact-head CI passes on the integrated candidate.
- [ ] SQL catalog tests pass for every public SECURITY DEFINER function.
- [ ] Every remaining authenticated-callable SECURITY DEFINER RPC has documented purpose, caller/tenant/permission checks and least-privilege grants.
- [ ] Two-tenant and role-boundary behavior tests pass on staging; fixtures are fully rolled back.
- [ ] Signup, email verification, login, Google OAuth, CAPTCHA, password recovery and welcome-email delivery pass with real staging identities.
- [ ] Business private document upload/download/delete passes tenant-isolation, content validation and signed-URL expiry tests.
- [ ] Production leaked-password protection is enabled and verified.
- [ ] Full repository/history secret scan and dependency vulnerability scan have recorded results.
- [ ] CSP, HSTS and other applicable response headers are verified on actual public routes and Edge Functions.
- [ ] Realtime channel authorization and session invalidation tests pass.
- [ ] Production migrations and deployment have a reviewed rollback plan and explicit release approval.
- [ ] Post-deployment, non-destructive production smoke tests pass.


## Integrated candidate verification — 28 November 2026

- Consolidated candidate: PR #48, branch `security/monk-30-point-hardening-2026-11-28`.
- Integrated head at CI verification: `bcce35c1667245750b52caccf9b39968d981d782`.
- GitHub Actions run #46148099854: **PASS** — `npm ci`, TypeScript/production build, combined release/security tests, Playwright browser E2E, Cloudflare Worker → Vercel preview verification and artifact upload.
- Staging SQL suites: **PASS** — `security_definer_review.sql`, `phase_3_security_definer_review.sql`, `audit_rpc_security.sql`, `organization_role_assignment_behavior.sql`, `role_permission_delegation_behavior.sql`, `education_principal_role_boundary_behavior.sql`, `soft_deleted_org_access_behavior.sql`, `deleted_org_invitation_acceptance_behavior.sql`, `auth_email_delivery_security.sql`, `business_private_document_storage.sql`, and `business_tenant_isolation.sql`.
- Two false-positive conditions in the SECURITY DEFINER regression script were corrected in the integration branch only: the test now allows the intentionally narrower pinned path on `education_audit_row()`, and it uses literal source checks instead of a mis-escaped regex for caller/tenant guards. No database function or privilege was weakened by this test correction.
- Post-test residue check: zero matching synthetic Auth users, organizations, invitations or memberships.
- Staging currently has zero active organizations with members, so the separate live two-real-tenant test was not run. The rollback-only synthetic two-tenant and role-boundary tests passed; real two-account acceptance remains a release gate.
- Current Security Advisor snapshot after staging validation: staging 36 authenticated SECURITY DEFINER WARN, 3 RLS/no-policy INFO; production 31 authenticated SECURITY DEFINER WARN, 3 RLS/no-policy INFO and 1 leaked-password-protection WARN.
- Production Supabase, production Worker, production DNS, Vercel production routing and production secrets remain unchanged.

PR #48 is an integration candidate, not a production release. Independent review, live provider acceptance, production password-protection enablement and approved production rollout remain outstanding.

## Explicit non-goals / safety constraints

- Do not run destructive SQL, production load tests or credential-value dumps.
- Do not blanket-revoke SECURITY DEFINER EXECUTE grants; some are required by RLS and product RPCs.
- Do not apply staging migrations blindly to production. Compare migration history and actual schema first.
- Do not deploy or change production DNS/Worker/Vercel routing as part of this audit.
- Do not fabricate successful provider acceptance, user identities, institution records or test data.
- Preserve existing MONK UI, UX, role model and business logic while applying security fixes.
