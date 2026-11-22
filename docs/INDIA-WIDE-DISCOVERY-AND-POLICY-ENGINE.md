# MONK India-wide Discovery, Local Search & Policy Engine

Status: architecture approved; production data ingestion and integrations are gated on active backend credentials, source access/terms and verification.

## Product scope

MONK Campus is an India-wide institution discovery system, not a Bihar-only directory. It supports universities, affiliated/constituent/autonomous colleges, engineering, medical/dental, AYUSH, nursing, pharmacy, law, commerce, management, arts/science, education, polytechnic/ITI, design, agriculture, research institutes and coaching/training providers. Categories are data-driven and extensible.

The public directory must never imply that an illustrative record is a verified real institution. Every record carries provenance and a verification state. Detail pages expose issuing authority, source URL, source identifier, last checked date, academic year and exactly which fields were verified.

## Institution taxonomy

- Ownership: central government, state government, local body, government-aided, private, deemed, autonomous, trust/society, other.
- Institution kind: university, college, standalone institute, academy, coaching centre, vocational/training centre, research institute.
- Academic domains: engineering/technology, medical, dental, AYUSH, nursing, pharmacy, law, commerce, management, arts, science, education, agriculture, architecture/planning, design, polytechnic, ITI, multidisciplinary, other.
- Geography: India > state/UT > district > city/town > locality > campus.
- Course catalogue: programme, level, discipline, duration, mode, intake, admission cycle, eligibility, awarding/affiliating body.

A controlled vocabulary for all 36 states/UTs, categories, ownership types, verification states, regulator IDs and organization policy classifications is implemented in `src/data/india-directory.ts`. This is taxonomy metadata, not the national institution dataset.

## National source registry

Use source-specific adapters and preserve raw source snapshots/metadata. Do not scrape portals that prohibit it; prefer official downloads, published APIs, public datasets or authorized feeds. Before ingesting, record source licence/terms, update cadence, export format, attribution and allowed storage.

| Domain | Primary authority | Official source |
|---|---|---|
| Broad higher-education universe | AISHE / Ministry of Education | https://dashboard.aishe.gov.in/ |
| AISHE data and user guidance | AISHE | https://aishe.gov.in/guidelines-for-data-user/ |
| University status, recognition and fake-university notices | UGC | https://www.ugc.gov.in/universitydetails/ |
| Technical education / AICTE approval | AICTE | https://www.aicte-india.org/ |
| Medical colleges, courses, seats and recognition | NMC | https://www.nmc.org.in/information-desk/college-and-course-search/ |
| Dental education | Dental Council of India | https://dciindia.gov.in/ |
| Law education | Bar Council of India | https://www.barcouncilofindia.org/ |
| Pharmacy institutions and approved intake | Pharmacy Council of India | https://www.pci.nic.in/ |
| Nursing institutions by academic year/state | Indian Nursing Council | https://online.indiannursingcouncil.org/Reports/YearlyReportByState.aspx |
| Teacher education | NCTE | https://web.ncte.gov.in/page/recognized-institutions |
| Architecture | Council of Architecture | https://www.coa.gov.in/ |
| Agriculture and agricultural education | ICAR | https://icar.org.in/ |
| Indian systems of medicine (Ayurveda, Siddha, Unani, Sowa-Rigpa) | NCISM | https://ncism.org.in/ |
| Homoeopathy | NCH | https://nch.org.in/mqrl |
| Veterinary education | Veterinary Council of India | https://vci.admissions.nic.in/institutes/ |
| Rehabilitation and special education | RCI | https://rehabcouncil.nic.in/regular-mode-inst/ |
| Allied and healthcare professions | NCAHP / Ministry of Health and Family Welfare | https://www.mohfw.gov.in/sites/default/files/Public%20notice%20by%20NCAHP-signed.pdf |
| Vocational education and training | NCVET | https://ncvet.gov.in/ |
| ITI / vocational training | DGT / NCVT and state SCVT authorities | https://www.ncvtmis.gov.in/ |
| Polytechnic / state technical education | State DTEs and technical boards | State-specific official portals |
| Coaching / private training | Applicable state/local registration authorities | State-specific; no single national approval registry assumed |

