# MONK Frontend Architecture Baseline

## Runtime boundaries
- React + TypeScript + Vite remain the application runtime. No new runtime dependency is introduced by this foundation.
- Public routes, authenticated workspace modules and recovery routes are separate concerns. A route is not considered complete merely because it renders.
- UI components own presentation and local interaction state. Domain service interfaces own data operations. UI components must not call Supabase tables directly in new modules.
- Frontend-only work uses deterministic preview data and labels it. It must never imitate a successful remote mutation.

## Shared UI primitives
`src/components/ui/primitives.tsx` provides small, dependency-free primitives for buttons, labelled fields, inputs, status messages and empty states. Product-specific brand styling remains in the existing page styles; this layer does not replace the MONK logo or public footer palette.

## Domain contracts
`src/lib/services/contracts.ts` defines result/error envelopes and the first auth, workspace and support service interfaces. Remote implementations will be introduced after the frontend acceptance gates. Use structured errors with a retryable flag; do not leak raw provider errors into user-facing copy.

## Page lifecycle
1. Resolve route and access context.
2. Set document title and description.
3. Render loading, content, empty, no-results, offline, permission, not-found or failure states as relevant.
4. Validate user input before actions.
5. Prevent duplicate submissions while pending.
6. Announce results with status/alert semantics.
7. Preserve safe drafts only when the page clearly explains local storage.
8. Add route and interaction tests.

## Performance guardrails
- No new UI framework, charting package or animation dependency.
- Keep public pages data-driven and split by route before adding large feature modules.
- Prefer CSS transitions and reduced-motion support.
- Use system font fallbacks; do not download large font files for the public shell.
- Avoid storing credentials, OTPs, API keys or sensitive personal records in browser storage.
- Measure actual bundle output in CI before declaring a size target met.

## Frontend-to-backend migration
Each domain will have a local preview adapter and a remote adapter implementing the same contract. Components call the contract, not raw database queries. Remote mutations must return server-confirmed results before the UI displays success. Tenant and role enforcement remains server-side; hiding a button is not authorization.
