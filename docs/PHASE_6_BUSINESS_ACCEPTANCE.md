# MONK Phase 6 — Business Workspace Acceptance

## Implemented workspace surfaces

### Sales
- Dedicated Sales page separate from CRM.
- Organization-scoped reads from existing leads, contacts and companies.
- Overview, dynamic status pipeline, people directory and company directory.
- Lead creation through the existing create_lead RPC with server-confirmed success.
- Search, source filter, refresh, loading/empty/error states and spreadsheet-safe CSV export.
- MONK charcoal/champagne-gold/muted-green palette, orbital motion and reduced-motion support.

### Business Operations
- Dedicated Operations control room with organization-scoped live snapshot.
- Organization structure page: live tenant identity and explicit unconfigured branches/departments/staff states.
- Deals desk: live prospect records, stage filtering and export; does not mislabel a lead as a persisted deal.
- Activities timeline: source timestamps from actual lead/project records; not represented as an audit feed.
- Product catalog, inventory, orders and invoices: dedicated responsive UI surfaces and feature boundaries.
- Finance: ledger-not-connected state; no invented balances, tax amounts, income, expenses or payments.
- Reports: metrics derived from actual leads, contacts, companies and projects only; CSV prospect report.
- Business navigation is vertical-gated; Finance and Analytics open their corresponding dedicated views.
- Each page has its own layout/motion treatment while retaining the same MONK brand palette.
- All new views respect reduced-motion preferences.

## Verified existing data contracts used
- organizations: name and vertical.
- leads: id, name, email, source, status, score, created_at.
- contacts: id, first_name, last_name, email, title, created_at.
- companies: id, name, industry, domain, status.
- projects: id, name, status, created_at.
- All list reads are scoped to the active organization and filter deleted_at where that column is part of the existing table contract.

## Backend workflows intentionally not enabled
The reviewed migration set does not establish verified schema, policies and server mutations for:
- organization branches, departments and staff assignments;
- persisted deals, deal ownership, stage changes and forecasts;
- activity log, calls, meetings, reminders and follow-up completion;
- product catalog, variants, SKUs, price lists and suppliers;
- warehouses, inventory balances, movements, reservations and transfers;
- sales orders, fulfilment, returns and cancellations;
- invoice numbering, tax calculations, payment reconciliation, credit notes;
- financial accounts, ledger postings, income/expense, cash flow and tax reporting.

These workflows are not complete production functionality yet. They require a reviewed schema, tenant/role permissions, audited RPCs, constraints, concurrency handling and tests before any UI can save or mutate them. The frontend surfaces explicitly state this boundary and do not fabricate records or successful actions.

## Visual design contract
- Locked palette: MONK charcoal/ink, champagne gold and muted green.
- Page identities vary through composition, typography, information hierarchy and motion—not by changing brand colors.
- Profile/personal-data pages follow the separate retro dossier direction.
- Reduced-motion support, responsive behavior and keyboard-visible controls are required.

## Verification
- Run npm run build, npm run test:release and npm run test:e2e against the exact latest branch head.
- A green CI run verifies the configured build and browser suite; it does not prove a production Supabase tenant has been exercised.
- Do not mark Phase 6 production-complete until backend workflows and authenticated tenant tests are completed.
