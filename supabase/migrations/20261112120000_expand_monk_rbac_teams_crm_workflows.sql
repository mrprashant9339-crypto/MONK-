-- MONK Phase A/B foundation extension: RBAC, teams and CRM pipeline.
-- Additive only. Applied to dedicated staging project; production is not targeted.

begin;

-- Expand the canonical permission catalogue.
insert into public.permissions(id, description) values
('organization.profile.read','View organization profile'),
('organization.profile.manage','Update organization profile and settings'),
('organization.members.read','View organization members'),
('organization.members.manage','Add, update, deactivate and remove members'),
('organization.roles.read','View roles and permission assignments'),
('organization.roles.manage','Create and manage organization roles and permission assignments'),
('teams.read','View teams and team membership'),
('teams.manage','Create teams and manage team membership'),
('crm.companies.read','View CRM companies'),
('crm.companies.manage','Create and update CRM companies'),
('crm.contacts.read','View CRM contacts'),
('crm.contacts.manage','Create and update CRM contacts'),
('crm.leads.read','View CRM leads'),
('crm.leads.manage','Create, update and qualify CRM leads'),
('crm.opportunities.read','View sales opportunities'),
('crm.opportunities.manage','Create and manage sales opportunities'),
('crm.pipeline.manage','Manage CRM pipelines and stages'),
('projects.read','View projects'),
('projects.manage','Create and manage projects'),
('projects.tasks.read','View tasks'),
('projects.tasks.manage','Create, update and assign tasks'),
('files.read','View files and documents'),
('files.manage','Upload, update, move and delete files'),
('files.share','Share files and manage document access'),
('activities.read','View organization activity feed'),
('notifications.manage','Manage notification preferences'),
('audit.read','View organization audit logs'),
('reports.read','View organization reports'),
('integrations.manage','Manage external integrations')
on conflict (id) do update set description=excluded.description;

-- Built-in role permission templates. Owner/admin are intentionally broad;
-- other roles receive least-privilege module bundles.
insert into public.role_permissions(role_id,permission_id)
select r.role_id, p.permission_id
from (values
 ('owner','organization.profile.read'),('owner','organization.profile.manage'),('owner','organization.members.read'),('owner','organization.members.manage'),('owner','organization.members.invite'),('owner','organization.roles.read'),('owner','organization.roles.manage'),('owner','teams.read'),('owner','teams.manage'),('owner','crm.companies.read'),('owner','crm.companies.manage'),('owner','crm.contacts.read'),('owner','crm.contacts.manage'),('owner','crm.leads.read'),('owner','crm.leads.manage'),('owner','crm.opportunities.read'),('owner','crm.opportunities.manage'),('owner','crm.pipeline.manage'),('owner','projects.read'),('owner','projects.manage'),('owner','projects.tasks.read'),('owner','projects.tasks.manage'),('owner','files.read'),('owner','files.manage'),('owner','files.share'),('owner','activities.read'),('owner','notifications.manage'),('owner','audit.read'),('owner','reports.read'),('owner','integrations.manage'),
 ('admin','organization.profile.read'),('admin','organization.profile.manage'),('admin','organization.members.read'),('admin','organization.members.manage'),('admin','organization.members.invite'),('admin','organization.roles.read'),('admin','organization.roles.manage'),('admin','teams.read'),('admin','teams.manage'),('admin','crm.companies.read'),('admin','crm.companies.manage'),('admin','crm.contacts.read'),('admin','crm.contacts.manage'),('admin','crm.leads.read'),('admin','crm.leads.manage'),('admin','crm.opportunities.read'),('admin','crm.opportunities.manage'),('admin','crm.pipeline.manage'),('admin','projects.read'),('admin','projects.manage'),('admin','projects.tasks.read'),('admin','projects.tasks.manage'),('admin','files.read'),('admin','files.manage'),('admin','files.share'),('admin','activities.read'),('admin','notifications.manage'),('admin','audit.read'),('admin','reports.read'),('admin','integrations.manage'),
 ('manager','organization.members.read'),('manager','teams.read'),('manager','teams.manage'),('manager','projects.read'),('manager','projects.manage'),('manager','projects.tasks.read'),('manager','projects.tasks.manage'),('manager','files.read'),('manager','files.manage'),('manager','activities.read'),('manager','reports.read'),
 ('sales','crm.companies.read'),('sales','crm.companies.manage'),('sales','crm.contacts.read'),('sales','crm.contacts.manage'),('sales','crm.leads.read'),('sales','crm.leads.manage'),('sales','crm.opportunities.read'),('sales','crm.opportunities.manage'),('sales','projects.read'),('sales','activities.read'),
 ('contributor','projects.read'),('contributor','projects.tasks.read'),('contributor','projects.tasks.manage'),('contributor','files.read'),('contributor','files.manage'),('contributor','activities.read'),
 ('auditor','organization.profile.read'),('auditor','organization.members.read'),('auditor','organization.roles.read'),('auditor','crm.companies.read'),('auditor','crm.contacts.read'),('auditor','crm.leads.read'),('auditor','crm.opportunities.read'),('auditor','projects.read'),('auditor','projects.tasks.read'),('auditor','files.read'),('auditor','activities.read'),('auditor','audit.read'),('auditor','reports.read'),
 ('client','projects.read'),('client','projects.tasks.read'),('client','files.read'),('client','activities.read'),
 ('vendor','projects.read'),('vendor','projects.tasks.read'),('vendor','files.read'),('vendor','activities.read')
) as r(role_id,permission_id)
join public.roles rr on rr.id=r.role_id
join public.permissions pp on pp.id=r.permission_id
on conflict do nothing;

