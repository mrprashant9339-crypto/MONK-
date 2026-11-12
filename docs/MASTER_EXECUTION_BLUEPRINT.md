# MONK — Full Product Workflow & Implementation Blueprint

**Status:** Planning baseline — implementation sequence approved for execution, not yet functionally verified  
**Target:** MONK multi-tenant workspace platform for startups and growing teams  
**Initial market:** India  
**Web stack:** React 18, TypeScript, Vite, Tailwind CSS, Supabase Auth/Postgres/RLS  
**Deployment posture:** Staging-first. Production remains read-only until an explicit release approval.

---

## 1. Product outcome

MONK is a connected business workspace, not a collection of disconnected CRUD screens. A company should be able to acquire a workspace, onboard its people, assign roles, manage customers and sales activity, deliver projects, collaborate on files and documents, and receive a reliable activity/notification stream.

The product is organized around one tenant boundary: **Organization → Teams → Members → CRM / Projects / Documents / Files / Activities**. Every tenant-owned record must be attributable to an organization. A user may belong to multiple organizations, with a separate membership and role in each.

### Product principles
1. Tenant isolation is foundational; never rely on frontend filtering for authorization.
2. Identity, membership, role and permission are distinct concepts.
3. Every important business action produces an auditable activity event.
4. Notifications are derived from events and user preferences, not scattered ad-hoc UI calls.
5. Files are private by default and accessed through authorization-aware metadata and signed URLs.
6. All workflows must have loading, empty, success, validation, permission-denied and recoverable-error states.
7. Build the complete workflow in dependency order. Functional QA and release verification are a later, explicitly separate stage.

## 2. Workstream map and dependency order

| Order | Workstream | Outcome | Depends on |
|---|---|---|---|
| 0 | Product contract & architecture | Shared domain language, scope and decisions | — |
| 1 | Staging & database foundation | Repeatable isolated schema and migrations | 0 |
| 2 | Authentication & identity | Signup, login, recovery, profile and consent | 1 |
| 3 | Organization onboarding | Create/join/switch workspaces and setup checklist | 2 |
| 4 | Roles, permissions & teams | RBAC, team membership and access administration | 3 |
| 5 | Core business workspace | CRM, projects, tasks, documents, files, activities and notifications | 4 |
| 6 | Public website & application UX | Landing, auth, onboarding, dashboard and all module interfaces | 0–5 contracts |
| 7 | API, integrations & operational backend | Stable API layer, webhooks, email and provider adapters | 1–6 |
| 8 | Security, QA and release verification | Automated tests, security review, staging acceptance and release | 1–7 |

Implementation can proceed in parallel only where the upstream contract is stable. Do not build module UIs against invented database fields or APIs.

---

## 3. Workstream 0 — Product contract and architecture

### Deliverables
- Domain glossary and entity ownership map.
- User roles and permission matrix.
- Navigation and information architecture.
- API naming/error conventions.
- Event catalogue and notification taxonomy.
- Design tokens, responsive breakpoints and component patterns.
- Architecture decision records for tenancy, storage, audit and integrations.

### Global application roles
- Platform operator: operational platform access, not automatic access to tenant business data.
- Organization owner: tenant ownership, billing/settings authority and owner transfer.
- Organization admin: delegated organization administration.
- Team manager: manage assigned teams and team work allocation.
- Functional roles: sales, project manager, contributor, finance, operations, auditor, client and vendor.
- Custom roles: organization-defined role composed from explicit permissions.

These are role templates, not unconditional global powers. Effective access is the intersection of organization membership, role permissions, resource scope and resource-specific sharing.

---

## 4. Workstream 1 — Staging and database foundation

### 4.1 Environment contract
- Keep local, staging and production configuration separate.
- Staging project ref: `ysspnuldfiijagagwiqk`.
- Production project ref: `yucwackrbekwaxiyuobt`.
- Frontend receives only the staging publishable/anon key in staging.
- Service-role/secret keys remain server-side only.
- No production data copy is required for feature development.
- Production schema/data changes require a separate approved release plan.

### 4.2 Migration system
- Establish a single chronological migration source of truth in `supabase/migrations/`.
- Record the reconstructed foundation snapshot as reconstructed; do not claim it is the original historical migration chain.
- Reconcile the existing schema snapshot with the intended product model before adding duplicate tables.
- Every schema change is additive and reviewable where possible; avoid destructive changes without an explicit migration plan.
- Add generated TypeScript database types after schema contracts stabilize.
- Keep seed data deterministic and limited to system roles/permissions and non-sensitive reference data.

