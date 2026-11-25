# MONK Dual-Portal Product and Release Plan

## Product entry model
MONK has one public website and two distinct product journeys. The root route is public and does not require authentication. Visitors choose Campus or Business, explore public product information and clearly-labelled demo content, and authenticate only when they create or enter a private workspace.

## Journey A — MONK Campus
- Public page: college-focused product overview, institutional workflows, role model and directory preview.
- Institution types: government and private colleges, with verified affiliation and institute identifiers.
- Roles: platform admin, institution admin/principal, HOD, faculty, student and optional guardian.
- Core modules: institution profile, departments/branches, courses/semesters, notices, timetable, attendance, assignments, assessments/results, documents and analytics.
- Data policy: public directory data must be sourced from official SBTE/AICTE/state sources; demo metrics and student records must be marked fictional and never presented as live records.
- Current UI: public Campus landing page and a data-backed India-wide institution directory search; the production directory currently has zero published records. Full verified 46-institute dataset and complete institutional workflows remain follow-up work.

## Journey B — MONK Business
- Public page: business-focused overview, workflows, feature cards and sample dashboard.
- Customer types: local shop, service provider, startup and small/medium team.
- Roles: owner/admin, manager, sales, accounts, operations and staff.
- Core modules: CRM, leads/enquiries, products, inventory, suppliers, orders, bookings/service jobs, invoices, payments, team tasks and analytics.
- Data policy: sample business name, sales, customer activity and transactions are fictional demo data until a real organization signs up.
- Current UI: public Business landing page and fictional Muzaffarpur shop workflow preview. Real business data integrations and advanced inventory/finance modules remain follow-up work.

## Authentication and tenancy
- Public marketing and demo pages must remain accessible without login.
- Login/signup must use the existing Supabase Auth integration.
- Selected vertical (education/business) is passed into onboarding and must be saved to the organization record, not trusted from a client query parameter for authorization.
- All organization-owned data must be protected with server-side checks and Supabase Row Level Security.
- Roles and permissions must be validated from trusted membership records.
- Add invitation, email verification, password reset, session expiry and account recovery tests before general release.

## Brand and interaction system
- Palette: 55% warm white, 20% near-black, 15% pink, 10% warm yellow.
- M monogram: compact icon for small spaces and animated stroke/reveal for hero branding.
- Motion: subtle logo draw, slow orbit/glow, floating product preview, scroll reveal and hover feedback.
- Respect prefers-reduced-motion; keep mobile performance and keyboard navigation usable.
- Avoid heavy WebGL/3D on the public entry page.

## Release gates
1. TypeScript and Vite production build succeeds.
2. CI runs on pull requests and reports green checks.
3. Cloudflare deploy workflow completes from main.
4. Latest Cloudflare Worker deployment is verified against the expected commit/build.
5. Public routes /, /campus and /business load on desktop and Android mobile.
6. Login, signup, email verification and selected vertical are tested end-to-end.
7. Supabase RLS and cross-tenant isolation are tested with two separate organizations.
8. Demo data is visibly labelled; no sample record is represented as a real customer, college or transaction.
9. Accessibility, reduced-motion, performance, error states and 404/fallback behavior are checked.

## Current implementation status
- Public root purpose chooser: implemented in the repository.
- Campus public landing page: implemented; directory is only a sample preview.
- Business public landing page: implemented; shop workflow is fictional demo data.
- Animated M mark and pink/white/yellow/black visual system: implemented.
- Existing Supabase authentication integration: retained; selected vertical is preselected and synced into the existing onboarding state.
- Full 46-college verified dataset: not yet imported.
- Complete campus role workflows and production RBAC audit: pending.
- Real business integrations and advanced Finance/Marketplace/AI modules: pending.
- Production deployment of the latest public-portal build: must be confirmed by Cloudflare deployment record and live smoke tests.