AISHE is a broad starting universe, not proof of every professional approval. UGC status, institutional affiliation and regulator permission are separate facts. Approval must be represented per programme, academic year, campus/location and regulator. A college can be present in AISHE while a specific course or intake is not approved by its professional regulator.

## Verification model

Each institution stores:
- canonical name, aliases, category, ownership, address and coordinates;
- source authority, source URL, source record ID, source publication/update date and licence/terms note;
- verification state: `verified`, `partially_verified`, `unverified`, `stale`, `disputed`, `closed`;
- verified fields and evidence references (name, address, ownership, affiliation, course, approval, intake);
- `last_verified_at`, `next_review_at`, reviewer or importer identity;
- academic year / validity window for approvals.

Verification is field-level: a verified address does not mean a verified course approval. Stale approvals expire by academic-year rules; do not silently carry forward an old approval. Duplicate detection uses regulator IDs, AISHE code, name/address similarity and coordinates, with human review for collisions. Do not claim a complete national institution count until source coverage, date and category inclusion have been reconciled.

## Local business discovery

### User journey
1. Ask for location access only after the user chooses “Near me”. Explain the purpose before the browser permission prompt.
2. Use browser geolocation only after explicit user permission. Never request precise location on initial page load.
3. If denied/unavailable, offer manual search (locality, PIN code, city); save the selected area only if the user opts in.
4. Let the user choose category, radius and sort order. Start at 5 km; expand to 10/25 km only when results are sparse and explain the expanded radius.
5. Display distance, address, open-now only when provider data supports it, phone/site when available, and map/list toggle. Distinguish MONK-verified accounts from third-party place listings.

### Provider architecture
- Adapter interface: `searchNearby(center, radius, categories, language)`, `searchText(query, bias)`, `getPlaceDetails(providerPlaceId)`.
- Google Places API (New) is the first provider candidate. Nearby Search supports geographic circles, place types and field masks. Calls run through a server-side Worker; never expose a server key in browser code.
- Respect attribution, storage, display and map policies. Use field masks to control cost. Do not scrape, bulk-export or permanently mirror restricted Google Maps content. Place IDs may be stored as allowed by Google's terms; apply permitted temporary caching only to eligible fields.
- Keep provider IDs and MONK-owned business accounts separate. Deduplicate across providers conservatively.
- Add quotas, spend alerts, rate limits, provider health, request logging without retaining exact coordinates unnecessarily, and a truthful fallback when provider credentials are missing.
- Google Maps Platform requires billing and an API credential; pricing is usage/SKU-based. Set daily/monthly budgets and quotas before launch.

References:
- https://developers.google.com/maps/documentation/places/web-service/nearby-search
- https://developers.google.com/maps/documentation/places/web-service/policies
- https://developers.google.com/maps/documentation/places/web-service/usage-and-billing
- https://developers.google.com/maps/billing-and-pricing/india

## Terms, privacy and onboarding policy engine

Resolve applicable policy bundles server-side from trusted organization attributes:
- vertical: education / business;
- legal entity: government body, public university, private university, trust/society, company, partnership, sole proprietor, coaching provider, other;
- institution category and applicable regulator;
- jurisdiction/state and enabled modules (student/minor data, payments, messaging, location, marketplace).

Policy bundle may include platform Terms, Privacy Notice, Data Processing Addendum, education/student-data schedule, business service schedule, payments/refunds, marketplace/provider terms, acceptable use, location notice and regulator-specific addenda. Present only applicable documents.

Every version is immutable and stores policy key, version, effective date, jurisdiction, entity/category conditions, content hash and publication status. Acceptance stores user ID, organization ID, exact policy version/hash, timestamp, method, locale and evidence. Material changes require renewed explicit acceptance. Optional location and marketing consent remain separate. A user cannot select or override the governing policy using a client query parameter or editable profile field.

### India privacy-law implementation note

The Digital Personal Data Protection Act, 2023 and DPDP Rules, 2025 have a notified, phased commencement schedule. The Gazette commencement notification and Rules must be tracked by provision and effective date rather than assuming every obligation commenced on the publication date. Build a compliance register with provision, commencement date, owner, evidence and review date. Counsel must review MONK's actual data flows, student/minor handling, institutional controller/processor roles, notices, consent, retention, rights handling, breach response and contracts before production launch. Do not claim that automated policy selection alone guarantees legal compliance.

