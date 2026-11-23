# MONK Phase 6 — Business Workspace Acceptance

## Delivered surfaces

### Sales
- Dedicated Sales workspace, separate from CRM.
- Overview, live CRM pipeline, people and company directories.
- Lead creation through the existing create_lead RPC.
- Organization-scoped search, source filtering and spreadsheet-safe CSV export.
- MONK charcoal, champagne-gold and muted-green palette with page-specific orbital motion.

### Business operations
- Organization structure: create and list branches and departments.
- Deals: persistent deal records with company/contact linkage, amount, probability, expected close date and stage updates.
- Activities: persistent calls, emails, meetings, tasks, notes and follow-ups; completion is saved.
- Product catalog: create products/services with SKU, sale/cost price, unit and tax rate.
- Inventory: create warehouses, record opening/receipt/issue/adjustment movements and calculate balances from the movement ledger.
- Orders: create a persisted order from a catalog item, issue an invoice, cancel eligible orders, and fulfil confirmed orders with atomic stock deduction.
- Invoices: issue from an order, record partial/full payments atomically, and void unpaid invoices.
- Finance: create chart-of-account records, post balanced double-entry journals and view a posted-only trial balance.
- Reports: derive pipeline, order, invoice, activity and inventory summaries from persisted organization records.
- Role-based navigation and data access are enforced by permission rows and RLS policies.

## Database and security
- Additive migrations applied to the connected Supabase project:
  - `20261123033736_phase_6_business_operations`
  - `20261123033825_phase_6_order_fulfilment_and_billing_controls`
  - `20261123034346_phase_6_business_foreign_key_indexes`
- New business tables have RLS enabled, organization-scoped read/write policies and explicit authenticated grants; anonymous access is revoked.
- Covering indexes were added for all Phase 6 foreign keys; Supabase performance advisors no longer report unindexed Phase 6 foreign keys.
- Business RPCs are SECURITY INVOKER, explicitly granted to authenticated and revoked from anon/PUBLIC.
- Inventory movements and payments are append-only. Posted journal entries and their lines are immutable.
- Order fulfilment locks product rows, verifies stock, writes issue movements and changes order status in one transaction.
- Payment recording locks the invoice, validates currency and outstanding balance, writes the payment and updates invoice status in one transaction.
- Journal posting requires at least two lines and equal non-zero debit/credit totals.
- No seed customers, orders, payments, stock counts, revenue or finance balances have been fabricated.

## Scope boundaries
- Branch/dept screens currently create and list; full member-to-department assignment and branch-level permissions remain future hardening. Navigation and write controls are permission-aware for owner, admin, manager, sales and auditor roles.
- Orders UI supports multiple catalog lines per order; the database RPC validates and persists each line transactionally.
- No GST return filing, e-invoicing network integration, payment gateway, bank reconciliation, credit notes/refunds, supplier procurement, warehouse transfer, stock reservation or tax advisory workflow is claimed.
- Deal pipeline is separate from CRM leads; explicit lead-to-deal conversion UX remains future work.
- The journal module is a general double-entry foundation, not a certified accounting/tax package.
- Existing global Supabase advisor findings remain: pre-existing SECURITY DEFINER RPC warnings, two support-intake tables without RLS policies, and leaked-password protection disabled. The Phase 6 RPCs themselves are invoker functions and introduced no new SECURITY DEFINER warnings.

## Visual design contract
- Brand palette remains MONK charcoal/ink, champagne gold and muted green.
- Each business page uses a distinct layout and motion motif without changing brand colors.
- Reduced-motion support and responsive layouts are included.

## Verification
- Supabase migration application succeeded and the new business tables were observed with RLS enabled.
- Security inspection confirms Phase 6 RPCs are not SECURITY DEFINER, cannot be called by anon, and are executable by authenticated users.
- Run GitHub CI against the exact latest branch head: production build, release smoke tests and browser E2E.
- CI does not prove production deployment or end-to-end behavior for every authenticated role; owner/admin/manager/sales/auditor test-tenant verification remains required.
