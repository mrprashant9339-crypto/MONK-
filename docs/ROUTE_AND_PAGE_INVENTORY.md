# MONK Route and Page Inventory

This inventory distinguishes implemented foundations, previews, planned surfaces and recovery experiences. A visible navigation item is not proof of backend readiness.

## Public website routes

| Route | Current state | Notes |
|---|---|---|
| / | Implemented | Public home and Campus/Business entry paths |
| /about | Implemented | Project identity and development status |
| /campus | Public page + live directory UI implemented | India-wide search reads published records from `monk_directory_institutions`; filters cover categories, all states/UTs and ownership. Production currently has 0 published records; regulator-source permission and dataset verification remain pending |
| /business | Implemented preview | Fictional local business workflow |
| /features | Frontend implemented | Filterable catalogue; feature maturity is labelled |
| /solutions | Frontend implemented | Campus, education groups, local business and startup use cases |
| /pricing | Frontend implemented | Capability matrix only; no unverified prices or checkout |
| /compare-plans | Frontend implemented | Current capability comparison; commercial terms pending |
| /integrations | Frontend implemented | Searchable catalogue with existing/configuration-dependent/planned labels |
| /resources | Frontend implemented | Documentation, updates, trust and FAQ links |
| /blog | Frontend implemented | Editorial index with illustrative product notes |
| /blog/:slug | Frontend implemented | Detail route; unknown slugs render not-found recovery |
| /case-studies | Frontend implemented | Explicitly illustrative workflow examples, not customer proof |
| /case-studies/:slug | Frontend implemented | Detail route; unknown slugs render not-found recovery |
| /roadmap | Frontend implemented | Available/in-progress/planned status labels; no delivery guarantees |
| /careers | Frontend implemented | Honest no-openings state |
| /partners | Frontend implemented | Collaboration information; no implied partner endorsements |
| /documentation | Implemented, content incomplete | Public guide hub; detailed admin guides remain future work |
| /updates | Implemented | Release-position summary, not a full changelog |
| /faq | Implemented | Existing public FAQ overview |
| /privacy | Implemented | Legal information page; legal review required before launch |
| /terms | Implemented | Legal information page; legal review required before launch |
| /cookies | Implemented | Cookie policy and notice |
| /refunds | Implemented | Refund policy page |
| /disclaimer | Implemented | Product and data disclaimer |
| /security | Implemented | Security overview; not a certification |
| /accessibility | Implemented | Accessibility information |
| /data-rights | Implemented | Local request draft; not server submission |
| /login | Implemented foundation | Password sign-in and signup with legal acknowledgement; Supabase Auth required |\n| /forgot-password | Frontend + existing auth API | Password recovery request; generic privacy-safe response |\n| /account-recovery | Frontend + existing auth API | Alias for password recovery |\n| /reset-password | Frontend + existing auth API | Strong password and confirmation validation; requires valid recovery session |\n| /verify-email | Frontend + existing auth API | Confirmation guidance and resend signup email |\n| /mfa | Frontend + existing auth API | Authenticated TOTP enrolment, verification and factor removal |\n| /invite | Frontend + existing invitation RPC | Preserves invite token through sign-in; server validates invitation after authentication |

## Trust, support and recovery

| Route | Current state | Notes |
|---|---|---|
| /contact | Implemented frontend handoff | Opens a prepared email; does not claim server receipt |
| /support/tickets | Implemented local draft | Browser-local ticket drafts only |
| /support/tickets/:id | Implemented local draft detail | Reads current browser storage |
| /status | Transparency page | Monitoring is unavailable; no uptime claim |
| /incidents | Transparency page | No authoritative incident feed connected |
| /security-center | Implemented | Security navigation and safe reporting guidance |
| /security/vulnerability-disclosure | Implemented frontend handoff | Prepares private email; no bug bounty/safe-harbour claim |
| /privacy-center | Implemented | Privacy navigation hub |
| /cookies/preferences | Implemented | Stores browser preference locally; no analytics provider connected |
| /offline | Implemented React fallback | Network guidance and retry |
| /offline.html | Implemented standalone fallback | Service-worker navigation fallback |
| /maintenance | Implemented fallback | Does not assert an active maintenance event |
| /error | Implemented fallback | Generic error recovery |
| /403 | Frontend implemented | Permission-denied guidance |
| /500 | Frontend implemented | Service error guidance and safe retry warning |
| /session-expired | Frontend implemented | Sign-in recovery |
| Unknown route | Implemented | Not-found recovery screen |
| /sw.js | Implemented | Minimal shell and static-asset caching |

