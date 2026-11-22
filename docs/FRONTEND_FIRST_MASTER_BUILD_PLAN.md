# MONK Frontend-First Master Build Plan

**Status:** Active planning baseline  
**Scope:** Frontend content, UI/UX, client-side interactions, responsive behavior, accessibility, performance, and quality assurance.  
**Explicitly out of scope for this phase:** New backend schemas, APIs, database mutations, server-side business logic, real payment processing, real ticket delivery, and production monitoring integrations.

## Product principles

1. Build a complete user journey, not a collection of disconnected screens.
2. Every visible control must have a defined, testable behavior. If a real service is not connected, use a clearly labelled local preview or disabled state; never simulate a successful server action.
3. Keep existing MONK brand assets and approved logo/footer colors unchanged unless separately approved.
4. Preserve honest product status: sample data is marked as sample; planned services are not described as live.
5. Prefer small, reusable React components and route-level lazy loading over a large all-in-one bundle.
6. Mobile-first, keyboard accessible, readable, and reduced-motion aware.
7. Frontend state and future backend contracts must be separated so API integration does not require redesigning the UI.

## Build workflow for every page

Each page follows the same acceptance checklist:

- Page purpose, intended user, and access context documented.
- Route, title, description, breadcrumb, canonical/navigation placement defined.
- Complete page copy, labels, help text, empty-state copy, and error copy written.
- Layout designed for phone, tablet, laptop, and wide desktop.
- All links, buttons, menus, tabs, filters, sort controls, dialogs, and forms wired to real frontend behavior.
- Forms include required fields, validation, character limits, safe hints, disabled/busy states, success/error feedback, and duplicate-submit protection.
- Loading, skeleton, empty, no-results, offline, permission-denied, not-found, and failure states covered where relevant.
- Focus order, keyboard use, labels, contrast, screen-reader status announcements, and reduced-motion behavior checked.
- No secrets, private customer/student data, or false live claims in sample content.
- Unit/component and Playwright route/interactions tests added.
- Build, type-check, lint (when configured), and browser tests pass before marking the page complete.
- A page is not "complete" merely because it renders; its controls and states must pass the acceptance tests.

## Phase 0 — Inventory, architecture, and design foundation

- Audit all existing routes, navigation links, footer links, buttons, forms, and module placeholders.
- Create a route registry with page owner, status, dependencies, and test coverage.
- Establish shared design tokens and reusable primitives: buttons, icon buttons, links, fields, selects, checkboxes, radio groups, switches, cards, badges, alerts, breadcrumbs, tabs, tables, pagination, dialogs, drawers, tooltips, dropdowns, toasts, skeletons, empty states, error states, and page shells.
- Establish consistent typography, spacing, responsive breakpoints, focus rings, motion tokens, and dark/light surface rules without changing approved brand/logo/footer colors.
- Add route-level code splitting and remove unused dependencies/assets after bundle measurement.
- Add a consistent page metadata and navigation model.
- Define local preview adapters and typed future service interfaces; do not make new backend calls in frontend-only work.

**Exit gate:** documented route inventory; reusable component library; baseline production build; route and interaction tests.

## Phase 1 — Public website and product storytelling

### Public routes
- / — Home
- /about — About MONK
- /campus — MONK Campus overview
- /business — MONK Business overview
- /features — Complete feature catalogue
- /solutions — Use cases by audience and industry
- /pricing — Plans and pricing explanation (do not invent real prices)
- /compare-plans — Plan comparison
- /integrations — Integration directory and connection states
- /resources — Resource hub
- /blog and /blog/:slug — Articles and detail
- /case-studies and /case-studies/:slug — Case studies (only verified or explicitly illustrative)
- /documentation — Product documentation hub
- /updates — Changelog and release notes
- /roadmap — Public roadmap with planned/in-progress/released labels
- /faq — Searchable FAQ
- /contact — Contact routes
- /careers and /careers/:slug — Careers and role details (show no openings if none exist)
- /partners — Partner programme
- /login, /login?mode=signup — Existing account entry points