### 4.3 Foundation domains
1. Identity: profiles, user settings, legal consents.
2. Tenant: organizations, organization members, invitations, organization settings.
3. Authorization: system permissions, role templates, organization roles, role-permission links, membership/team scopes.
4. Collaboration: teams, team members, projects, project members, tasks, task comments.
5. CRM: accounts/companies, contacts, leads, opportunities/deals, pipelines, stages, notes, interactions, tasks/reminders.
6. Content: folders, files, document metadata, document versions, document permissions/shares.
7. Operations: activities/audit events, notifications, notification preferences, integration connections, webhook deliveries.
8. Platform: feature flags, system configuration and operational event records where required.

### 4.4 Database invariants
- Tenant-owned tables carry `organization_id` directly or through a rigorously enforced parent relationship.
- Composite foreign keys should prevent cross-organization parent references where practical.
- Unique constraints are tenant-scoped when names/keys only need to be unique inside an organization.
- Add indexes for organization, parent, status, owner/assignee and created/updated time access paths.
- Use soft deletion only where recovery/audit requirements justify it; define retention and uniqueness behavior.
- Use UTC timestamps in storage; render in organization/user timezone.
- RLS is enabled for every exposed tenant table. Policies enforce both membership and resource scope.
- SECURITY DEFINER RPCs must have a fixed search_path, narrow grants, explicit auth checks and input validation.
- Avoid authorization decisions based on editable user metadata.
- Internal trigger functions are not exposed as client-callable RPCs.

### Foundation exit criteria (for later QA)
A clean staging environment can be rebuilt from the committed migration chain; schema inventory, grants, triggers, RLS policies, constraints and indexes match the reviewed architecture; no production data or secrets are present.

---

## 5. Workstream 2 — Authentication and identity workflow

### Screens
- Public landing → Sign up / Sign in.
- Email/password signup.
- Google OAuth (optional provider, only after provider setup).
- Email verification / resend confirmation.
- Forgot password → recovery email → reset password.
- Session expired / signed out.
- Profile completion.
- Legal terms and privacy consent.

### Signup workflow
1. User enters first name, last name, email, password and accepts current terms/privacy versions.
2. Validate fields and password policy on client and server.
3. Create Supabase Auth identity with consent-version metadata.
4. Verify email when confirmations are enabled.
5. Auth user bootstrap trigger creates profile and user settings idempotently.
6. Persist legal consent only when explicit consent and version values are present.
7. On successful session, route to organization discovery/onboarding.
8. Existing users resume their last permitted organization or see the organization chooser.

### OAuth workflow
- OAuth must not silently imply legal acceptance.
- If consent is not already recorded, require a consent screen after OAuth returns and before organization creation.
- Handle provider cancellation, missing email, duplicate identity and redirect allow-list errors.

### Profile workflow
- Edit name, avatar, locale, timezone and contact preferences.
- Password change and active session management.
- Account deletion/export request workflow to be designed with retention/legal rules.
- Never store passwords or provider secrets in application tables.

---

## 6. Workstream 3 — Organization onboarding

### New organization workflow
1. Authenticated user selects **Create workspace**.
2. Enter organization name, URL slug, country, timezone, currency, locale, industry and workspace type.
3. Validate slug availability and reserved words.
4. Create organization and owner membership atomically through a checked RPC.
5. Set active organization in user settings.
6. Start onboarding checklist: profile, organization profile, create first team, invite members, create first project, configure CRM pipeline.
7. Show progress and allow safe resume.

### Join organization workflow
1. User opens an invitation link.
2. Authenticate or sign up with the invited email.
3. Verify invite email matches the authenticated account.
4. Validate token hash, expiry, revocation and one-time-use status.
5. Add membership with the invited role, record acceptance and set active organization.
6. Show the workspace welcome page and available modules.

### Organization switching
- List only active memberships.
- Switch through a server-checked RPC.
- Refresh organization-scoped caches and subscriptions after switching.
- Never retain previous-tenant data in UI state after a switch.
- Deep links must re-check membership and resource permissions.

### Organization administration
- Organization profile and preferences.
- Domains and allowed invite rules (later configurable).
- Member directory, pending invitations, role assignment and deactivation.
- Ownership transfer and organization closure require separate guarded workflows.

---

## 7. Workstream 4 — Roles, permissions and team management

### Authorization model
Use RBAC with scoped grants:
- Permission: stable action key, e.g. `crm.contacts.read`, `crm.contacts.create`, `projects.tasks.assign`, `files.share`.
- Role: named bundle of permissions.
- Membership: user-to-organization relationship with role(s).
- Team membership: user-to-team relationship and team-scoped authority.
- Resource grant: optional direct share for a specific document/project/file.
- Policy: combines tenant membership, permission, team/resource scope and record state.

