# MONK Phase 6 — Business Workspace Acceptance

## Delivered in this increment

### Sales workspace
- Dedicated Sales page, separate from the older CRM records screen.
- Organization-scoped reads from existing `leads`, `contacts` and `companies` tables, filtered by the active organization and non-deleted records.
- Overview: prospect, qualified-prospect, people and account counts; lead-score average; status distribution; source distribution; recent prospects.
- Pipeline: dynamic columns derived from actual saved lead status values, source filter and search. No invented pipeline stages or deal amounts.
- People: searchable contacts and mail handoff.
- Companies: searchable account directory.
- Lead creation through the existing `create_lead` RPC; server-confirmed result required before success state.
- CSV export of the currently filtered lead records.
- Refresh, loading, empty, error, success, disabled and responsive states.
- No fake forecast, revenue, conversion rate, quote, invoice or payment data.

### Visual design
- Uses the locked MONK charcoal, champagne-gold and muted-green brand palette.
- Dedicated Sales composition and orbital / staggered / data-bar motion.
- Reduced-motion support and responsive layouts.
- Sales navigation is business-workspace-only.
- No new runtime dependency or database migration.

## Explicitly not delivered by this increment
- Deal value, weighted forecast, quote/quotation, invoice, order, payment, inventory, purchase, finance ledger or tax workflows.
- Lead-stage mutation: the existing schema/API contract was not extended to guess valid status values.
- Sales activities/follow-up persistence: no verified activity schema or RPC was available in the reviewed migrations.
- Backend schema changes, financial integrations or payment processing.

## Verification
- Run `npm run build`, `npm run test:release` and `npm run test:e2e` in GitHub Actions for the exact commit.
- Do not call Phase 6 complete until the run for the latest commit succeeds.
- A successful CI run validates build and configured browser suite; it does not prove a connected production Supabase tenant has been exercised.