-- Organization-defined roles.
create table if not exists public.organization_roles (
  id uuid primary key default public.uuid_v7(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 60),
  description text not null default '',
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, name)
);

create table if not exists public.organization_role_permissions (
  organization_id uuid not null,
  organization_role_id uuid not null,
  permission_id text not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (organization_role_id, permission_id),
  foreign key (organization_role_id, organization_id)
    references public.organization_roles(id, organization_id) on delete cascade
);

alter table public.organization_members
  add column if not exists organization_role_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='organization_members_custom_role_org_fk') then
    alter table public.organization_members
      add constraint organization_members_custom_role_org_fk
      foreign key (organization_role_id, organization_id)
      references public.organization_roles(id, organization_id);
  end if;
end $$;

-- Replace permission helper so custom roles are evaluated within the same tenant.
create or replace function public.has_org_permission(target_org uuid, permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_org
      and om.user_id = (select auth.uid())
      and om.status = 'active'
      and (
        exists (
          select 1 from public.role_permissions rp
          where rp.role_id = om.role and rp.permission_id = permission_key
        )
        or exists (
          select 1
          from public.organization_role_permissions orp
          join public.organization_roles org_role
            on org_role.id = orp.organization_role_id
           and org_role.organization_id = orp.organization_id
          where orp.organization_id = om.organization_id
            and orp.organization_role_id = om.organization_role_id
            and orp.permission_id = permission_key
            and org_role.is_active
        )
      )
  );
$$;

-- Team structure and membership, scoped to an organization.
create table if not exists public.teams (
  id uuid primary key default public.uuid_v7(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_team_id uuid,
  name text not null check (length(trim(name)) between 2 and 80),
  description text not null default '',
  team_type text not null default 'functional' check (team_type in ('functional','project','sales','operations','support')),
  team_lead_member_id uuid,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, name),
  foreign key (parent_team_id, organization_id) references public.teams(id, organization_id),
  foreign key (team_lead_member_id, organization_id) references public.organization_members(id, organization_id)
);

create table if not exists public.team_members (
  id uuid primary key default public.uuid_v7(),
  organization_id uuid not null,
  team_id uuid not null,
  organization_member_id uuid not null,
  team_role text not null default 'member' check (team_role in ('lead','manager','member')),
  joined_at timestamptz not null default now(),
  unique (team_id, organization_member_id),
  foreign key (team_id, organization_id) references public.teams(id, organization_id) on delete cascade,
  foreign key (organization_member_id, organization_id) references public.organization_members(id, organization_id) on delete cascade
);

