# MONK Product Design System — Global Rules

This document is the visual contract for every MONK surface. Apply it across public pages, business workspaces, campus workspaces, profile and future modules.

## Brand palette — locked

Use the existing MONK brand family only. Layouts, typography, texture and motion may vary by page; the brand palette must not drift.

- Charcoal / ink: `#171715`, `#11120F`, `#1D211B`
- Champagne gold: `#D4B77F`, `#E2C994`
- Muted green: `#8EB49A`, `#9DB58D`
- Neutral surfaces and borders: existing charcoal/olive-grey tokens
- Public pink/white/dark-ink identity and the approved logo/footer treatment remain unchanged on public pages.

Do not introduce a new dominant hue for a module. Semantic status colors may be used sparingly for errors/warnings/success, not as a page identity.

## Distinct page identities

Every substantial page must have its own composition and interaction language while remaining recognizably MONK:
- Overview: editorial command-center layout and calm information hierarchy.
- Sales: orbital motion motif, stage-led pipeline and compact acquisition analytics.
- CRM: relationship records and data-management layout.
- Finance: ledger/table-first information architecture with restrained numerical emphasis.
- Analytics: chart and insight canvas with progressive data reveal.
- Campus: academic timetable, cohort and directory-oriented layouts.
- Documents: file-browser and preview-first layout.
- Profile and personal data: retro-inspired personal dossier / terminal-card aesthetic, clear privacy boundaries and explicit controls.

Avoid cloning one generic dashboard layout across every module.

## Motion and accessibility

- Give each page a distinct motion motif (orbit, staggered reveal, data-bar draw, timeline, page transition, etc.) while sharing timing/easing quality.
- Prefer CSS transitions/animations and avoid adding a motion runtime dependency unless justified.
- Respect `prefers-reduced-motion`; all information and controls must remain available without animation.
- Keep hover/focus/pressed/disabled/loading states visible and keyboard accessible.
- Avoid motion that blocks input, causes layout shifts or reduces readability.

## Personal information and privacy

- Profile and personal-data surfaces use the retro-inspired visual direction without sacrificing legibility or accessibility.
- Never place passwords, recovery codes, MFA secrets, access tokens or private identifiers in localStorage/sessionStorage.
- Show only the minimum personal information needed; mask sensitive fields by default and require an explicit reveal action where appropriate.
- Distinguish account profile data from organization/member data.
- Do not populate personal pages with fabricated user records.

## UI inspiration

Magic UI, Smooth UI and Unlumen may be consulted for interaction patterns, layout ideas and motion references. Rebuild patterns in MONK's own design language; do not import unrelated brand colors or copy proprietary assets.

## Acceptance gate

A page is not design-complete until its page-specific layout, responsive behavior, interactions, loading/empty/error states, keyboard focus and reduced-motion behavior have been checked.
