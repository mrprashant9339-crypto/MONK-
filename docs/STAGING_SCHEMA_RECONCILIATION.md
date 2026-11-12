# MONK staging schema reconciliation

Captured 2026-11-12. Target: staging project ysspnuldfiijagagwiqk, ap-south-1. Read-only catalog inspection; no user/tenant rows were read or copied. Production was not queried or modified.

## Baseline inventory before this workflow extension

| Object | Count |
|---|---:|
| Public tables | 26 |
| RLS enabled | 26 / 26 |
| Policies | 28 |
| Public triggers | 10 |
| Public functions | 68 |
| Built-in roles | 8 |
| Permission catalogue | 1 |
| Role-permission links | 2 |

## Existing tables

activities, audit_logs, companies, contacts, feature_flags, file_versions, files, folders, invitations, leads, legal_consents, milestones, notifications, organization_members, organizations, permissions, profiles, project_members, projects, review_events, role_permissions, roles, task_comments, tasks, tenant_flags, user_settings.

## Reconciliation

| Domain | Existing | Added by workflow migrations | Still to implement |
|---|---|---|---|
| Identity | profiles, user_settings, legal_consents, auth bootstrap | — | OAuth consent completion, profile/security UX |
| Organization | organizations, members, invitations | — | member lifecycle, ownership transfer, resumable onboarding |
| RBAC | roles, permissions, role_permissions | permission catalogue, organization_roles, organization_role_permissions, custom role membership | complete role/member administration UX |
| Teams | — | teams, team_members, guarded create/add-member RPCs | update/remove/team hierarchy cycle guard, team UX |
| CRM | companies, contacts, leads | crm_pipelines, crm_pipeline_stages, opportunities, pipeline and stage RPCs | lead conversion, stage history, reporting, CRM UX |
| Projects | projects, project_members, milestones, tasks, task_comments | task_dependencies | workload, richer history, views and UX |
| Files | folders, files, file_versions, review_events | document_shares | private Storage policies and signed upload/download services |
| Notifications | notifications, user_settings preferences | notification_preferences, notification_outbox | event fan-out worker, delivery adapters and inbox UX |
| Activity/audit | activities, audit_logs | — | consistent event emission and timeline UX |
| Integrations | feature_flags, tenant_flags | — | provider connections, webhook registry and delivery |

## Migration history observed before the new extension

20261111132958 reconstructed_monk_foundation_baseline; 20261111133418 organization switch/invitations; 20261111133423 invitation validation; 20261111133427 audit RPC argument fix; 20261111133511 secure task access/RPC grants; 20261111133523 revoke trigger function RPC; 20261112004719 auth bootstrap/invitation RBAC.

The foundation baseline is a reconstructed catalog snapshot, not recovered historical migration source.

## Additive migrations applied to staging

- 20261112120000_expand_monk_rbac_teams_crm_workflows
- 20261112133000_guarded_rbac_team_crm_workflows
- 20261112134500_include_custom_role_members_in_tenant_membership
- 20261112140000_preserve_builtin_membership_role_for_custom_roles

They add module permissions and role bundles; organization-scoped custom roles; teams; CRM pipelines/stages/opportunities; task dependencies; document shares; notification preferences/outbox; RLS policies and guarded RPCs. They do not create test users, organizations or business records.

## Security advisor observations

Staging advisor snapshot reported one public-schema citext extension warning and twenty authenticated-executable SECURITY DEFINER functions. Some are intended application RPCs; helper functions require individual caller/ACL/body review. Do not blanket-revoke them because that can break RLS helpers and application flows.

## Remaining foundation work

1. Reconcile migration filenames/history and establish clean-install/upgrade automation.
2. Generate TypeScript database types.
3. Add team hierarchy cycle prevention and opportunity stage history.
4. Complete member lifecycle, team update/removal, file share lifecycle and notification preference RPCs.
5. Add private Storage bucket policies and signed upload/download Edge Functions.
6. Implement notification outbox worker and provider delivery.
7. Review SECURITY DEFINER grants individually; plan citext extension move.
8. Implement module UX and typed domain service layer before QA.

## Deferred by request

Functional tests, E2E, advisor remediation, performance verification and release acceptance are deferred until requested. No production changes or production data copies were made.
