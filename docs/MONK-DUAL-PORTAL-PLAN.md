# MONK Dual-Portal Product and Release Plan

## Product entry model
MONK has one public website and two distinct product journeys. The root route is public and does not require authentication. Visitors choose Campus or Business, explore product information and public discovery, and authenticate only when they create or enter a private workspace.

## Journey A — MONK Campus and India-wide Institution Discovery
- Scope: all Indian states and union territories; no 46-institute or Bihar-only cap.
- Institution universe: universities, affiliated/constituent/autonomous colleges, engineering, medical, dental, AYUSH, nursing, pharmacy, law, commerce, management, arts/science, education, agriculture, architecture, design, polytechnic, ITI, research, coaching and vocational/training providers.
- Data model: regulator-specific programme approvals, academic-year validity, ownership, geography, courses, admissions, source provenance and field-level verification.
- Primary source registry: AISHE / Ministry of Education, UGC, AICTE, NMC, DCI, BCI, PCI, INC, NCTE, Council of Architecture, ICAR and state technical education / DTE / NCVT / SCVT authorities.
- Roles: platform admin, institution admin/principal, HOD, faculty, student, office staff and optional guardian.
- Core modules: institution profile, departments/branches, courses/semesters, notices, timetable, attendance, assignments, assessments/results, documents and analytics.
- Directory integrity: source URL, source record ID, last checked date and per-field verification state are available on the listing detail. Never mark a record verified without evidence; stale or disputed approvals are not represented as current.
- Reference: https://dashboard.aishe.gov.in/

## Journey B — MONK Business and Local Discovery
- Customer types: local shop, service provider, startup and small/medium team.
- Roles: owner/admin, manager, sales, accounts, operations and staff.
- Core modules: CRM, leads/enquiries, products, inventory, suppliers, orders, bookings/service jobs, invoices, payments, team tasks and analytics.
- Nearby discovery: ask for browser location only after the user explicitly selects “Near me”; permission denial falls back to locality/PIN/city search. Start at 5 km, expand to 10/25 km only when needed, and distinguish third-party Places listings from MONK-verified business accounts.
- Provider architecture: server-side Google Places API (New) adapter candidate, with field masks, attribution, billing caps, policy-compliant caching and provider IDs. No API key in browser code. Do not show fabricated nearby businesses when provider credentials are absent.
- References: https://developers.google.com/maps/documentation/places/web-service/nearby-search and https://developers.google.com/maps/documentation/places/web-service/usage-and-billing

## Organization-specific terms and onboarding
- Resolve applicable policy bundle server-side from organization vertical, legal entity type, institution category, regulator, state/jurisdiction and enabled modules.
- Separate bundles may include platform terms, privacy notice, data-processing addendum, education/student-data schedule, business service schedule, payments/refunds, marketplace/provider terms, acceptable use and location notice.
- Policy documents are immutable and versioned. Acceptance stores user, organization, exact version/hash, timestamp, locale and method.
- Material changes require renewed explicit acceptance. Optional location and marketing consents remain separate.
- Client query parameters and user-editable metadata cannot choose the governing policy or authorize access. Legal review is required before production activation; automated selection is not a guarantee of legal compliance.

## Authentication and tenancy
- Public discovery remains accessible without login.
- Login/signup uses Supabase Auth; selected vertical is saved to the organization record.
- All organization-owned data is protected by server-side checks and Supabase RLS.
- Roles and permissions are validated from trusted membership records, not client-editable user metadata.
- Public directory/provider data is separate from private student, employee, customer and transaction records.
- Add invitation, email verification, password reset, session expiry, account recovery and cross-tenant tests before general release.

## Brand and interaction system
- Palette: 55% warm white, 20% near-black, 15% pink, 10% warm yellow.
- M monogram: compact icon and animated stroke/reveal.
- Motion: subtle logo draw, slow orbit/glow, floating product preview, scroll reveal and hover feedback.
- Respect prefers-reduced-motion; keep mobile performance and keyboard navigation usable.
- Avoid heavy WebGL/3D on the public entry page.

## Release gates
1. TypeScript and Vite production build succeeds.
2. CI runs on pull requests and reports green checks.
3. Cloudflare deploy workflow completes from main and deployment matches expected commit/build.
4. Public routes load on desktop and Android mobile.
5. Location permission, denial and manual-location fallback are tested.
6. Directory imports are idempotent, source-attributed and field-verified.
7. Supabase RLS and cross-tenant isolation are tested with at least two organizations.
8. Policy resolution and versioned acceptance are tested across government/private/coaching/business entity types.
9. No sample record is represented as a real institution, customer, business or transaction.
10. Accessibility, reduced-motion, performance, provider cost caps, error states and 404/fallback behavior are checked.

## Current implementation status (2026-11-22)
- Public root purpose chooser, Campus page, Business page and animated brand system exist in the repository.
- The Bihar-only static college sample has been removed. Campus now exposes a national search interface across 36 states/UTs and 24 institution categories. It returns only published directory records from the Worker API; the actual national dataset is not yet imported.
- National institution/programme/approval/source/verification schema migrations and a guarded, idempotent import Edge Function are written but not applied/deployed.
- Business page has a consent-first nearby search UI and manual locality/city/PIN search. A Worker Places Nearby/Text Search API, field masks, per-IP rate limiting and Google Maps attribution are implemented in the branch but not deployed.
- Organization type, academic category and state are collected during onboarding. Server-side classification RPC, adaptive policy resolver and explicit version/hash acceptance functions are written but not deployed. Actual legal policy documents still require legal review and publication.
- Existing Business sample sales/order metrics remain visibly illustrative; they are not real customer records.
- Full programme/approval ingestion, institution detail pages, duplicate-review UI, complete campus role workflows, production RLS audit and end-to-end tests remain pending.
- Both connected Supabase projects `yucwackrbekwaxiyuobt` and `ysspnuldfiijagagwiqk` reported `INACTIVE`. Database migrations and Edge Functions cannot be deployed until the correct project is restored.
- Cloudflare Worker `monk` has no secret bindings. `GOOGLE_MAPS_API_KEY`, billing and quota configuration are required before nearby search can return live places.
- The feature branch and draft PR are documented at https://github.com/mrprashant9339-crypto/MONK-/pull/20. Keep all illustrative data clearly identified and never represent unverified records as verified.