create index if not exists teams_org_active_idx on public.teams(organization_id,is_active);
create index if not exists team_members_org_member_idx on public.team_members(organization_id,organization_member_id);

-- CRM pipeline and opportunity lifecycle.
create table if not exists public.crm_pipelines (
  id uuid primary key default public.uuid_v7(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 80),
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, name)
);

create table if not exists public.crm_pipeline_stages (
  id uuid primary key default public.uuid_v7(),
  organization_id uuid not null,
  pipeline_id uuid not null,
  name text not null check (length(trim(name)) between 2 and 60),
  position integer not null check (position >= 0),
  probability numeric(5,2) not null default 0 check (probability between 0 and 100),
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (pipeline_id, position),
  foreign key (pipeline_id, organization_id) references public.crm_pipelines(id, organization_id) on delete cascade,
  check (not (is_won and is_lost))
);

create table if not exists public.opportunities (
  id uuid primary key default public.uuid_v7(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pipeline_id uuid not null,
  stage_id uuid not null,
  company_id uuid,
  primary_contact_id uuid,
  name text not null check (length(trim(name)) between 2 and 160),
  amount numeric(14,2) not null default 0 check (amount >= 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  expected_close_date date,
  owner_member_id uuid,
  status text not null default 'open' check (status in ('open','won','lost')),
  loss_reason text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (pipeline_id, organization_id) references public.crm_pipelines(id, organization_id),
  foreign key (stage_id, organization_id) references public.crm_pipeline_stages(id, organization_id),
  foreign key (company_id, organization_id) references public.companies(id, organization_id),
  foreign key (primary_contact_id, organization_id) references public.contacts(id, organization_id),
  foreign key (owner_member_id, organization_id) references public.organization_members(id, organization_id)
);

create index if not exists opportunities_org_stage_idx on public.opportunities(organization_id,pipeline_id,stage_id) where deleted_at is null;
create index if not exists opportunities_org_owner_idx on public.opportunities(organization_id,owner_member_id) where deleted_at is null;

-- Additional workflow primitives.
create table if not exists public.task_dependencies (
  organization_id uuid not null,
  task_id uuid not null,
  depends_on_task_id uuid not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (task_id, depends_on_task_id),
  foreign key (task_id, organization_id) references public.tasks(id, organization_id) on delete cascade,
  foreign key (depends_on_task_id, organization_id) references public.tasks(id, organization_id) on delete cascade,
  check (task_id <> depends_on_task_id)
);

create table if not exists public.document_shares (
  id uuid primary key default public.uuid_v7(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  file_id uuid not null,
  shared_with_user_id uuid references auth.users(id) on delete cascade,
  permission text not null default 'view' check (permission in ('view','download','edit')),
  expires_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (file_id, organization_id) references public.files(id, organization_id) on delete cascade,
  check (expires_at is null or expires_at > created_at),
  check (shared_with_user_id is not null)
);

create table if not exists public.notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, organization_id, category)
);

create table if not exists public.notification_outbox (
  id uuid primary key default public.uuid_v7(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','discarded')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (organization_id,recipient_user_id,event_key)
);

-- RLS for all new tenant-owned tables.
alter table public.organization_roles enable row level security;
alter table public.organization_role_permissions enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.crm_pipelines enable row level security;
alter table public.crm_pipeline_stages enable row level security;
alter table public.opportunities enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.document_shares enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_outbox enable row level security;

create policy "tenant custom roles read" on public.organization_roles
for select to authenticated using (public.is_org_member(organization_id));
create policy "admins manage custom roles" on public.organization_roles
for all to authenticated using (public.has_org_permission(organization_id,'organization.roles.manage'))
with check (public.has_org_permission(organization_id,'organization.roles.manage'));

create policy "tenant custom role permissions read" on public.organization_role_permissions
for select to authenticated using (public.is_org_member(organization_id));
create policy "admins manage custom role permissions" on public.organization_role_permissions
for all to authenticated using (public.has_org_permission(organization_id,'organization.roles.manage'))
with check (public.has_org_permission(organization_id,'organization.roles.manage'));

create policy "tenant teams read" on public.teams
for select to authenticated using (public.is_org_member(organization_id));
create policy "team managers manage teams" on public.teams
for all to authenticated using (public.has_org_permission(organization_id,'teams.manage'))
with check (public.has_org_permission(organization_id,'teams.manage'));

create policy "tenant team members read" on public.team_members
for select to authenticated using (public.is_org_member(organization_id));
create policy "team managers manage team members" on public.team_members
for all to authenticated using (public.has_org_permission(organization_id,'teams.manage'))
with check (public.has_org_permission(organization_id,'teams.manage'));

create policy "tenant crm pipelines read" on public.crm_pipelines
for select to authenticated using (public.has_org_permission(organization_id,'crm.opportunities.read'));
create policy "crm admins manage pipelines" on public.crm_pipelines
for all to authenticated using (public.has_org_permission(organization_id,'crm.pipeline.manage'))
with check (public.has_org_permission(organization_id,'crm.pipeline.manage'));

create policy "tenant crm stages read" on public.crm_pipeline_stages
for select to authenticated using (public.has_org_permission(organization_id,'crm.opportunities.read'));
create policy "crm admins manage stages" on public.crm_pipeline_stages
for all to authenticated using (public.has_org_permission(organization_id,'crm.pipeline.manage'))
with check (public.has_org_permission(organization_id,'crm.pipeline.manage'));

create policy "tenant opportunities read" on public.opportunities
for select to authenticated using (public.has_org_permission(organization_id,'crm.opportunities.read'));
create policy "crm users manage opportunities" on public.opportunities
for all to authenticated using (public.has_org_permission(organization_id,'crm.opportunities.manage'))
with check (public.has_org_permission(organization_id,'crm.opportunities.manage'));

create policy "tenant task dependencies read" on public.task_dependencies
for select to authenticated using (public.has_org_permission(organization_id,'projects.tasks.read'));
create policy "task managers manage dependencies" on public.task_dependencies
for all to authenticated using (public.has_org_permission(organization_id,'projects.tasks.manage'))
with check (public.has_org_permission(organization_id,'projects.tasks.manage'));

create policy "tenant document shares read" on public.document_shares
for select to authenticated using (public.has_org_permission(organization_id,'files.read'));
create policy "file managers manage shares" on public.document_shares
for all to authenticated using (public.has_org_permission(organization_id,'files.share'))
with check (public.has_org_permission(organization_id,'files.share'));

create policy "users read own notification preferences" on public.notification_preferences
for select to authenticated using (user_id=(select auth.uid()) and public.is_org_member(organization_id));
create policy "users manage own notification preferences" on public.notification_preferences
for all to authenticated using (user_id=(select auth.uid()) and public.is_org_member(organization_id))
with check (user_id=(select auth.uid()) and public.is_org_member(organization_id));

create policy "users read own notification outbox" on public.notification_outbox
for select to authenticated using (recipient_user_id=(select auth.uid()) and public.is_org_member(organization_id));

-- No direct client writes to the delivery outbox; trusted backend workers own delivery.
revoke all on public.notification_outbox from anon, authenticated;
grant select on public.notification_outbox to authenticated;

-- Restrict direct mutation of system role/permission catalog; membership role changes
-- are exposed only through guarded server-side workflows.
revoke insert, update, delete on public.roles, public.permissions, public.role_permissions from anon, authenticated;

grant select on public.organization_roles, public.organization_role_permissions,
  public.teams, public.team_members, public.crm_pipelines, public.crm_pipeline_stages,
  public.opportunities, public.task_dependencies, public.document_shares,
  public.notification_preferences to authenticated;
grant insert, update, delete on public.organization_roles, public.organization_role_permissions,
  public.teams, public.team_members, public.crm_pipelines, public.crm_pipeline_stages,
  public.opportunities, public.task_dependencies, public.document_shares,
  public.notification_preferences to authenticated;

-- Keep helper private to authenticated sessions; SECURITY DEFINER is narrowly scoped.
revoke all on function public.has_org_permission(uuid,text) from public, anon;
grant execute on function public.has_org_permission(uuid,text) to authenticated;

commit;