# MONK Integration Activation Runbook

This runbook records the live production state and remaining activation steps. Never commit secret values.

## 1. Supabase production

Primary project `yucwackrbekwaxiyuobt` is restored and reports `ACTIVE_HEALTHY`. The staging project remains inactive and is not used for production.

The existing production schema was inspected before changes. Existing organization membership, role and RLS structures were preserved. The following migrations have been applied to the primary project in order:

- `india_directory_discovery_policy`
- `directory_provenance_read_policies`
- `directory_source_identity_map`
- `organization_classification_policy_rules`
- `policy_and_verification_immutability`
- `validate_organization_classification`
- `institution_primary_source`
- `unique_source_identity`
- `expand_india_regulator_registry`
- `restrict_classification_to_admins_and_deny_server_tables`

The schema now has 36 regions, 24 categories, 19 official-source registry rows, national institution/programme/approval/provenance tables, policy tables and source identity mappings. No institution data has been imported.

## 2. Supabase Edge Functions

Deployed and active:
- `directory-import`: valid Supabase JWT plus `x-directory-import-token`; validates source terms and keeps new institutions unpublished/unverified.
- `policy-resolve`: derives active organization from authenticated membership and returns applicable, published policy versions plus missing keys.
- `policy-accept`: records explicit acceptance of the exact effective policy version and SHA-256 hash.
- Existing `send-education-invitation` remains active.

Supabase provides standard runtime values `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Set a high-entropy `DIRECTORY_IMPORT_TOKEN` in Edge Function secrets. Never place it in frontend variables or source control.

The source registry intentionally has `terms_review_status='pending'` and `import_enabled=false`. Enable a source only after its licence, terms, allowed purpose, attribution, storage rules and update cadence are confirmed.

### Import request contract

POST `/functions/v1/directory-import` with:
- `Authorization: Bearer <valid Supabase access token>`
- `x-directory-import-token: <server-held import token>`
- JSON body: `{ "sourceKey": "...", "records": [...] }`

Each record requires a stable `sourceRecordId`, canonical name, institution kind, category key and ownership key. Batches contain 1–200 records, with a 2 MB request cap. New records remain `unverified` and `published=false` until field-level review.

## 3. National directory API

The Worker exposes public, read-only `GET /api/directory/search`. It returns only `published=true` records and public source provenance. It uses the Supabase publishable key, not a service-role key. The Worker branch code is implemented but has not yet been deployed to production.

## 4. Google Places API

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

## 5. Policy documents

Policy rules and resolver/acceptance functions are live, but there are no published policy documents. The resolver correctly reports missing policy keys. Do not publish generic or invented legal text as approved.

Before onboarding acceptance is activated:
1. Have qualified India counsel review MONK's actual data flows, DPDP obligations, student/minor data and organization contracts.
2. Prepare platform Terms, Privacy Notice, education/student-data schedules, business schedules, DPA and applicable payments/location/marketplace notices.
3. Calculate SHA-256 for exact policy content and insert versions as drafts.
4. Review effective date, jurisdiction and entity conditions.
5. Publish approved immutable versions.
6. Test policy resolution for government/private college, university, coaching and business classifications.
7. Test explicit acceptance and renewal after a new version.

## 6. Release verification

- Frontend build and Deno checks passed on the previous CI head after fixing Deno npm module resolution; latest head CI is pending.
- Worker syntax is checked in CI.
- Migrations are applied and listed in Supabase migration history.
- RLS is enabled for new directory/policy tables. Server-only tables explicitly deny client reads.
- Two-tenant adversarial tests and browser E2E are still required.
- Production Worker deployment is pending. Cloudflare preview builds are temporarily disabled; production builds remain connected to `main`.
- Production release requires Worker deployment, API secrets, verified source ingestion, legal policy publication, E2E, security review and rollback verification.
