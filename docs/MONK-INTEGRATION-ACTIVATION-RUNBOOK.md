# MONK Integration Activation Runbook

This runbook records the live production state and remaining activation steps. Never commit secret values.

## 1. Supabase production

Primary project `yucwackrbekwaxiyuobt` is restored and reports `ACTIVE_HEALTHY` (PostgreSQL 17). The staging project remains inactive and is not used for production.

The existing production schema was inspected before changes. Existing organization membership, role and RLS structures were preserved. Directory, policy, source-provenance and tenant-flag migrations are present in the primary project's migration history. The current migration history is the source of truth; do not recreate duplicate timestamped migration files.

The schema has 36 regions, 24 categories, 19 official-source registry rows, national institution/programme/approval/provenance tables, policy tables and source identity mappings. No institution data has been imported.

## 2. Supabase Edge Functions

Deployed and active:
- `directory-import`: valid Supabase JWT plus `x-directory-import-token`; validates source terms and keeps new institutions unpublished/unverified.
- `policy-resolve` v2: derives active organization from authenticated membership, returns applicable published policy versions, missing keys and pending acceptances for that user/organization.
- `policy-accept`: records explicit acceptance of the exact effective policy version and SHA-256 hash. The app presents each applicable document with an explicit checkbox and blocks workspace access while required documents are missing or unaccepted.
- Existing `send-education-invitation` remains active.

Set a high-entropy `DIRECTORY_IMPORT_TOKEN` in Edge Function secrets. Never place it in frontend variables or source control.

The source registry intentionally has `terms_review_status='pending'` and `import_enabled=false`. Enable a source only after its licence, terms, allowed purpose, attribution, storage rules and update cadence are confirmed.

### Import request contract

POST `/functions/v1/directory-import` with:
- `Authorization: Bearer <valid Supabase access token>`
- `x-directory-import-token: <server-held import token>`
- JSON body: `{ "sourceKey": "...", "records": [...] }`

Each record requires a stable `sourceRecordId`, canonical name, institution kind, category key and ownership key. Batches contain 1–200 records, with a 2 MB request cap. New records remain `unverified` and `published=false` until field-level review.

## 3. Tenant feature flags and policy schedules

New organizations inherit all platform feature flags into `tenant_flags`. At present CRM, documents and projects are enabled by default; payments, location and marketplace are disabled until their provider, consent and compliance controls are ready. The `tenant_flags` trigger synchronizes enabled keys into `organizations.enabled_modules`, which the policy resolver uses. Browser roles have no direct access to `tenant_flags`. Policy rules cover CRM/customer data, documents/data processing, AI Copilot and imports, in addition to entity-type and payments/location/marketplace schedules.

## 4. National directory API

The Worker exposes public, read-only `GET /api/directory/search`, `GET /api/directory/institutions/:id` and `GET /api/policies/public?key=platform|privacy`. The detail endpoint returns only published institutions plus their published programme and approval records with source provenance. Same-origin GET requests are supported even when the browser omits the `Origin` header; cross-origin requests remain allowlisted. It uses the Supabase publishable key, not a service-role key. The Worker branch code is implemented but has not yet been deployed to production. Public `/terms` and `/privacy` pages display only currently published/effective documents; both currently show no published version.

## 5. Google Places API

Worker routes:
- `POST /api/businesses/nearby`
- `POST /api/businesses/search`

The Cloudflare Worker currently has no secret bindings. Add `GOOGLE_MAPS_API_KEY` as a Worker secret for `monk`; do not put it in `wrangler.jsonc`, Vite variables or browser code.

Google Cloud setup:
1. Enable Places API (New).
2. Enable billing.
3. Restrict the key to Places API (New).
4. Set quotas and budget alerts.
5. Add the key as a Cloudflare Worker secret.
6. Deploy and test nearby search with explicit browser permission and manual locality search.
7. Confirm required Google Maps attribution and provider data retention restrictions.

The Worker rate limit is 10 calls/minute per IP per Cloudflare location. It is approximate, not a strict global quota.

## 6. Policy documents

Policy rules and resolver/acceptance functions are live, but there are no published policy documents. The resolver correctly reports missing policy keys. Do not publish generic or invented legal text as approved.

Before onboarding acceptance is activated:
1. Have qualified India counsel review MONK's actual data flows, DPDP obligations, student/minor data and organization contracts.
2. Prepare platform Terms, Privacy Notice, education/student-data schedules, business schedules, DPA and applicable payments/location/marketplace notices.
3. Calculate SHA-256 for exact policy content and insert versions as drafts.
4. Review effective date, jurisdiction and entity conditions.
5. Publish approved immutable versions.
6. Test policy resolution for government/private college, university, coaching and business classifications.
7. Test explicit acceptance and renewal after a new version.

## 7. Release verification

- GitHub Actions run #505 passed on commit `90484c8fd66b10534381ac0bd17c7fab31a81e68`: frontend TypeScript/Vite build, Worker syntax, six Worker route regression tests and all Deno checks.
- Latest database catalog check: 34 public SECURITY DEFINER functions, of which 29 grant EXECUTE to `authenticated`, 0 to `anon`, and 5 are service/owner-only. The 29 authenticated-callable functions are not automatically vulnerabilities: many are application RPCs with membership/role checks, while helper functions expose limited boolean authorization results. Still, each function needs a documented caller/authorization contract and two-tenant adversarial test before release. All inspected SECURITY DEFINER functions use a fixed `public, extensions, pg_temp` search path.
- Supabase Security Advisor flags authenticated execution of SECURITY DEFINER functions for review and Auth leaked-password protection as disabled. Leaked-password protection is an Auth dashboard setting and was not changed by this work session.
- Performance Advisor reports unindexed foreign keys and multiple permissive RLS policies. Do not apply bulk indexes or merge policies without checking actual query patterns and preserving role-specific predicates.
- `anon` has no EXECUTE privilege on the inspected public SECURITY DEFINER functions. Tenant flags are not readable or writable by `anon` or `authenticated`.
- Worker syntax is checked in CI.
- Migrations are applied and listed in Supabase migration history.
- RLS is enabled for new directory/policy tables. Server-only tables explicitly deny client reads.
- Two-tenant adversarial tests and browser E2E are still required.
- Production Worker deployment is pending. Cloudflare preview builds are temporarily disabled; production builds remain connected to `main`.
- Production release requires Worker deployment, API secrets, verified source ingestion, legal policy publication, E2E, security review and rollback verification.
