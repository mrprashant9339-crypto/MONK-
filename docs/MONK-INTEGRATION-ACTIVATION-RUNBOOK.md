# MONK Integration Activation Runbook

This runbook activates the repository implementation after the required account-level dependencies are available. Do not commit secret values.

## 1. Supabase project

The intended primary candidate is `yucwackrbekwaxiyuobt`; staging is `ysspnuldfiijagagwiqk`. Both reported `INACTIVE` on 2026-11-22.

Before applying migrations:
1. Confirm which project is the production database.
2. Restore it after the owner approves any resumed compute charges.
3. Wait for `ACTIVE_HEALTHY`.
4. Inspect existing `organizations`, membership/RLS policies and RPC definitions.
5. Apply migrations in timestamp order from `supabase/migrations/`.
6. Run schema, RLS and cross-tenant tests before deploying functions.

## 2. Supabase Edge Functions

Functions in this branch:
- `directory-import`: internal source ingestion. Requires a valid Supabase JWT plus `x-directory-import-token`.
- `policy-resolve`: derives the active organization through `current_organization_id()`, reads trusted organization attributes and resolves active policy rules.
- `policy-accept`: stores explicit acceptance for the exact published policy version and SHA-256 content hash.

Supabase provides the standard `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` runtime values. Set a high-entropy `DIRECTORY_IMPORT_TOKEN` in Edge Function secrets. Never place it in frontend environment variables.

The source registry is deliberately seeded with `terms_review_status='pending'` and `import_enabled=false`. Enable a source only after confirming its official licence, terms, allowed purpose, attribution and storage rules.

### Import request contract

POST `/functions/v1/directory-import` with:
- `Authorization: Bearer <valid Supabase access token>`
- `x-directory-import-token: <server-held import token>`
- JSON body: `{ "sourceKey": "...", "records": [...] }`

Each record must have a stable `sourceRecordId`, canonical name, institution kind, category key and ownership key. Optional source fields include state code, district, city, address, AISHE code, identifiers and source update date. Batch size is 1–200 records and request body size is capped at 2 MB.

Imported institutions remain `unverified` and `published=false`. A separate reviewer process must inspect evidence, verify fields and publish a record. Re-imports use the stable source identity map and content hash to avoid duplicate records.

## 3. National directory API

The Worker exposes public, read-only `GET /api/directory/search`. It queries only `published=true` records through the Supabase publishable key and returns public source provenance. The Worker uses `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from `wrangler.jsonc`; the publishable key is not a service-role secret. RLS remains the security boundary. No directory record is returned until an authorized importer/reviewer publishes it.

## 4. Google Places API

The Worker routes:
- `POST /api/businesses/nearby`
- `POST /api/businesses/search`

Add `GOOGLE_MAPS_API_KEY` as a Cloudflare Worker secret for Worker `monk`. Do not put it in `wrangler.jsonc`, Vite variables, GitHub source or browser code.

Google Cloud configuration:
1. Enable Places API (New).
2. Enable billing.
3. Restrict the key to Places API (New); use provider-side quota limits and budget alerts.
4. Set the key as the Cloudflare Worker secret.
5. Deploy the branch to a preview/staging Worker first.
6. Test nearby search with a real browser permission grant and manual text search.
7. Confirm Google Maps attribution is visible and provider data is not stored or cached beyond permitted exceptions.

The Worker applies a 10-request-per-minute approximate per-IP rate limit per Cloudflare location. Provider-side quotas and billing limits are still required; this Worker limit is not a global strict quota.

## 5. Policy document publication

Policy rules are seeded, but no legal policy text is auto-published. Before activating onboarding acceptance:
1. Have qualified India counsel review MONK's actual data flows and entity-specific contracts.
2. Prepare platform Terms and Privacy Notice, education/student data schedules, business schedules, DPA, payments and location notices as applicable.
3. Calculate SHA-256 over the exact policy content and insert each version as `draft`.
4. Review effective date, jurisdiction and entity conditions.
5. Publish the approved immutable version.
6. Test `policy-resolve` for government college, private college, university, coaching and business classifications.
7. Test acceptance and renewal when a new version is published.

The resolver reports missing policy keys. It must not silently accept missing documents or treat automated policy selection as a legal-compliance guarantee.

## 6. Release and verification

- Run `npm run build`.
- Run `node --check worker/index.js`.
- Run `deno check` for each Edge Function.
- Apply migrations to a non-production project first.
- Verify public directory read policies and tenant RLS using two independent organizations.
- Verify no Google API key is present in client assets.
- Verify location is requested only after an explicit click.
- Verify manual locality search works when geolocation is denied.
- Verify source provenance and policy acceptance records.
- Deploy to staging, run desktop/Android E2E, then approve production release.
