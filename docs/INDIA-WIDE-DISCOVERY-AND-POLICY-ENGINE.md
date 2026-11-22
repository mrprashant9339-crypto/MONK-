# MONK India-wide Discovery, Local Search & Policy Engine

Status: architecture approved for implementation; production data integrations are gated on active backend credentials, source agreements and verification.

## Product scope

MONK Campus must be an India-wide institution discovery system, not a Bihar-only directory. The catalogue is open-ended and supports universities, affiliated/constituent colleges, autonomous colleges, engineering, medical/dental, nursing, pharmacy, law, commerce, management, arts/science, education, polytechnic/ITI, design, agriculture, research institutes and coaching/training providers. New categories must be data-driven, not hard-coded into a fixed list.

The public directory must not imply that a sample record is a verified real institution. Every record carries provenance and a verification state. Public cards may show concise status; detail pages expose issuing authority, source URL, source identifier, last checked date, and what exactly was verified. Unverified records can be searchable but must never receive a verified badge.

## Institution taxonomy

- Ownership: central government, state government, local body, government-aided, private, deemed, autonomous, trust/society, other.
- Institution kind: university, college, standalone institute, school/academy, coaching centre, vocational/training centre, research institute.
- Academic domains: engineering/technology, medical, dental, AYUSH, nursing, pharmacy, law, commerce, management, arts, science, education, agriculture, architecture/planning, design, polytechnic, ITI, multidisciplinary, other.
- Geography: country > state/UT > district > city/town > locality > campus.
- Course catalogue: programme, level, discipline, duration, mode, intake, admission cycle, eligibility, awarding/affiliating body.

## National source registry

Use source-specific adapters and preserve raw source snapshots/metadata. Do not scrape portals that prohibit it; prefer official downloads, published APIs, public datasets or authorized feeds.

| Domain | Primary authority / source |
|---|---|
| Broad higher-education institution universe | AISHE / Ministry of Education |
| University recognition and status | UGC |
| Engineering and technical programmes | AICTE |
| Medical colleges and seats | NMC |
| Dental colleges | DCI |
| Law colleges/programmes | Bar Council of India |
| Pharmacy | Pharmacy Council of India |
| Nursing | Indian Nursing Council and state councils |
| Teacher education | NCTE |
| Architecture | Council of Architecture |
| Agriculture | ICAR and relevant state authorities |
| Polytechnic / ITI | State technical education boards, DTEs, NCVT/SCVT |
| Coaching / private training | State/local registration and applicable consumer, fire, building and safety authorities |

AISHE is the broad starting universe, not proof of every professional approval. Approval must be represented per programme, academic year and regulator. A college can be UGC/AISHE-listed while a specific programme or intake is not approved by its professional regulator.

Initial public reference: https://dashboard.aishe.gov.in/

## Verification model

Each institution record stores:
- canonical name, aliases, category, ownership, address and coordinates;
- source authority, source URL, source record ID, source publication/update date;
- verification status: `verified`, `partially_verified`, `unverified`, `stale`, `disputed`, `closed`;
- verified fields and evidence references (name, address, ownership, affiliation, course, approval, intake);
- `last_verified_at`, `next_review_at`, reviewer or automated importer identity;
- academic year / validity window for approvals.

Verification is field-level. Example: address verified does not mean course approval verified. Stale approvals expire by academic-year rules; do not silently carry forward an old approval. Duplicate detection uses regulator IDs, AISHE code, name/address similarity and coordinates, with human review for collisions.

## Local business discovery

### User journey
1. Ask for location access only when the user chooses “Near me” or opens the nearby discovery experience. Explain the purpose before the browser permission prompt.
2. Use browser geolocation only after explicit user permission. Never request precise location on initial page load.
3. If denied/unavailable, offer manual search (locality, PIN code, city) and retain the last user-selected area only if the user opts in.
4. Let the user choose category, radius and sort order. Defaults: 5 km initial radius; expand to 10/25 km only when results are sparse and explain the expanded radius.
5. Display distance, address, open-now only when provider data supports it, phone/site when available, and map/list toggle. Clearly distinguish verified MONK business accounts from third-party place listings.

### Provider architecture
- Provider adapter interface: `searchNearby(center, radius, categories, language)`, `searchText(query, bias)`, `getPlaceDetails(providerPlaceId)`.
- Google Places API (New) is the first provider candidate for broad coverage. Nearby Search supports geographic circles, place types, field masks and distance/popularity ranking. API calls run through a server-side Worker; never expose a server key in the browser.
- Respect Places attribution, storage, display and map policies. Use field masks to control cost. Cache only fields and for durations allowed by the provider terms; do not create an unrestricted permanent mirror of Google listings.
- Keep provider IDs and MONK's own verified business accounts separate. Deduplicate across providers using provider IDs plus conservative matching.
- Add provider health, quotas, cost caps, request logging without storing raw coordinates longer than needed, and a fallback provider/empty-state.
- A Google Maps API key, enabled billing and quota limits are prerequisites. Do not ship a fake nearby-results feed if the provider is not configured.