### Role administration workflow
1. Owner/admin opens Settings → Roles & permissions.
2. Select system template or create custom role.
3. Assign permissions grouped by module and action.
4. Preview effective access and restricted actions.
5. Save role and apply to members.
6. Log changes and notify affected users where appropriate.

### Suggested permission groups
- Organization: profile, settings, billing, member management, invites, role management.
- Teams: create/read/update/archive teams; add/remove members; manage team scope.
- CRM: accounts, contacts, leads, opportunities, pipelines, notes and exports.
- Projects: create/read/update/archive projects; membership; milestones; tasks; comments.
- Documents/files: view, upload, edit metadata, version, download, share, delete, manage retention.
- Reports: view, export and administer dashboards.
- Integrations: connect, read status, rotate/revoke connection.
- Audit: view security/activity logs.

### System role templates
- Owner: full tenant control and ownership operations.
- Admin: broad operational administration, excluding owner-only actions.
- Manager: team/project/CRM scope as assigned.
- Sales: CRM access, limited project access.
- Project manager: project, milestone and task administration.
- Contributor: assigned work and explicitly shared resources.
- Auditor: read-only access to allowed audit/report domains.
- Client/vendor: restricted portal and explicitly shared project/document access.

### Team management workflow
- Create team with name, description, type and optional parent/team lead.
- Add/remove members with role and team scope.
- Assign projects and CRM ownership pools to teams.
- Team page shows members, workload, projects and activity.
- Prevent circular parent teams and unauthorized cross-organization membership.
- Define what happens to owned records when a member is deactivated or removed.

### Exit criteria
Permission catalogue, role templates, membership/team scopes and UI affordances use the same permission keys. No module relies solely on hidden buttons for security.

---

## 8. Workstream 5 — MONK core business workspace

### 8.1 CRM

**Core entities:** CRM account/company, contact, lead, pipeline, pipeline stage, opportunity/deal, interaction, note, follow-up task and source.

**Lead workflow:** capture → deduplicate → assign owner/team → qualify → convert to account/contact/opportunity → nurture or mark lost.

**Opportunity workflow:** create → select pipeline/stage → set amount/currency/close date → assign owner → log calls/emails/meetings/notes → move stage → won/lost → create delivery handoff/project where appropriate.

**CRM screens:** overview, lead inbox, accounts, contacts, opportunities/kanban pipeline, activity timeline, tasks/follow-ups, reports and import/export.

**Rules:** tenant-scoped uniqueness/deduplication, immutable stage history, permission-checked exports and auditable ownership changes.

### 8.2 Project and work management

**Core entities:** project, project member, milestone, task, task dependency, task comment, checklist/subtask, label, time entry (optional), project update and status history.

**Project workflow:** create from blank/template → define owner/team/dates/status → add members → milestones → tasks → assign owners/dates/priorities → collaborate → track blockers/progress → complete/archive.

**Task workflow:** backlog → ready → in progress → blocked → review → done; configurable status mapping per organization. Include assignee, reporter, due date, priority, labels, parent task, dependencies, comments, attachments and activity history.

**Views:** overview, list, kanban board, calendar, timeline/roadmap and workload. Include filters, saved views, bulk actions and clear empty states.

### 8.3 Documents and files

**Separate metadata from binary storage.** Store binaries in private Supabase Storage buckets; store metadata/version/ownership/permissions in Postgres.

**Entities:** folder, file, document, document version, resource share, upload session and retention metadata.

**Workflow:** select destination → authorize upload → upload to private bucket → confirm metadata → create activity event → optionally notify watchers → view/download through signed URL after authorization.

**Features:** folder tree, search, preview where supported, version history, rename/move, tags, sharing, download, archive/trash and restore. Document editing/collaborative co-authoring is a later capability unless an editor integration is selected.

**Controls:** file size/type limits, path isolation by organization, signed URL expiry, malware scanning integration point, no public bucket for tenant content, version/retention rules and download audit events.

### 8.4 Notifications

**Event-driven design:** business action → domain event → notification rule/preferences → in-app notification; email/push adapters may consume the same event later.

**Notification types:** invitation, assignment, mention, due date, status change, comment, approval, file share, CRM follow-up and security/account event.

**UX:** notification bell, unread count, inbox, mark read/unread, mark all read, deep link, per-category preferences and quiet hours.

**Backend:** idempotent event/notification creation, recipient resolution, retryable delivery outbox, provider delivery status and user-level deduplication.

### 8.5 Activities and audit trail

