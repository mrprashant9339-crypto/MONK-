# MONK Route and Page Inventory

This inventory distinguishes routes that currently exist from proposed future routes. A navigation label or module card is not proof that the module is fully implemented.

## Public website routes

| Route | Current state | Notes |
|---|---|---|
| / | Implemented | Home and Campus/Business entry paths |
| /about | Implemented | Project identity and development status |
| /documentation | Implemented, content incomplete | Public guide hub; detailed guides remain future work |
| /updates | Implemented | Release-position summary, not a full changelog |
| /faq | Implemented | Current project FAQ |
| /campus | Implemented preview | Campus overview; college data is illustrative and incomplete |
| /business | Implemented preview | Business overview and fictional workflow |
| /privacy | Implemented | Legal information page |
| /terms | Implemented | Legal information page |
| /cookies | Implemented | Cookie policy and notice |
| /refunds | Implemented | Refund policy page |
| /disclaimer | Implemented | Product and data disclaimer |
| /security | Implemented | Security overview; not a certification |
| /accessibility | Implemented | Accessibility information |
| /data-rights | Implemented | Data-rights page and request draft |
| /login | Implemented foundation | Login/signup UI; live authentication depends on existing Supabase configuration |

## Support, trust, and recovery routes

| Route | Current state | Notes |
|---|---|---|
| /contact | Implemented | Mail-client handoff, not server ticket submission |
| /support/tickets | Implemented frontend draft | Local-only ticket drafts |
| /support/tickets/:id | Implemented frontend draft detail | Reads local browser draft only |
| /status | Implemented transparency page | Correctly reports monitoring as unavailable |
| /incidents | Implemented transparency page | No verified incident feed connected |
| /security-center | Implemented | Trust navigation and security guidance |
| /security/vulnerability-disclosure | Implemented frontend handoff | Prepares private email; no ticket backend |
| /privacy-center | Implemented | Privacy navigation hub |
| /cookies/preferences | Implemented | Stores browser preference locally |
| /offline | Implemented React fallback | Network state notice |
| /maintenance | Implemented fallback | Does not claim maintenance is active |
| /error | Implemented fallback | Generic recovery screen |
| /offline.html | Added standalone fallback | Available for offline navigation fallback |
| /sw.js | Added service worker | Minimal shell and static-asset caching |

## Workspace sections currently exposed in navigation

The following are authenticated workspace sections, not all independent URL routes. The app switches visible modules through workspace navigation state.

| Section | Current state from source review |
|---|---|
| Overview | Implemented foundation |
| Projects | Implemented foundation |
| Tasks | Implemented foundation |
| Team | Implemented foundation |
| Activity | Implemented foundation |
| CRM | Partial functional module; business vertical |
| Sales | Partial / module-specific coverage |
| Education | Partial functional module; education vertical |
| Documents | Placeholder / integration pending |
| Analytics | Placeholder / aggregation pending |
| Finance | Placeholder / finance module pending |
| Marketplace | Placeholder / integration catalog pending |
| AI Copilot | Placeholder / AI runtime not connected |
| Focus | Basic client-side timer |
| Settings | Foundation / incomplete sub-settings |

## Proposed public routes not yet implemented

- /features
- /solutions
- /pricing
- /compare-plans
- /integrations
- /resources
- /blog
- /blog/:slug
- /case-studies
- /case-studies/:slug
- /roadmap
- /careers
- /careers/:slug
- /partners

## Proposed recovery routes not yet implemented as distinct screens

- /403
- /500
- /session-expired
- /browser-not-supported (only if a support policy is defined)

## Inventory maintenance rules

- Update this file whenever a route is added, removed, renamed, or changes implementation status.
- Mark a page "implemented" only after its controls and relevant states pass automated tests.
- Keep "preview", "partial", "placeholder", and "backend pending" labels explicit.
- Do not add dead navigation links. If a route is planned but not built, do not present it as a live destination.
- Every new route must have a route test and at least one meaningful interaction test where the page contains controls.