**Interactions:** primary/secondary CTAs, navigation, mobile menu, search, FAQ accordions, filters, pricing-period switch (only if real plans are defined), copy/share links, contact mail handoff, and cookie preference entry points.

## Phase 2 — Trust, legal, support, and recovery

### Existing routes to audit and finish
- /contact
- /support/tickets
- /support/tickets/:id
- /status
- /incidents
- /security-center
- /security/vulnerability-disclosure
- /privacy-center
- /cookies/preferences
- /data-rights
- /privacy
- /terms
- /cookies
- /refunds
- /accessibility
- /disclaimer
- /security

### Recovery and operational routes
- /offline and standalone /offline.html
- /maintenance
- /error
- /404 (unknown routes must render a proper not-found experience)
- /403 (restricted/unauthorized view)
- /500 (unexpected service error view)
- /session-expired
- /browser-not-supported (only when a real support policy is defined)

**Interactions:** ticket draft create/read/delete/export; status filters and incident filters over clearly labelled preview data; vulnerability report mail handoff; privacy request draft; cookie preference controls; retry, refresh, home, contact support, copy reference ID, and return-to-previous-page. No local draft may be presented as a submitted server ticket. No uptime indicator may be fabricated.

## Phase 3 — Authentication and account entry

- Login, signup, email verification, resend verification, forgot password, reset password.
- MFA setup and challenge UI, authenticator/recovery code screens, passkey setup/sign-in UI where supported.
- Social sign-in buttons only where provider integration is actually enabled; otherwise clearly disabled/planned.
- Account recovery, invitation acceptance, session-expired, sign-out confirmation, and account locked/help states.
- Password visibility, password policy hints, strength guidance, field validation, pending states, and safe error messaging.

**Frontend-only behavior:** client-side validation and explicit preview states. Do not store passwords or OTPs in localStorage/sessionStorage or claim authentication success without a backend response.

## Phase 4 — Onboarding and workspace setup

- Welcome and product selection (Campus / Business).
- Workspace type, organization name, country, timezone, currency, locale, industry, institution/business profile.
- Setup checklist, profile details, team invite UI, role selection, preferences, import preview, integration selection, completion summary.
- Back/next navigation, draft progress, validation, unsaved-change warning, skip/continue behavior.

## Phase 5 — Shared workspace shell and core modules

- Workspace overview and dashboard.
- Global search and command menu.
- Notifications centre and notification preferences.
- Activity feed and audit-view presentation.
- Projects list, project detail, project board, project settings.
- Tasks list, task detail, task board, task filters, priorities, labels, due dates, comments/attachments preview.
- Calendar and scheduling views.
- Documents library, folders, document preview, upload UI, version/history preview.
- Team directory, member profile, invitations view, role/permission matrix view.
- Reports and analytics dashboards (only sample metrics clearly labelled).
- Focus timer, personal tasks, saved views.
- Profile, preferences, appearance, language, accessibility, help.

## Phase 6 — MONK Business workspace

- Business overview and operational dashboard.
- Organization, branches, departments, staff, roles.
- CRM: leads, lead detail, contacts, companies, customers, pipeline, deals, activities, follow-ups, quotes.
- Products/services, categories, price lists, inventory, warehouses, suppliers, purchase orders, stock transfers, low-stock alerts.
- Orders, order detail, invoices, invoice preview, payment status UI, returns, refunds, shipping and subscriptions.
- Finance: income, expenses, accounts, transactions, cash flow, tax settings and reports.
- Operations: workflows, approvals, work schedules, attendance, service bookings, internal communication, customer support.
- Every money-related page uses clearly marked preview data until connected to a verified financial source.

## Phase 7 — MONK Campus workspace

- Institution overview, institution profile, campuses, departments, programmes, courses, branches, academic sessions, semesters.
- Student directory, student detail, admissions, applications, enrollment, ID card preview, documents, guardians.
- Faculty and staff directory, profiles, workload, attendance, leave.
- Subjects, syllabus, timetable, class schedule, assignments, learning materials, online class links, academic calendar.
- Examinations, schedules, admit card preview, marks entry UI, practicals, results, grades, analytics.
- Fees, scholarships, notices, complaints, transport, hostel, library, certificates, parent/guardian portal.
- Role-specific navigation and empty/permission states for student, faculty, HOD, principal, office staff, parent/guardian.
- No real student records in preview content; protect sensitive education data in all examples.