- Activity feed: human-readable business events with actor, action, entity, organization, timestamp and deep link.
- Audit log: security-sensitive immutable record including actor, action, target, timestamp, request/correlation ID and safe before/after metadata.
- Do not store passwords, access tokens, invitation raw tokens or unnecessary sensitive content in logs.
- Provide organization activity, project activity, CRM timeline and personal activity views with permission filtering.

---

## 9. Workstream 6 — Public website, dashboard and complete UX

### Public landing page
- Header/navigation: product, solutions, resources, pricing (only when commercial model is decided), sign in and get started.
- Hero: clear value proposition, product UI visual and primary CTA.
- Product capability sections: CRM, projects, teams, docs/files and notifications.
- Use-case sections for startups, sales teams and delivery teams.
- Security/privacy and trust section with accurate claims only.
- FAQ, footer, contact/legal links.
- Responsive mobile-first layout, accessible contrast, keyboard navigation and reduced-motion support.
- SEO metadata, social preview, sitemap and robots configuration.

### Authentication UX
- Sign in, sign up, OAuth, verification, recovery, reset and legal consent.
- Inline validation, disabled/loading states, clear errors and resend flows.

### Onboarding UX
- Workspace chooser/create/join.
- Organization setup wizard and progress checklist.
- Invite teammates and assign roles.
- Create first team/project/CRM pipeline.
- Skip/resume options and contextual empty states.

### Authenticated application shell
- Left navigation with organization switcher.
- Global search/command entry.
- Create action menu.
- Notification center.
- Help/support and user profile menu.
- Responsive sidebar/mobile navigation.
- Breadcrumbs, page title, contextual actions and consistent permission-aware navigation.

### Module interfaces
- Home/dashboard: configurable widgets, work summary, tasks due, pipeline snapshot, project health and recent activity.
- CRM: overview, leads, accounts, contacts, opportunities, pipeline, tasks and reports.
- Work: projects, board, list, calendar, timeline and workload.
- Teams: directory, team detail, workload and team activity.
- Docs: folders, file library, recent/shared/trash and document detail/version history.
- Notifications: inbox and preferences.
- Settings: organization, members, teams, roles, integrations, profile, security and audit.

### Design system deliverables
- Tokens: color, typography, spacing, radius, elevation, motion and breakpoints.
- Components: buttons, fields, selects, dialogs, drawers, tabs, tables, cards, badges, avatars, menus, breadcrumbs, toasts, skeletons and empty/error states.
- Patterns: list/detail, filters, bulk selection, command menu, confirmation, permission-denied and onboarding checklist.
- Maintain one coherent visual language across public and authenticated experiences.

---

## 10. Workstream 7 — API, backend and integrations

### API conventions
- Keep Supabase client access behind typed domain services/hooks; components should not contain ad-hoc SQL/RPC business logic.
- Use RPCs for atomic multi-step domain operations and authorization-sensitive state transitions.
- Use Edge Functions/server endpoints for secrets, external providers, inbound webhooks and privileged operations.
- Standardize validation, pagination, sorting, filtering, error codes, idempotency and correlation IDs.
- Version externally consumed APIs and document request/response schemas.

### Service boundaries
- Auth/profile service.
- Organization/membership service.
- Authorization/permission service.
- Team service.
- CRM service.
- Project/task service.
- Document/file service.
- Activity/audit service.
- Notification service.
- Integration/webhook service.

### Integration sequence
1. Email delivery for verification, recovery and invitations.
2. Google OAuth after provider configuration.
3. Calendar/email integrations only after consent and scope model.
4. Import/export (CSV) for CRM and projects.
5. Webhooks with signature verification, replay protection and delivery retries.
6. Optional third-party storage/editor/communication providers after product decision.

### Operational requirements
- Environment-specific secrets and redirect allow-lists.
- Rate limits and abuse controls on public/auth endpoints.
- Retry/backoff and dead-letter visibility for async work.
- Structured logs with correlation IDs and redaction.
- Background jobs for reminders, notification fan-out and cleanup.
- Backup/restore and migration rollback/recovery plan.

---

## 11. Workstream 8 — Security, QA and release verification (deferred stage)

This workstream is intentionally planned now but execution is deferred until the complete product workflows and interfaces are implemented, as requested.

### Security review
- Tenant isolation and cross-tenant IDOR checks.
- RLS policy review for every exposed table.
- Function grants and SECURITY DEFINER review.
- Auth/session, OAuth redirect, email and invitation abuse checks.
- File upload/download authorization and signed URL expiry.
- XSS, CSRF where applicable, injection, SSRF in integrations, rate limiting and secrets handling.
- Dependency and supply-chain checks.
- Audit log integrity and sensitive-data redaction.