Reference: https://developers.google.com/maps/documentation/places/web-service/nearby-search
Reference: https://developers.google.com/maps/documentation/places/web-service/usage-and-billing
India pricing: https://developers.google.com/maps/billing-and-pricing/india

## Terms, privacy and onboarding policy engine

Terms must adapt to the selected organization type, but never silently replace a user's accepted contract. Resolve the applicable policy set from server-owned organization attributes:
- vertical: education / business;
- legal entity type: government body, public university, private university, trust/society, company, partnership, sole proprietor, coaching provider, other;
- institution category and regulator where applicable;
- jurisdiction/state and enabled modules (student data, payments, messaging, location, marketplace).

Policy bundle includes platform Terms, Privacy Notice, Data Processing Addendum where applicable, education-specific student/minor-data schedule, business service schedule, payment/refund terms, marketplace/provider terms, acceptable-use rules, location permission notice and regulator-specific addenda. Only applicable documents are presented; irrelevant clauses are not shown as applicable.

Every version is immutable and stores policy key, version, effective date, jurisdiction, entity/category conditions, content hash and publication status. Acceptance records user ID, organization ID, exact policy version/hash, timestamp, method, locale and consent evidence. Material changes require renewed explicit acceptance. Keep an audit trail and provide a way to download the accepted versions. Do not treat clicking “Create workspace” as blanket consent to optional location, marketing or third-party data processing.

The policy engine is configuration-driven, server-evaluated and versioned. The client may display the decision but may not choose or override the governing policy. Legal review is required before production activation; MONK must not claim that an automatically generated policy guarantees legal compliance.

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
- `discovery.provider_places` (provider ID, permitted metadata only, TTL/refresh metadata)
- `discovery.search_audit` (coarse category, request outcome and cost; avoid persistent exact coordinates)
- `discovery.user_saved_places` (only explicit user-saved items)

Policy:
- `policy.policy_documents`
- `policy.policy_rules`
- `policy.policy_acceptances`
- `policy.organization_policy_state`

Tenant-owned records remain in tenant-scoped tables. Public directory tables must not contain private student records. Every exposed schema requires RLS; use server-owned organization membership and role records for authorization, never client-editable user metadata. Views exposed to clients must use `security_invoker = true` where supported. Keep provider API secrets in Worker secrets, not Vite variables.

## Acceptance criteria

1. Search covers all supported Indian states/UTs and categories; filters are data-driven.
2. No fake or fabricated institute/business listing is presented as verified.
3. Every institution approval is regulator-, programme- and academic-year-specific.
4. Nearby search works only after permission or manual location selection; denial has a useful fallback.
5. Third-party listings are visibly distinguished from MONK-claimed/verified businesses.
6. No Google server key appears in client bundles or source control.
7. Provider attribution, caching, map display, billing and quotas are compliant.
8. Organization type changes applicable policy bundle on the server; every acceptance is versioned and auditable.
9. Material policy updates request renewed acceptance; optional consents remain separate.
10. Two organizations of different types cannot access one another's private records.
11. Import jobs are idempotent, observable, retryable and preserve source snapshots.
12. Public launch requires data-source review, legal review, active Supabase project, RLS audit and browser E2E tests.

## Delivery phases

- P0 — unblock infrastructure: restore/activate intended Supabase project, confirm production secrets, choose Maps provider project and billing caps.
- P1 — directory foundation: taxonomy, source registry, import pipeline, verification/provenance schema, India-wide filters and search.
- P2 — local discovery: permission UX, manual fallback, Places adapter, Worker proxy, map/list UI, quota and privacy controls.
- P3 — policy engine: entity classification, policy bundles, immutable versions, acceptance workflow and audit trail.
- P4 — hardening: import reconciliation, duplicate review, RLS and cross-tenant tests, accessibility, performance and production smoke tests.

## Current blockers

At the time this plan was written, both connected Supabase projects (`yucwackrbekwaxiyuobt` and `ysspnuldfiijagagwiqk`) reported `INACTIVE`. Database migrations, RLS changes and live directory ingestion must wait until the correct project is active. Google Places credentials/billing configuration were not available in repository inspection; nearby search cannot be honestly marked live until configured and tested.
