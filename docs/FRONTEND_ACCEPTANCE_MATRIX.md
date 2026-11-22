# MONK Frontend Acceptance Matrix — Phases 0–2

| Area | Acceptance evidence |
|---|---|
| Route inventory | Existing, preview, planned and recovery routes are distinguished |
| Shared UI | Buttons, fields, status messages and empty states have keyboard-visible focus |
| Public content | Features, solutions, pricing, integrations, resources, blog, case studies, roadmap, careers and partners have dedicated routes |
| Search/filter | Feature, integration and FAQ filters update visible content |
| Pricing | No unverified price, checkout or plan entitlement is presented |
| Editorial | Blog and case-study detail routes handle unknown slugs with a not-found view |
| Trust | Status and incident pages do not fabricate uptime or incident history |
| Support | Ticket and privacy forms state whether information is local or actually submitted |
| Recovery | Offline, maintenance, generic error, 403, 404, 500 and expired-session paths explain next steps |
| Accessibility | Semantic headings, labels, button names, live status regions and reduced-motion styles |
| Responsive | Layouts collapse to one column on narrow screens; tables scroll within their container |
| Security | No credentials or tokens in local storage; no unsafe HTML rendering |
| Performance | No additional runtime package introduced by this phase; verify built output in CI |
| Backend separation | Typed contracts added; no new backend schema or server mutation in this phase |

A row is complete only when the matching CI route/interaction test or manual evidence is recorded. Planned modules are not marked complete by the existence of a landing page.