## Shared frontend foundation

- Reusable UI primitives: buttons, fields, text inputs, status messages and empty states.
- Typed frontend domain contracts for authentication, workspace, project/task and support boundaries.
- Public page metadata updates (title, description and canonical URL).
- Mobile navigation, responsive card grids, contained horizontal table scrolling and reduced-motion styles.
- No new runtime dependency added by Phases 0–2.

## Workspace sections currently exposed in navigation\n\n| Route / capability | Current state | Notes |\n|---|---|---|\n| Workspace search / command palette | Frontend implemented | Ctrl/Command+K, search across navigation, projects and tasks; arrow-key and Enter selection |\n| Notifications centre | Frontend implemented | Honest empty state; notification preferences are local-only until delivery is connected |\n| Calendar | Frontend implemented | Month navigation and agenda from task due dates; no external calendar sync or event creation |\n| Profile settings | Frontend implemented | Display name update through existing Supabase Auth user metadata |\n| Display preferences | Frontend implemented | Compact density, week start and notification preferences stored locally |\n| Account security settings | Frontend implemented | Links to MFA, password recovery and security guidance |\n| First-time onboarding | Frontend implemented | Five-step Campus/Business organisation setup; local draft persistence; existing create_organization RPC |\n

| Section | Current state from source review |
|---|---|
| Calendar | Frontend implemented | Task due-date calendar and selected-day agenda |\n| Overview | Implemented foundation |
| Projects | Implemented foundation |
| Tasks | Implemented foundation |
| Team | Implemented foundation |
| Activity | Implemented foundation |
| CRM | Partial functional module; business vertical | Existing lead/contact/company CRUD screens; Sales now has its own dedicated workspace and design |
| Sales | Dedicated live-data frontend implemented | Overview, dynamic status pipeline, people/company directories, existing lead RPC and spreadsheet-safe CSV export |
| Education | Partial functional module; education vertical |
| Documents | Functional local-first frontend preview | Search, drag/drop and file picker; temporary in-memory queue, download/remove; no server upload or persistence until secure storage is connected |
| Business Operations | Dedicated frontend surfaces implemented; backend scope explicitly gated | Business control room, organization structure, deals desk, source-record timeline, products, inventory, orders, invoices, finance and reports; only verified organization/CRM/project data is live |\n| Analytics | Dedicated reports view | Reports from verified leads, contacts, companies and projects; no revenue or financial estimates |
| Finance | Dedicated finance UI / ledger backend pending | Ledger-not-connected state; no balances, transactions, tax or payment data fabricated |
| Marketplace | Placeholder / integration catalog pending |
| AI Copilot | Placeholder / AI runtime not connected |
| Focus | Basic client-side timer |
| Settings | Foundation / incomplete sub-settings |

## Not yet implemented in Phase 0–2

- Detailed documentation articles and administrator guides.
- Verified careers vacancy detail routes; no vacancies are currently published.
- Actual status monitoring, incident ingestion, support ticket delivery and privacy request submission.
- Backend pricing, subscription checkout and billing entitlements.
- Real customer case studies or independently verified outcomes.
- Complete national institution directory population and source verification; the all-India search UI is implemented, but published records remain empty until source permissions and verification are approved.

## Inventory maintenance rules

- Update this file whenever a route is added, removed or changes implementation status.
- Mark a page complete only after controls and relevant states pass automated tests.
- Keep preview, partial, placeholder and backend-pending labels explicit.
- Do not add dead navigation links or fake server-success messages.
- Every new route must have a route test and meaningful interaction tests where controls exist.
