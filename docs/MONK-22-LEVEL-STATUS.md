# MONK 22-Level Delivery Status

Updated: 2026-11-22

This tracker separates repository implementation from production activation. A feature is not complete merely because source code exists.

| Level | Workstream | Repository status | Production status | Gate |
|---:|---|---|---|---|
| 1 | Codebase, CI and deployment audit | Complete for inspected repository and latest known deployment | Latest prior Worker deployment was 100% traffic; this feature branch is not deployed | Browser smoke test still required |
| 2 | National taxonomy | Implemented 36 state/UT codes, 21 institution categories, ownership and verification enums | Not yet applied to database | Migration |
| 3 | Official source registry | Official regulator/source registry seeded in migration and source URLs documented | Source entries start with import disabled and terms review pending | Review each source's licence, terms and update cadence |
| 4 | National directory schema | Additive schema migrations drafted for institutions, programmes, approvals, sources and campuses/source identity | Not applied; Supabase projects inactive | Restore correct project and inspect existing schema |
| 5 | National ingestion | Guarded batch Edge Function created; idempotent source IDs and snapshots | Not deployed; source imports disabled by default | Active Supabase, importer secret, source permission and approved source |
| 6 | Verification and approval engine | Field-level status, approval-year fields, append-only verification evidence and unpublished import defaults | Not applied or populated | Human/regulator evidence review |
| 7 | Directory search | Existing UI still needs replacement by the live national database query | Not live | Directory API and search UI |
| 8 | Courses and admissions | Programme/approval schema drafted | No real programme dataset imported | Regulator/year-specific data import |
| 9 | Duplicate/stale records | Source identity map and verification state fields drafted | No reconciliation UI or review queue deployed | Import data and reviewer workflow |
| 10 | Consent-first location | “Use my location” button requests geolocation only after click; manual locality search fallback built | Not deployed | Browser E2E |
| 11 | Nearby provider API | Worker API for Places Nearby/Text Search, field masks, origin allowlist and rate limit config added | Not deployed; Google API key is not configured | Google Places API key, billing and quotas |
| 12 | Map/list and distance | Result list, distance labels and Google Maps deep links built | No embedded map view | Map display integration and attribution review |
| 13 | Business verification | UI labels third-party Google Places results separately from MONK workspace data | Verification workflow not built | Claim/ownership verification process |
| 14 | Organization classification | Onboarding fields for entity type, institution category and state added; secure RPC migration drafted | Not live until migration applied | Restore DB and E2E onboarding |
| 15 | Adaptive policy engine | Server-side policy resolver and rule seed migration drafted | No legal policy documents published | Legal review and policy publication |
| 16 | Policy acceptance | Explicit version/hash acceptance endpoint and append-only acceptance audit drafted | Not deployed | Active DB, published documents, acceptance E2E |
| 17 | Authentication/onboarding | Existing Supabase Auth retained; organization classification integrated into new workspace setup | Supabase currently inactive | Restore and verify email/signup flow |
| 18 | Role-based permissions | Existing role workflows only partially present | Full RBAC not audited | Inspect existing membership schema and policies |
| 19 | RLS and tenant isolation | New public/private table RLS policies drafted | Not applied or tested | Two-tenant security tests |
| 20 | Integrations/operations | Worker logs/traces and approximate per-IP rate limit config added; importer has bounded batches and errors | No provider secret; no live quota/usage test | Deploy and monitor |
| 21 | QA/security | Frontend build passed on an earlier PR commit; CI expanded to check Worker syntax and Deno Edge Functions | Latest changes not yet confirmed by CI; no browser E2E | Latest CI and mobile browser tests |
| 22 | Production release | Deployment plan and release gates documented | Not released | All above gates green, secrets configured and rollback verified |

## Production blockers

1. Both connected Supabase projects reported `INACTIVE` on 2026-11-22:
   - `yucwackrbekwaxiyuobt` (primary candidate)
   - `ysspnuldfiijagagwiqk` (staging)
   Database migrations and Edge Function deployment cannot run until the correct project is restored. Restoring may resume billable compute; obtain explicit approval first.
2. Cloudflare Worker `monk` currently has no secret bindings. The Places API implementation requires `GOOGLE_MAPS_API_KEY` to be added as a Worker secret; no key is stored in source control or sent to the browser.
3. Google Places requires an enabled billing account, Places API (New), usage quotas and budget alerts. Search responses are not cached or copied into MONK's permanent business database.
4. Source registry rows are intentionally disabled until each official source's usage terms and import permissions are reviewed. No national institution data has been bulk-imported yet.
5. Policy documents are intentionally not auto-published. India-specific Terms, Privacy Notice, DPDP implementation and entity-specific schedules need legal review and versioned publication.
6. The existing Bihar sample directory and fictional business activity cards remain visibly identified as illustrative content until replaced with live verified records. They must not be disguised as real records.

## Branch

Feature branch: `feat/india-wide-discovery-and-policy-engine`

Draft pull request: https://github.com/mrprashant9339-crypto/MONK-/pull/20
