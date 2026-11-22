# MONK Phase 3–5 Frontend Acceptance

## Phase 3 — Authentication
- Login remains the single sign-in entry point and exposes password recovery, verification resend and MFA guidance.
- Forgot-password request uses the existing Supabase Auth recovery API with a privacy-safe response.
- Reset-password validates length, character classes and confirmation before enabling submission.
- Email verification resend validates an email and uses the existing Supabase signup-resend method.
- MFA management requires an authenticated session; TOTP factor enrolment must be verified before it is considered enabled.
- MFA removal requires explicit confirmation.
- Invitation entry preserves the invitation fragment through sign-in; the existing server invitation RPC remains the authority.
- No password, OTP, MFA secret or invitation token is stored in local storage by the new UI.

## Phase 4 — Onboarding
- Five steps: welcome, workspace type, organisation details, regional preferences and review.
- Campus/Education and Business choices are explicit and update the initial industry default.
- Workspace name, slug and industry have length and format validation.
- Country, timezone, currency and locale are reviewable before creation.
- Non-sensitive form progress is stored in a versioned browser-local draft and can be resumed.
- The create action has busy, disabled and error states and calls only the existing authenticated organisation creation operation.
- A failed create retains the local draft; a successful create clears it.
- Team invitations are not implied to have been sent by onboarding; the Team module remains the invitation path.

## Phase 5 — Shared workspace
- Search opens from the toolbar or Ctrl/Command+K and searches sections, projects and tasks.
- Search supports ArrowUp, ArrowDown, Enter, Escape and click selection.
- Selecting a project opens Projects and selects that project; selecting a task opens Tasks.
- Notifications page shows an honest empty state until event delivery is connected.
- Notification preferences are labelled local-only and are stored separately from server notification delivery.
- Calendar supports month navigation, Today and selected-day agenda based on existing task due dates.
- Calendar explicitly states that external sync and event creation are not enabled.
- Profile display name uses existing authenticated user metadata; local display preferences are stored on the current device.
- Security settings link to password recovery, MFA and security guidance.
- Heavy workspace modules are lazy-loaded; no new runtime package is introduced.

## Backend boundaries
- No database schema or new server API was added by these phases.
- Existing Supabase Auth methods and the existing organisation/invitation RPCs are reused where required for actual account and workspace operations.
- Local preferences and onboarding draft are browser-only.
- No fake notification delivery, external calendar sync or invitation-sent state is shown.

## Verification
- Playwright tests cover auth route rendering, recovery form validation, MFA unauthenticated guard, invite entry, and login recovery links.
- Workspace search, calendar and settings require a valid authenticated workspace session for full browser-level verification; they must be verified in a configured test workspace before release.
- CI must pass type-check, production build, release smoke and all browser tests.