Official references:
- Gazette Rules: https://egazette.gov.in/WriteReadData/2025/267650.pdf
- Gazette commencement notification: https://egazette.gov.in/WriteReadData/2025/267649.pdf
- PIB notification summary: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190655&lang=1&reg=3

## Suggested database boundaries

Public/reference data:
- `directory.institutions`
- `directory.programmes`
- `directory.approvals`
- `directory.source_registry`
- `directory.source_snapshots`
- `directory.verification_events`
- `directory.campuses`

Location provider data:
- `discovery.provider_places` (provider ID and only permitted metadata)
- `discovery.search_audit` (coarse category, request outcome and cost; avoid persistent exact coordinates)
- `discovery.user_saved_places` (only explicit user-saved items)

Policy:
- `policy.policy_documents`
- `policy.policy_rules`
- `policy.policy_acceptances`
- `policy.organization_policy_state`

Tenant-owned records remain tenant-scoped. Public directory data must not contain private student records. Every exposed schema requires RLS; authorization uses server-owned organization membership and role records, never client-editable user metadata. Exposed views use `security_invoker = true` where supported. Provider API secrets live in Worker secrets, never Vite variables.

## Acceptance criteria

1. Search covers all supported Indian states/UTs and categories; filters are data-driven.
2. No fabricated listing is represented as verified.
3. Every approval is regulator-, programme-, campus- and academic-year-specific.
4. Nearby search works only after permission or manual location selection; denial has a useful fallback.
5. Third-party listings are distinguished from MONK-verified businesses.
6. No server key appears in client bundles or source control.
7. Provider attribution, caching, map display, billing and quotas comply with current provider terms.
8. Organization type changes applicable policy bundle on the server; every acceptance is versioned and auditable.
9. Material policy updates request renewed acceptance; optional consents remain separate.
10. Two organizations cannot access one another's private records.
11. Import jobs are idempotent, observable, retryable and preserve source provenance.
12. Launch requires data-source review, legal review, active backend, RLS audit and browser E2E tests.

## Delivery phases (22 levels)

1. Codebase/deployment audit.
2. National taxonomy.
3. Official source registry and source terms.
4. Normalized national directory schema.
5. Idempotent ingestion pipelines.
6. Field-level verification and approval validity.
7. Directory search and filters.
8. Courses, programmes and admission metadata.
9. Duplicate/stale/disputed record workflows.
10. Consent-first geolocation and manual fallback.
11. Server-side Places provider adapter.
12. Map/list, radius and distance experience.
13. Third-party versus MONK business verification.
14. Organization classification.
15. Server-resolved policy engine.
16. Versioned policy acceptance and audit.
17. Authentication and organization onboarding.
18. Role-based permissions.
19. RLS and cross-tenant security testing.
20. Integrations, quotas, monitoring and retries.
21. Full QA, accessibility and security review.
22. Production release, smoke tests and rollback readiness.

## Current implementation status

- Existing public home, Campus and Business pages exist. The current Campus directory UI is still a small Bihar polytechnic preview; it is not an India-wide verified directory.
- The current Business page has fictional sample metrics/transactions; it is not a live Places integration. Keep honest provenance and sample-data disclosures until replaced with real data.
- The 36-state/UT taxonomy, institution categories, ownership types, verification states, regulator registry and policy organization classifications are implemented in `src/data/india-directory.ts`.
- National institution import, Places integration, policy database/workflows, full campus roles and production RLS audit remain unimplemented.
- Both connected Supabase projects (`yucwackrbekwaxiyuobt` and `ysspnuldfiijagagwiqk`) reported `INACTIVE` on 2026-11-22. Database migrations, RLS changes and live imports cannot run until the correct project is restored.
- Google Places credentials and billing configuration were not available in inspected repository files; nearby search cannot be called live until configured and tested.
- The PR CI run for the architecture/taxonomy commit completed successfully: build and type-check steps passed. This is not a production release.