## Phase 8 — AI, agents, and automation interface

- AI Copilot home/chat, conversation history, prompt examples.
- Agent directory, agent details, builder, configuration, tool permissions.
- Workflow builder, templates, trigger/action configuration, schedule UI.
- Knowledge base, source library, indexing status presentation, RAG configuration UI.
- Memory settings and visibility controls.
- Tool connections, approval centre, execution history, run detail, usage/cost views, model settings.
- Evaluation playground, test cases, error/trace views.
- No agent execution or external action is claimed until a real approved backend execution exists.

## Phase 9 — Developer platform and marketplace

- Developer home, API documentation, API explorer, keys UI, webhook list/detail, OAuth apps, SDK guides, sandbox, rate-limit/usage/log views.
- Marketplace home, categories, search, app details, permissions review, install confirmation, installed apps, connected accounts, templates, partner directory, submit/publish flow.
- API keys are never generated or stored in browser-only preview. Show safe mock examples only.

## Phase 10 — Account, organization, administration, and billing

- Personal profile, account details, login history, active sessions, devices, security preferences.
- Organization profile, workspace preferences, members, teams, roles, permission matrix, invitations.
- Subscription overview, plans, billing history, invoices, payment methods, usage, storage, limits.
- Audit logs, data export request, account deletion request, organization transfer, retention preferences.
- Payment and destructive actions require explicit confirmation UI and must not claim completion without server confirmation.

## Phase 11 — Quality, performance, and release readiness

- Route coverage and navigation graph audit.
- Automated checks for every internal link and interactive control.
- Keyboard-only and screen-reader checks on critical flows.
- Responsive checks at narrow phone, standard phone, tablet, laptop, and desktop widths.
- Reduced-motion, contrast, text scaling, focus visibility, form semantics.
- Bundle-size budgets, route chunking, lazy-loaded heavy modules, image optimization, font strategy, caching headers, offline fallback.
- Browser console/network error checks, broken-image checks, accessibility scans, and Playwright flows.
- Security review of frontend storage, URL handling, unsafe HTML, external links, sensitive data exposure, and dependency footprint.
- Release checklist with pass/fail evidence; no "100% ready" claim without test results.

## Future backend integration map (after frontend approval)

| Frontend domain | Future backend contract |
|---|---|
| Auth and account | Supabase Auth, verification, MFA, session and recovery |
| Organization and roles | Organization, membership, invitation, role and policy APIs/RLS |
| Projects and tasks | Typed project/task services and tenant-scoped database operations |
| Campus | Institution, student, faculty, academic, attendance, exam and fee services |
| Business | CRM, catalog, inventory, order, invoice and finance services |
| Documents | Object storage, metadata, permissions and signed URLs |
| Support and incidents | Ticket service, notification delivery, status monitor and incident feed |
| Privacy and consent | Consent records, verified data-rights workflow and audit trail |
| Billing | Payment provider, subscription, invoices and webhook verification |
| AI and automation | Model gateway, agent runtime, tool approval, execution logs and usage metering |
| Marketplace and developer | OAuth, API key issuance, webhook delivery, app registry and permission grants |
| Analytics | Event ingestion, tenant-aware aggregation and reporting endpoints |

### Integration rule

Each frontend domain gets a typed service boundary (for example authService, workspaceService, campusService, businessService, supportService). Components call the service interface, not Supabase tables or raw HTTP directly. During frontend-only development, use a clearly named local preview adapter with deterministic sample data. Later, replace the adapter with the real implementation while keeping the page components and interaction contracts stable.

## Definition of Done

A page is complete only when:
1. Its content and route are final enough for the current product stage.
2. All visible controls have a working, documented frontend action.
3. All relevant states are designed and tested.
4. It works on mobile and desktop without horizontal overflow.
5. It meets accessibility and performance checks.
6. No fake backend success, fake live status, or misleading sample data exists.
7. Its future backend contract and data needs are documented.
8. Build and automated tests pass.