### QA coverage
- Unit tests for domain logic and validation.
- Component tests for UI states and accessibility.
- Integration tests for RPCs, RLS and storage.
- Multi-user E2E: owner/admin/manager/contributor/client/vendor and outsider.
- Workflow E2E for signup, consent, organization creation, invitation, role changes, CRM, project delivery, files and notifications.
- Responsive/browser tests and performance budgets.
- Migration-from-empty and upgrade-path tests.

### Release gates
- All required workflows implemented.
- Staging migration chain reproducible.
- No critical/high security issues.
- No cross-tenant access.
- Required E2E and regression suites pass.
- Error monitoring, backup and rollback plan ready.
- Explicit human approval before production migration/deployment.

---

## 12. Execution backlog and task sequencing

### Phase A — Foundation closure
1. Inventory current schema, migrations, triggers, functions, policies, grants and indexes.
2. Reconcile reconstructed baseline with intended domain model.
3. Define final canonical schema and migration naming/source of truth.
4. Complete staging environment configuration and frontend environment contract.
5. Add typed database/domain contracts and seed system permission catalogue.
6. Document backup, reset and migration recovery rules.

### Phase B — Identity and tenant lifecycle
1. Finish signup/login/recovery/OAuth consent behavior.
2. Finish profile/settings bootstrap and legal consent versioning.
3. Finish organization create/join/switch and onboarding checklist.
4. Finish invitation create/accept/revoke/resend/expiry workflows.
5. Finish member directory, deactivate/reactivate and ownership transfer design.

### Phase C — RBAC and teams
1. Permission catalogue by module/action.
2. System roles and organization custom roles.
3. Permission assignment UI and guarded role mutation RPCs.
4. Team schema, membership, lead/manager and team hierarchy.
5. Team assignment to projects and CRM records.
6. Permission-aware navigation and resource-level access.

### Phase D — Core business modules
1. CRM schema and lead/account/contact/opportunity workflows.
2. CRM pipeline, interactions, follow-ups and reporting.
3. Project/milestone/task schema and lifecycle.
4. Project views, workload and collaboration.
5. Document/folder/file metadata and private storage lifecycle.
6. Activity event catalogue and timeline.
7. Notification outbox, preferences and inbox.

### Phase E — Product experience
1. Design system and application shell.
2. Public landing page.
3. Auth and organization onboarding screens.
4. Dashboard and global navigation.
5. Teams and settings interfaces.
6. CRM interfaces.
7. Project/work interfaces.
8. Documents/files interfaces.
9. Notifications/activity interfaces.
10. Responsive polish, accessibility and empty/loading/error states.

### Phase F — API and integration completion
1. Typed service layer and standardized errors.
2. RPC/Edge Function boundaries and API docs.
3. Email and OAuth provider configuration.
4. Webhook infrastructure and event delivery.
5. Import/export and selected external integrations.
6. Observability, retries and operational controls.

### Phase G — QA and release
Execute Workstream 8 only after the user confirms the workflow implementation is complete and ready for test/verification.

---

## 13. Definition of workflow-complete

A module is workflow-complete when:
- Its user journeys and permission matrix are documented.
- Its schema and migration are committed.
- Its service/API contract is documented.
- Its UI routes and all key states exist.
- It emits required activity/notification events.
- It has loading, empty, error, success and denied states.
- It respects tenant, role and resource boundaries by design.
- Its dependencies and unfinished items are explicitly tracked.

**Workflow-complete does not mean tested, verified or production-ready.** Those are separate release gates in Phase G.

## 14. Current known status and constraints

- Existing MONK repository contains React/Vite frontend, Supabase schema snapshot and Phase 2 authentication/organization work.
- Staging project is separate from production. Existing staging smoke run is not full functional E2E.
- Authentication and organization UI/RPCs exist in partial form; this blueprint does not claim all edge cases are implemented.
- RBAC currently has only a small initial invitation permission seed; the full permission catalogue, custom roles and teams remain to be implemented.
- CRM, complete project management, document/file management, notifications and complete activity UX remain planned workstreams.
- Existing README scope statements must be reconciled as modules are implemented.
- PRs remain open; do not merge or deploy without explicit approval.
- Production remains untouched and must not be used for test data.

---

## 15. Next implementation unit

Start Phase A, task 1: perform a read-only inventory of the current staging schema and repository migrations, then write a schema reconciliation matrix mapping existing objects to the target domains in this blueprint. Do not create organizations/users or apply production changes as part of inventory.
