# MONK 22-Level Delivery Status

Updated: 2026-11-22

This tracker separates code, backend activation and production release. A feature is not complete merely because source code exists.

| Level | Workstream | Current status | Remaining gate |
|---:|---|---|---|
| 1 | Codebase/deployment audit | Complete for inspected repository, Supabase project and Worker configuration | Full browser smoke test |
| 2 | National taxonomy | 36 states/UTs and 24 institution categories seeded in production database | Expand taxonomy only when needed |
| 3 | Official source registry | 19 official-source records seeded; all remain import-disabled | Review licence, terms, attribution and cadence source by source |
| 4 | National directory schema | Production migrations applied; institution, programme, approval, source and provenance tables live | Schema/API smoke tests |
| 5 | National ingestion | Directory import Edge Function deployed and active | Set DIRECTORY_IMPORT_TOKEN; approve source terms; import source datasets |
| 6 | Verification/approval model | Verification states, academic-year approval records and append-only evidence tables live | Reviewer UI and source-backed verification |
| 7 | National directory search | UI and Worker API implemented; backend schema live | Deploy Worker from main and import/publish verified records |
| 8 | Courses and admissions | Programme/approval schema live | Import regulator/year-specific programme and intake records; complete UI |
| 9 | Duplicate/stale/disputed workflow | Stable source identity map and unique indexes live | Build reviewer queue and collision-resolution UI |
| 10 | Consent-first location | Explicit location button and manual locality search implemented | Browser E2E |
| 11 | Nearby provider API | Worker Places endpoints and rate-limit configuration implemented | Deploy Worker; configure GOOGLE_MAPS_API_KEY, billing and quotas |
| 12 | Map/list and distance | Distance list, map links and Google attribution implemented | Embedded map/list toggle and real provider E2E |
| 13 | Business verification | Third-party listings are kept distinct from MONK accounts | Build business claim and verification workflow |
| 14 | Organization classification | Production columns/RPC live; RPC restricted to owner/admin/principal | Authenticated onboarding E2E |
| 15 | Adaptive policy engine | Rules and policy resolver Edge Function deployed | Legally reviewed policy documents must be drafted and published |
| 16 | Policy acceptance | Version/hash acceptance Edge Function deployed; append-only audit live | Publish approved documents, then test acceptance/renewal |
| 17 | Authentication/onboarding | Existing Supabase Auth retained; classification fields integrated in code | End-to-end signup and email verification |
| 18 | Role-based permissions | Existing organization roles inspected; classification RPC now role-gated | Full RBAC workflow audit |
| 19 | RLS and tenant isolation | Directory/policy RLS applied; server-only tables explicitly deny client reads | Run two-tenant adversarial tests |
| 20 | Integrations/operations | Worker config has logs/traces and rate-limit binding; Cloudflare preview builds disabled to avoid failed preview deployment | Deploy production Worker; configure API secrets/quotas |
| 21 | QA/security | Frontend build and Deno checks passed on previous head after CI fix | Latest head CI run must finish; browser E2E and security review |
| 22 | Production release | Not released | Worker deploy, live data, legal docs, secrets, E2E and rollback verification |

## Production state

- Primary Supabase project: `yucwackrbekwaxiyuobt`, now `ACTIVE_HEALTHY`.
- Nine directory/policy migrations plus one hardening migration have been applied to the primary project.
- Deployed and active Edge Functions: `directory-import`, `policy-resolve`, `policy-accept`; existing `send-education-invitation` remains active.
- Production database contains 36 regions, 24 categories and 19 source-registry entries. It contains no institution listings yet. This is deliberate: no unverified record is represented as real.
- All source registry entries remain import-disabled until terms/licence and allowed use are reviewed.
- Directory import requires a server-side `DIRECTORY_IMPORT_TOKEN`, which is not configured yet.
- Cloudflare Worker `monk` has no secret bindings. `GOOGLE_MAPS_API_KEY`, Google billing, API restrictions and quotas are required before nearby search can return provider results.
- Policy rules exist, but no policy document is published. Legal review and publication are required before onboarding can require policy acceptance.
- Existing database security advisor still reports warnings for the pre-existing SECURITY DEFINER RPC surface and disabled leaked-password protection. The new classification RPC checks owner/admin/principal server-side; do not treat the remaining warnings as resolved.
- Worker production deployment is still the previous version. PR #20 is not merged or deployed.

## Branch and pull request

Feature branch: `feat/india-wide-discovery-and-policy-engine`

Pull request: https://github.com/mrprashant9339-crypto/MONK-/pull/20
