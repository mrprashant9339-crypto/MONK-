# MONK staging schema reconciliation — inventory snapshot

**Captured:** 2026-11-12  
**Target:** staging project `ysspnuldfiijagagwiqk` (ap-south-1)  
**Method:** read-only catalog inspection. No tenant/user rows were read or copied.  
**Production:** not queried or modified in this inventory.

## 1. Current catalog counts

| Object | Current count | Finding |
|---|---:|---|
| Public base tables | 26 | Existing foundation is substantial |
| Tables with RLS | 26 / 26 | RLS enabled on all inventoried public tables |
| Tables without RLS | 0 | No exception observed |
| RLS policies | 28 | Policies exist across all current functional areas |
| Public triggers | 10 | Updated-at triggers plus auth bootstrap trigger in auth schema |
| Public functions | 68 | Includes domain RPCs and helper functions |
| System roles | 8 | owner, admin, manager, sales, contributor, auditor, client, vendor |
| Permission catalogue before extension | 1 | Only organization.members.invite |
| Role-permission links before extension | 2 | Owner/admin invite grants |
| Staging development branches | 0 | No Supabase preview branch returned |

## 2. Existing public tables

`activities`, `audit_logs`, `companies`, `contacts`, `feature_flags`, `file_versions`, `files`, `folders`, `invitations`, `leads`, `legal_consents`, `milestones`, `notifications`, `organization_members`, `organizations`, `permissions`, `profiles`, `project_members`, `projects`, `review_events`, `role_permissions`, `roles`, `task_comments`, `tasks`, `tenant_flags`, `user_settings`.

## 3. Existing capability mapping

| Domain | Existing objects | Gap / next work |
|---|---|---|
| Identity | profiles, user_settings, legal_consents; auth.users bootstrap trigger | OAuth legal-consent completion, profile UX, session/account settings |
| Organization | organizations, organization_members, invitations | Member lifecycle, resend/expiry UX, owner transfer, onboarding checklist |
| RBAC | roles, permissions, role_permissions | Permission catalogue, custom roles, scoped grants and management UX |
| Teams | None in baseline | Added by migration 20261112120000 |
| CRM | companies, contacts, leads, activities | Pipelines, stages and opportunities added by migration; lead conversion, CRM UX and reporting remain |
| Project management | projects, project_members, milestones, tasks, task_comments | Dependencies added by migration; status history, views, workload, richer comments remain |
| Files/documents | folders, files, file_versions, review_events | Document shares added by migration; storage policies, signed upload/download service, retention and UI remain |
| Notifications | notifications, user_settings.notification_preferences | Per-category preferences and delivery outbox added by migration; event fan-out, delivery worker and UI remain |
| Activity/audit | activities, audit_logs | Event taxonomy, consistent event emission and feed UX remain |
| Integrations | feature_flags, tenant_flags | Provider connections, webhook registry/delivery and integration UI remain |

## 4. Existing database functions

The inspected public functions include:
- Auth/tenant: handle_new_user, create_organization, switch_organization, has_org_role, has_org_permission, is_org_member.
- Invitations: create_organization_invitation, accept_organization_invitation, revoke_organization_invitation.
- CRM: create_contact, create_lead.
- Projects/tasks: create_project, create_task, update_task.
- Files: can_read_file, review_document.
- Audit: record_audit.
- Shared access helpers: can_read_project, can_read_task, current_member_id, current_organization_id.

All function signatures and grants must be treated as contracts. Do not change RPC signatures without updating frontend callers and the migration/API contract.

## 5. Migration history observed

| Version | Migration |
|---|---|
| 20261111132958 | reconstructed_monk_foundation_baseline |
| 20261111133418 | Phase 2 organization switch/invitations |
| 20261111133423 | Invitation validation and organization switch hardening |
| 20261111133427 | Audit RPC argument fix |
| 20261111133511 | Secure task access and RPC permissions |
| 20261111133523 | Revoke trigger function RPC |
| 20261112004719 | Auth user bootstrap and invitation RBAC |
| 20261112013215 | Expand MONK RBAC, teams and CRM workflows |

The first migration is a reconstructed schema snapshot, not recovered historical source migrations. Keep that distinction explicit.

## 6. RBAC and team extension applied to staging

Migration `20261112120000_expand_monk_rbac_teams_crm_workflows` was applied successfully to the dedicated staging project. It adds:
- Expanded module/action permission catalogue and built-in role permission bundles.
- Organization-scoped custom roles and custom-role permission links.
- Optional custom role reference on organization membership.
- Team and team-member tables.
- CRM pipelines, stages and opportunities.
- Task dependencies and document shares.
- Notification preferences and notification delivery outbox.
- RLS policies and authenticated grants for the new tenant tables.
- Custom-role-aware `has_org_permission` implementation.

The migration is additive. It does not create organizations, auth users or business records.

## 7. Security advisor observations

A staging security-advisor snapshot reported:
- One warning for `citext` installed in public schema.
- Twenty SECURITY DEFINER functions executable by authenticated users.

Some are intentional, user-facing RPCs (e.g. create organization, accept invitation, create task); others are access helper functions and require per-function review. Do not blanket-revoke all 20: that could break RLS and app flows. Review each function body, caller, ACL and SECURITY DEFINER need, then tighten only with a documented compatibility plan.

## 8. Remaining database foundation work

1. Reconcile all SQL files in Git against staging migration history; migration filenames and recorded versions currently differ in naming style.
2. Add generated database types to the repository and use them in domain service contracts.
3. Implement guarded RPCs for custom-role creation/update, role assignment, team creation/membership, opportunity stage transitions and document sharing.
4. Add indexes/constraints for observed query patterns and ensure team hierarchy cannot form cycles.
5. Implement storage bucket policies and signed upload/download Edge Functions; metadata RLS alone does not secure object storage.
6. Implement event-to-notification outbox fan-out and a trusted worker; the outbox table alone does not send notifications.
7. Review SECURITY DEFINER ACLs individually and address the public citext extension warning through a planned schema migration.
8. Add a migration reconciliation and clean-install procedure before QA.

## 9. Explicitly not done

- No functional tests, E2E, advisor remediation or performance verification were run as part of the user's deferred QA instruction.
- No production schema/data changes.
- No production data copy.
- No auth test users, organizations or business seed rows created.
- No PR merge or deployment.
