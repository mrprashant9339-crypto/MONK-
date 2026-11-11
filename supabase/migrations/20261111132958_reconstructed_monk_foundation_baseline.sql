-- MONK reconstructed schema-only baseline from production catalog. Not original history; no rows or secrets copied.
create extension if not exists citext with schema public;
create or replace function public.uuid_v7() returns uuid language plpgsql set search_path=public as $$
declare unix_ts_ms bigint; value bytea;
begin
 unix_ts_ms:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
 value:=extensions.gen_random_bytes(16);
 value:=set_byte(value,0,((unix_ts_ms>>40)&255)::integer);
 value:=set_byte(value,1,((unix_ts_ms>>32)&255)::integer);
 value:=set_byte(value,2,((unix_ts_ms>>24)&255)::integer);
 value:=set_byte(value,3,((unix_ts_ms>>16)&255)::integer);
 value:=set_byte(value,4,((unix_ts_ms>>8)&255)::integer);
 value:=set_byte(value,5,(unix_ts_ms&255)::integer);
 value:=set_byte(value,6,(get_byte(value,6)&15)|112);
 value:=set_byte(value,8,(get_byte(value,8)&63)|128);
 return encode(value,'hex')::uuid;
end; $$;
create table public.activities (
  id uuid NOT NULL DEFAULT uuid_v7(),
  organization_id uuid NOT NULL,
  actor_user_id uuid,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  kind text NOT NULL,
  body text NOT NULL,
  visibility text NOT NULL DEFAULT 'internal'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

create table public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  organization_id uuid NOT NULL,
  actor_user_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  before_diff jsonb,
  after_diff jsonb,
  ip_address inet,
  user_agent text,
  request_id text NOT NULL,
  ai_involved boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

create table public.companies (
  id uuid NOT NULL DEFAULT uuid_v7(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  domain citext,
  industry text,
  size_band text,
  annual_value_band text,
  owner_id uuid,
  address text,
  phone text,
  website text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  source text,
  status text NOT NULL DEFAULT 'prospect'::text,
  custom jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

create table public.contacts (
  id uuid NOT NULL DEFAULT uuid_v7(),
  organization_id uuid NOT NULL,
  company_id uuid,
  first_name text NOT NULL,
  last_name text NOT NULL DEFAULT ''::text,
  email citext NOT NULL,
  phone text,
  title text,
  owner_id uuid,
  consent_basis text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  marketing_opt_in boolean NOT NULL DEFAULT false,
  marketing_consent_at timestamp with time zone,
  marketing_consent_source text,
  custom jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

create table public.feature_flags (
  key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  description text NOT NULL DEFAULT ''::text
);

create table public.file_versions (
  id uuid NOT NULL DEFAULT uuid_v7(),
  organization_id uuid NOT NULL,
  file_id uuid NOT NULL,
  version_number integer NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  scan_status text NOT NULL DEFAULT 'pending'::text,
  author_user_id uuid NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

create table public.files (
  id uuid NOT NULL DEFAULT uuid_v7(),
  organization_id uuid NOT NULL,
  folder_id uuid,
  project_id uuid,
  owner_id uuid,
  name text NOT NULL,
  review_status text NOT NULL DEFAULT 'draft'::text,
  confidentiality text NOT NULL DEFAULT 'internal'::text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  current_version_id uuid,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

create table public.folders (
  id uuid NOT NULL DEFAULT uuid_v7(),
  organization_id uuid NOT NULL,
  project_id uuid,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

create table public.invitations (
  id uuid NOT NULL DEFAULT uuid_v7(),
  organization_id uuid NOT NULL,
  email citext NOT NULL,
  role text NOT NULL,
  token_hash text NOT NULL,
  invited_by uuid,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

create table public.leads (
  id uuid NOT NULL DEFAULT uuid_v7(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  email citext,
  phone text,
  source text NOT NULL,
  owner_id uuid,
  status text NOT NULL DEFAULT 'new'::text,
  score integer NOT NULL DEFAULT 0,
  need text,
  budget_band text,
  timeline text,
  decision_maker text,
  notes text,
  next_action text,
  next_action_at timestamp with time zone,
  disqualification_reason text,
  converted_contact_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

create table public.legal_consents (
  id uuid NOT NULL DEFAULT uuid_v7(),
  user_id uuid NOT NULL,
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  accepted_at timestamp with time zone NOT NULL DEFAULT now()
);

create table public.milestones (
  id uuid NOT NULL DEFAULT uuid_v7(),
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  name text NOT NULL,
  due_date date,
  status text NOT NULL DEFAULT 'planned'::text,
  "position" integer NOT NULL DEFAULT 0,
  acceptance_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

create table public.notifications (
  id uuid NOT NULL DEFAULT uuid_v7(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  body text,
  resource_type text,
  resource_id uuid,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

create table public.organization_members (
  id uuid NOT NULL DEFAULT uuid_v7(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

create table public.organizations (
  id uuid NOT NULL DEFAULT uuid_v7(),
  name text NOT NULL,
  slug citext NOT NULL,
  country text NOT NULL DEFAULT 'IN'::text,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata'::text,
  currency text NOT NULL DEFAULT 'INR'::text,
  locale text NOT NULL DEFAULT 'en-IN'::text,
  industry text NOT NULL DEFAULT 'Professional services'::text,
  slug_changed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  vertical text NOT NULL DEFAULT 'business'::text
);

create table public.permissions (
  id text NOT NULL,
  description text NOT NULL
);

create table public.profiles (
  id uuid NOT NULL,
  full_name text NOT NULL DEFAULT ''::text,
  avatar_url text,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

create table public.project_members (
  id uuid NOT NULL DEFAULT uuid_v7(),
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  member_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

create table public.projects (
  id uuid NOT NULL DEFAULT uuid_v7(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  client_company_id uuid,
  manager_id uuid,
  status text NOT NULL DEFAULT 'draft'::text,
  health text NOT NULL DEFAULT 'on_track'::text,
  start_date date,
  due_date date,
  description text,
  visibility text NOT NULL DEFAULT 'internal'::text,
  template_origin text,
  closing_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

create table public.review_events (
  id uuid NOT NULL DEFAULT uuid_v7(),
  organization_id uuid NOT NULL,
  file_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

create table public.role_permissions (
  role_id text NOT NULL,
  permission_id text NOT NULL
);

create table public.roles (
  id text NOT NULL,
  description text NOT NULL,
  is_system boolean NOT NULL DEFAULT true
);

create table public.task_comments (
  id uuid NOT NULL DEFAULT uuid_v7(),
  organization_id uuid NOT NULL,
  task_id uuid NOT NULL,
  author_user_id uuid NOT NULL,
  body text NOT NULL,
  visibility text NOT NULL DEFAULT 'internal'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  edited_at timestamp with time zone,
  deleted_at timestamp with time zone
);

create table public.tasks (
  id uuid NOT NULL DEFAULT uuid_v7(),
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  milestone_id uuid,
  title text NOT NULL,
  description text,
  assignee_id uuid,
  status text NOT NULL DEFAULT 'todo'::text,
  priority text NOT NULL DEFAULT 'medium'::text,
  due_date date,
  estimate_hours numeric(8,2),
  blocker_reason text,
  labels text[] NOT NULL DEFAULT '{}'::text[],
  visibility text NOT NULL DEFAULT 'internal'::text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

create table public.tenant_flags (
  organization_id uuid NOT NULL,
  flag_key text NOT NULL,
  enabled boolean NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

create table public.user_settings (
  user_id uuid NOT NULL,
  active_organization_id uuid,
  notification_preferences jsonb NOT NULL DEFAULT '{"mentions": true, "assignments": true, "email_digest": "daily"}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

alter table public.activities add constraint activities_id_organization_id_key UNIQUE (id, organization_id);

alter table public.activities add constraint activities_pkey PRIMARY KEY (id);

alter table public.audit_logs add constraint audit_logs_pkey PRIMARY KEY (id);

alter table public.companies add constraint companies_id_organization_id_key UNIQUE (id, organization_id);

alter table public.companies add constraint companies_organization_id_domain_key UNIQUE (organization_id, domain);

alter table public.companies add constraint companies_pkey PRIMARY KEY (id);

alter table public.contacts add constraint contacts_id_organization_id_key UNIQUE (id, organization_id);

alter table public.contacts add constraint contacts_organization_id_email_key UNIQUE (organization_id, email);

alter table public.contacts add constraint contacts_pkey PRIMARY KEY (id);

alter table public.feature_flags add constraint feature_flags_pkey PRIMARY KEY (key);

alter table public.file_versions add constraint file_versions_file_id_version_number_key UNIQUE (file_id, version_number);

alter table public.file_versions add constraint file_versions_id_organization_id_key UNIQUE (id, organization_id);

alter table public.file_versions add constraint file_versions_pkey PRIMARY KEY (id);

alter table public.files add constraint files_id_organization_id_key UNIQUE (id, organization_id);

alter table public.files add constraint files_pkey PRIMARY KEY (id);

alter table public.folders add constraint folders_id_organization_id_key UNIQUE (id, organization_id);

alter table public.folders add constraint folders_pkey PRIMARY KEY (id);

alter table public.invitations add constraint invitations_id_organization_id_key UNIQUE (id, organization_id);

alter table public.invitations add constraint invitations_pkey PRIMARY KEY (id);

alter table public.invitations add constraint invitations_token_hash_key UNIQUE (token_hash);

alter table public.leads add constraint leads_id_organization_id_key UNIQUE (id, organization_id);

alter table public.leads add constraint leads_pkey PRIMARY KEY (id);

alter table public.legal_consents add constraint legal_consents_pkey PRIMARY KEY (id);

alter table public.milestones add constraint milestones_id_organization_id_key UNIQUE (id, organization_id);

alter table public.milestones add constraint milestones_pkey PRIMARY KEY (id);

alter table public.notifications add constraint notifications_id_organization_id_key UNIQUE (id, organization_id);

alter table public.notifications add constraint notifications_pkey PRIMARY KEY (id);

alter table public.organization_members add constraint organization_members_id_organization_id_key UNIQUE (id, organization_id);

alter table public.organization_members add constraint organization_members_organization_id_user_id_key UNIQUE (organization_id, user_id);

alter table public.organization_members add constraint organization_members_pkey PRIMARY KEY (id);

alter table public.organizations add constraint organizations_pkey PRIMARY KEY (id);

alter table public.organizations add constraint organizations_slug_key UNIQUE (slug);

alter table public.permissions add constraint permissions_pkey PRIMARY KEY (id);

alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);

alter table public.project_members add constraint project_members_id_organization_id_key UNIQUE (id, organization_id);

alter table public.project_members add constraint project_members_pkey PRIMARY KEY (id);

alter table public.project_members add constraint project_members_project_id_member_id_key UNIQUE (project_id, member_id);

alter table public.projects add constraint projects_id_organization_id_key UNIQUE (id, organization_id);

alter table public.projects add constraint projects_organization_id_code_key UNIQUE (organization_id, code);

alter table public.projects add constraint projects_pkey PRIMARY KEY (id);

alter table public.review_events add constraint review_events_id_organization_id_key UNIQUE (id, organization_id);

alter table public.review_events add constraint review_events_pkey PRIMARY KEY (id);

alter table public.role_permissions add constraint role_permissions_pkey PRIMARY KEY (role_id, permission_id);

alter table public.roles add constraint roles_pkey PRIMARY KEY (id);

alter table public.task_comments add constraint task_comments_id_organization_id_key UNIQUE (id, organization_id);

alter table public.task_comments add constraint task_comments_pkey PRIMARY KEY (id);

alter table public.tasks add constraint tasks_id_organization_id_key UNIQUE (id, organization_id);

alter table public.tasks add constraint tasks_pkey PRIMARY KEY (id);

alter table public.tenant_flags add constraint tenant_flags_pkey PRIMARY KEY (organization_id, flag_key);

alter table public.user_settings add constraint user_settings_pkey PRIMARY KEY (user_id);

alter table public.activities add constraint activities_kind_check CHECK (kind = ANY (ARRAY['note'::text, 'call'::text, 'email'::text, 'meeting'::text, 'task'::text, 'file'::text, 'stage_change'::text, 'system'::text]));

alter table public.activities add constraint activities_visibility_check CHECK (visibility = ANY (ARRAY['internal'::text, 'client_visible'::text]));

alter table public.companies add constraint companies_status_check CHECK (status = ANY (ARRAY['prospect'::text, 'active'::text, 'dormant'::text, 'churned'::text]));

alter table public.file_versions add constraint file_versions_scan_status_check CHECK (scan_status = ANY (ARRAY['pending'::text, 'clean'::text, 'blocked'::text]));

alter table public.file_versions add constraint file_versions_size_bytes_check CHECK (size_bytes >= 0);

alter table public.files add constraint files_confidentiality_check CHECK (confidentiality = ANY (ARRAY['internal'::text, 'confidential'::text, 'client_shared'::text]));

alter table public.files add constraint files_review_status_check CHECK (review_status = ANY (ARRAY['draft'::text, 'in_review'::text, 'approved'::text, 'superseded'::text]));

alter table public.leads add constraint leads_check CHECK (email IS NOT NULL OR phone IS NOT NULL);

alter table public.leads add constraint leads_score_check CHECK (score >= 0 AND score <= 100);

alter table public.leads add constraint leads_source_check CHECK (source = ANY (ARRAY['web_form'::text, 'referral'::text, 'event'::text, 'outbound'::text, 'import'::text, 'marketplace'::text]));

alter table public.leads add constraint leads_status_check CHECK (status = ANY (ARRAY['new'::text, 'contacted'::text, 'qualified'::text, 'converted'::text, 'disqualified'::text]));

alter table public.milestones add constraint milestones_status_check CHECK (status = ANY (ARRAY['planned'::text, 'active'::text, 'met'::text, 'missed'::text]));

alter table public.organization_members add constraint organization_members_status_check CHECK (status = ANY (ARRAY['invited'::text, 'active'::text, 'suspended'::text, 'removed'::text]));

alter table public.organizations add constraint organizations_name_check CHECK (char_length(name) >= 2 AND char_length(name) <= 100);

alter table public.organizations add constraint organizations_slug_check CHECK (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text);

alter table public.organizations add constraint organizations_vertical_check CHECK (vertical = ANY (ARRAY['education'::text, 'business'::text]));

alter table public.projects add constraint projects_health_check CHECK (health = ANY (ARRAY['on_track'::text, 'at_risk'::text, 'off_track'::text]));

alter table public.projects add constraint projects_status_check CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'at_risk'::text, 'in_review'::text, 'completed'::text, 'archived'::text]));

alter table public.projects add constraint projects_visibility_check CHECK (visibility = ANY (ARRAY['internal'::text, 'client_visible'::text]));

alter table public.task_comments add constraint task_comments_visibility_check CHECK (visibility = ANY (ARRAY['internal'::text, 'client_visible'::text]));

alter table public.tasks add constraint tasks_check CHECK (status <> 'blocked'::text OR blocker_reason IS NOT NULL);

alter table public.tasks add constraint tasks_priority_check CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]));

alter table public.tasks add constraint tasks_status_check CHECK (status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'blocked'::text, 'review'::text, 'done'::text]));

alter table public.tasks add constraint tasks_visibility_check CHECK (visibility = ANY (ARRAY['internal'::text, 'client_visible'::text]));

alter table public.activities add constraint activities_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id);

alter table public.activities add constraint activities_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.audit_logs add constraint audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id);

alter table public.audit_logs add constraint audit_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.companies add constraint companies_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.companies add constraint companies_owner_id_organization_id_fkey FOREIGN KEY (owner_id, organization_id) REFERENCES organization_members(id, organization_id);

alter table public.contacts add constraint contacts_company_id_organization_id_fkey FOREIGN KEY (company_id, organization_id) REFERENCES companies(id, organization_id);

alter table public.contacts add constraint contacts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.contacts add constraint contacts_owner_id_organization_id_fkey FOREIGN KEY (owner_id, organization_id) REFERENCES organization_members(id, organization_id);

alter table public.file_versions add constraint file_versions_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES auth.users(id);

alter table public.file_versions add constraint file_versions_file_id_organization_id_fkey FOREIGN KEY (file_id, organization_id) REFERENCES files(id, organization_id) ON DELETE CASCADE;

alter table public.file_versions add constraint file_versions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.files add constraint files_current_version_fk FOREIGN KEY (current_version_id, organization_id) REFERENCES file_versions(id, organization_id);

alter table public.files add constraint files_folder_id_organization_id_fkey FOREIGN KEY (folder_id, organization_id) REFERENCES folders(id, organization_id);

alter table public.files add constraint files_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.files add constraint files_owner_id_organization_id_fkey FOREIGN KEY (owner_id, organization_id) REFERENCES organization_members(id, organization_id);

alter table public.files add constraint files_project_id_organization_id_fkey FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id);

alter table public.folders add constraint folders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.folders add constraint folders_project_id_organization_id_fkey FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE;

alter table public.invitations add constraint invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);

alter table public.invitations add constraint invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.invitations add constraint invitations_role_fkey FOREIGN KEY (role) REFERENCES roles(id);

alter table public.leads add constraint leads_converted_contact_id_organization_id_fkey FOREIGN KEY (converted_contact_id, organization_id) REFERENCES contacts(id, organization_id);

alter table public.leads add constraint leads_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.leads add constraint leads_owner_id_organization_id_fkey FOREIGN KEY (owner_id, organization_id) REFERENCES organization_members(id, organization_id);

alter table public.legal_consents add constraint legal_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.milestones add constraint milestones_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.milestones add constraint milestones_project_id_organization_id_fkey FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE;

alter table public.notifications add constraint notifications_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.notifications add constraint notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.organization_members add constraint organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.organization_members add constraint organization_members_role_fkey FOREIGN KEY (role) REFERENCES roles(id);

alter table public.organization_members add constraint organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.project_members add constraint project_members_member_id_organization_id_fkey FOREIGN KEY (member_id, organization_id) REFERENCES organization_members(id, organization_id);

alter table public.project_members add constraint project_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.project_members add constraint project_members_project_id_organization_id_fkey FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE;

alter table public.projects add constraint projects_client_company_id_organization_id_fkey FOREIGN KEY (client_company_id, organization_id) REFERENCES companies(id, organization_id);

alter table public.projects add constraint projects_manager_id_organization_id_fkey FOREIGN KEY (manager_id, organization_id) REFERENCES organization_members(id, organization_id);

alter table public.projects add constraint projects_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.review_events add constraint review_events_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id);

alter table public.review_events add constraint review_events_file_id_organization_id_fkey FOREIGN KEY (file_id, organization_id) REFERENCES files(id, organization_id) ON DELETE CASCADE;

alter table public.review_events add constraint review_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.role_permissions add constraint role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;

alter table public.role_permissions add constraint role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

alter table public.task_comments add constraint task_comments_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES auth.users(id);

alter table public.task_comments add constraint task_comments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.task_comments add constraint task_comments_task_id_organization_id_fkey FOREIGN KEY (task_id, organization_id) REFERENCES tasks(id, organization_id) ON DELETE CASCADE;

alter table public.tasks add constraint tasks_assignee_id_organization_id_fkey FOREIGN KEY (assignee_id, organization_id) REFERENCES organization_members(id, organization_id);

alter table public.tasks add constraint tasks_milestone_id_organization_id_fkey FOREIGN KEY (milestone_id, organization_id) REFERENCES milestones(id, organization_id);

alter table public.tasks add constraint tasks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.tasks add constraint tasks_project_id_organization_id_fkey FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE;

alter table public.tenant_flags add constraint tenant_flags_flag_key_fkey FOREIGN KEY (flag_key) REFERENCES feature_flags(key) ON DELETE CASCADE;

alter table public.tenant_flags add constraint tenant_flags_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.user_settings add constraint user_settings_active_organization_id_fkey FOREIGN KEY (active_organization_id) REFERENCES organizations(id);

alter table public.user_settings add constraint user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX activities_org_resource_idx ON public.activities USING btree (organization_id, resource_type, resource_id, created_at DESC);

CREATE INDEX audit_logs_org_created_idx ON public.audit_logs USING btree (organization_id, created_at DESC);

CREATE INDEX companies_org_created_idx ON public.companies USING btree (organization_id, created_at DESC);

CREATE INDEX contacts_org_created_idx ON public.contacts USING btree (organization_id, created_at DESC);

CREATE INDEX contacts_org_owner_idx ON public.contacts USING btree (organization_id, owner_id);

CREATE INDEX file_versions_org_file_idx ON public.file_versions USING btree (organization_id, file_id, version_number DESC);

CREATE INDEX files_org_review_idx ON public.files USING btree (organization_id, review_status, updated_at DESC) WHERE (deleted_at IS NULL);

CREATE INDEX folders_org_project_idx ON public.folders USING btree (organization_id, project_id);

CREATE INDEX invitations_org_email_idx ON public.invitations USING btree (organization_id, email, expires_at);

CREATE INDEX leads_org_next_action_idx ON public.leads USING btree (organization_id, next_action_at) WHERE (deleted_at IS NULL);

CREATE INDEX milestones_org_project_idx ON public.milestones USING btree (organization_id, project_id, "position");

CREATE INDEX notifications_org_user_idx ON public.notifications USING btree (organization_id, user_id, read_at, created_at DESC);

CREATE INDEX organization_members_org_user_idx ON public.organization_members USING btree (organization_id, user_id, status);

CREATE INDEX project_members_org_project_idx ON public.project_members USING btree (organization_id, project_id, member_id);

CREATE INDEX projects_org_status_idx ON public.projects USING btree (organization_id, status, updated_at DESC) WHERE (deleted_at IS NULL);

CREATE INDEX review_events_org_file_idx ON public.review_events USING btree (organization_id, file_id, created_at DESC);

CREATE INDEX task_comments_org_task_idx ON public.task_comments USING btree (organization_id, task_id, created_at);

CREATE INDEX tasks_org_assignee_idx ON public.tasks USING btree (organization_id, assignee_id, status, due_date) WHERE (deleted_at IS NULL);

CREATE INDEX tasks_org_project_idx ON public.tasks USING btree (organization_id, project_id, status) WHERE (deleted_at IS NULL);

CREATE INDEX tenant_flags_org_idx ON public.tenant_flags USING btree (organization_id, flag_key);

CREATE OR REPLACE FUNCTION public.accept_organization_invitation(invite_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare inv public.invitations; user_email text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if invite_token is null or length(invite_token) <> 64 then raise exception 'Invalid or expired invitation' using errcode='22023'; end if;
 select lower(email) into user_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if user_email is null then raise exception 'Verify your email address before accepting an invitation' using errcode='42501'; end if;
 select * into inv from public.invitations
 where token_hash=encode(extensions.digest(invite_token,'sha256'),'hex') for update;
 if not found or inv.accepted_at is not null or inv.revoked_at is not null or inv.expires_at<=now() then
   raise exception 'Invalid or expired invitation' using errcode='22023';
 end if;
 if lower(inv.email::text) <> user_email then raise exception 'This invitation belongs to a different email address' using errcode='42501'; end if;
 insert into public.organization_members(organization_id,user_id,role,status)
 values(inv.organization_id,auth.uid(),inv.role,'active')
 on conflict(organization_id,user_id) do update set role=excluded.role,status='active',updated_at=now();
 update public.invitations set accepted_at=now() where id=inv.id;
 update public.user_settings set active_organization_id=inv.organization_id,updated_at=now() where user_id=auth.uid();
 perform public.record_audit(inv.organization_id,'organization.invitation.accepted','invitation',inv.id::text,null,
   jsonb_build_object('user_id',auth.uid(),'role',inv.role),null,false);
 return inv.organization_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.can_read_file(target_file uuid, target_org uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.files f
    where f.id = target_file and f.organization_id = target_org and f.deleted_at is null
      and (
        public.has_org_role(target_org, array['owner','admin','auditor'])
        or (
          public.has_org_role(target_org, array['manager','sales','contributor'])
          and (f.owner_id = public.current_member_id() or public.can_read_project(f.project_id, target_org))
        )
        or (
          public.has_org_role(target_org, array['client'])
          and f.review_status = 'approved' and f.confidentiality = 'client_shared'
          and public.can_read_project(f.project_id, target_org)
        )
        or (
          public.has_org_role(target_org, array['vendor'])
          and f.owner_id = public.current_member_id()
          and public.can_read_project(f.project_id, target_org)
        )
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.can_read_project(target_project uuid, target_org uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.projects p
    where p.id = target_project and p.organization_id = target_org and p.deleted_at is null
      and (
        public.has_org_role(target_org, array['owner','admin','auditor'])
        or (
          public.has_org_role(target_org, array['manager','sales','contributor'])
          and exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.organization_id = p.organization_id
              and pm.member_id = public.current_member_id()
          )
        )
        or (
          public.has_org_role(target_org, array['contributor'])
          and exists (
            select 1 from public.tasks t
            where t.project_id = p.id and t.organization_id = p.organization_id
              and t.assignee_id = public.current_member_id() and t.deleted_at is null
          )
        )
        or (
          public.has_org_role(target_org, array['client','vendor'])
          and p.visibility = 'client_visible'
          and exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.organization_id = p.organization_id
              and pm.member_id = public.current_member_id()
          )
        )
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.can_read_task(target_task uuid, target_org uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.tasks t
    where t.id = target_task and t.organization_id = target_org and t.deleted_at is null
      and (
        public.has_org_role(target_org, array['owner','admin','auditor'])
        or (
          public.has_org_role(target_org, array['manager','sales'])
          and public.can_read_project(t.project_id, target_org)
        )
        or (
          public.has_org_role(target_org, array['contributor'])
          and t.assignee_id = public.current_member_id()
        )
        or (
          public.has_org_role(target_org, array['client'])
          and t.visibility = 'client_visible'
          and public.can_read_project(t.project_id, target_org)
        )
        or (
          public.has_org_role(target_org, array['vendor'])
          and t.assignee_id = public.current_member_id()
          and public.can_read_project(t.project_id, target_org)
        )
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.create_contact(contact_first_name text, contact_last_name text, contact_email text, contact_phone text DEFAULT NULL::text, contact_title text DEFAULT NULL::text, contact_company_name text DEFAULT NULL::text, contact_tags text[] DEFAULT '{}'::text[])
 RETURNS contacts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org_id uuid := public.current_organization_id();
  member_id uuid := public.current_member_id();
  linked_company uuid;
  new_contact public.contacts;
begin
  if org_id is null or not public.has_org_role(org_id, array['owner','admin','manager','sales']) then
    raise exception 'Permission denied' using errcode = '42501';
  end if;
  if nullif(trim(contact_company_name), '') is not null then
    select id into linked_company from public.companies
    where organization_id = org_id and lower(name) = lower(trim(contact_company_name)) and deleted_at is null;
    if linked_company is null then
      insert into public.companies (organization_id, name, owner_id, status)
      values (org_id, trim(contact_company_name), member_id, 'prospect') returning id into linked_company;
    end if;
  end if;
  insert into public.contacts (
    organization_id, company_id, first_name, last_name, email, phone, title, owner_id, tags
  ) values (
    org_id, linked_company, trim(contact_first_name), trim(coalesce(contact_last_name, '')),
    trim(contact_email), nullif(trim(contact_phone), ''), nullif(trim(contact_title), ''), member_id, contact_tags
  ) returning * into new_contact;
  perform public.record_audit(org_id, 'contact.created', 'contact', new_contact.id::text, null, to_jsonb(new_contact));
  return new_contact;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_lead(lead_name text, lead_email text, lead_phone text, lead_source text, lead_notes text DEFAULT NULL::text)
 RETURNS leads
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org_id uuid := public.current_organization_id();
  new_lead public.leads;
begin
  if org_id is null or not public.has_org_role(org_id, array['owner','admin','manager','sales']) then
    raise exception 'Permission denied' using errcode = '42501';
  end if;
  insert into public.leads (organization_id, name, email, phone, source, owner_id, notes)
  values (org_id, trim(lead_name), nullif(trim(lead_email), ''), nullif(trim(lead_phone), ''), lead_source, public.current_member_id(), lead_notes)
  returning * into new_lead;
  perform public.record_audit(org_id, 'lead.created', 'lead', new_lead.id::text, null, to_jsonb(new_lead));
  return new_lead;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_organization(org_name text, org_slug text, org_country text DEFAULT 'IN'::text, org_timezone text DEFAULT 'Asia/Kolkata'::text, org_currency text DEFAULT 'INR'::text, org_locale text DEFAULT 'en-IN'::text, org_industry text DEFAULT 'Professional services'::text, org_vertical text DEFAULT 'business'::text)
 RETURNS organizations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare new_org public.organizations;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if length(trim(coalesce(org_name,''))) < 2 or length(trim(org_name)) > 120 then
    raise exception 'Organization name must be between 2 and 120 characters' using errcode='22023';
  end if;
  if org_slug is null or org_slug !~ '^[a-z0-9][a-z0-9-]{1,47}[a-z0-9]$' then
    raise exception 'Invalid organization URL' using errcode='22023';
  end if;
  if org_slug in ('admin','api','app','auth','login','signup','support','www','mail','status') then
    raise exception 'This workspace URL is reserved' using errcode='22023';
  end if;
  if org_vertical not in ('education','business') then raise exception 'Invalid organization vertical' using errcode='22023'; end if;
  insert into public.organizations (name,slug,country,timezone,currency,locale,industry,vertical)
  values (trim(org_name),lower(org_slug),org_country,org_timezone,org_currency,org_locale,org_industry,org_vertical)
  returning * into new_org;
  insert into public.organization_members (organization_id,user_id,role,status)
  values (new_org.id,auth.uid(),'owner','active');
  update public.user_settings set active_organization_id=new_org.id,updated_at=now() where user_id=auth.uid();
  perform public.record_audit(new_org.id,'organization.created','organization',new_org.id::text,null,to_jsonb(new_org),null,false);
  return new_org;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_organization_invitation(target_org uuid, invite_email text, invite_role text, expires_in_days integer DEFAULT 7)
 RETURNS TABLE(invitation_id uuid, invitation_token text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare raw_token text; normalized_email text; expiry timestamptz;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 normalized_email := lower(trim(coalesce(invite_email,'')));
 if normalized_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$' then
   raise exception 'Enter a valid email address' using errcode='22023';
 end if;
 if invite_role not in ('admin','manager','sales','contributor','auditor','client','vendor') then
   raise exception 'This role cannot be assigned through an invitation' using errcode='22023';
 end if;
 if not public.has_org_permission(target_org,'organization.members.invite') then
   raise exception 'You do not have permission to invite members' using errcode='42501';
 end if;
 if invite_role='admin' and not public.has_org_role(target_org,array['owner']) then
   raise exception 'Only the organization owner can invite an administrator' using errcode='42501';
 end if;
 if exists(select 1 from public.organization_members om join auth.users u on u.id=om.user_id
   where om.organization_id=target_org and lower(u.email)=normalized_email and om.status='active') then
   raise exception 'This person is already an active organization member' using errcode='23505';
 end if;
 if exists(select 1 from public.invitations i where i.organization_id=target_org and lower(i.email::text)=normalized_email
   and i.accepted_at is null and i.revoked_at is null and i.expires_at>now()) then
   raise exception 'An active invitation already exists for this email' using errcode='23505';
 end if;
 raw_token := encode(extensions.gen_random_bytes(32),'hex');
 expiry := now() + make_interval(days => greatest(1,least(coalesce(expires_in_days,7),30)));
 insert into public.invitations(organization_id,email,role,token_hash,invited_by,expires_at)
 values(target_org,normalized_email::citext,invite_role,encode(extensions.digest(raw_token,'sha256'),'hex'),auth.uid(),expiry)
 returning id into invitation_id;
 invitation_token := raw_token; expires_at := expiry;
 perform public.record_audit(target_org,'organization.invitation.created','invitation',invitation_id::text,null,
   jsonb_build_object('email',normalized_email,'role',invite_role,'expires_at',expiry),null,false);
 return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_project(project_name text, project_code text, project_description text DEFAULT NULL::text, project_client_company_id uuid DEFAULT NULL::uuid, project_due_date date DEFAULT NULL::date, project_visibility text DEFAULT 'internal'::text)
 RETURNS projects
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org_id uuid := public.current_organization_id();
  member_id uuid := public.current_member_id();
  new_project public.projects;
begin
  if org_id is null or not public.has_org_role(org_id, array['owner','admin','manager']) then
    raise exception 'Permission denied' using errcode = '42501';
  end if;
  insert into public.projects (
    organization_id, name, code, description, client_company_id, due_date,
    visibility, manager_id, status
  ) values (
    org_id, trim(project_name), upper(project_code), project_description,
    project_client_company_id, project_due_date, project_visibility, member_id, 'active'
  ) returning * into new_project;
  insert into public.project_members (organization_id, project_id, member_id)
  values (org_id, new_project.id, member_id);
  perform public.record_audit(org_id, 'project.created', 'project', new_project.id::text, null, to_jsonb(new_project));
  return new_project;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_task(task_project_id uuid, task_title text, task_due_date date DEFAULT NULL::date, task_priority text DEFAULT 'medium'::text)
 RETURNS tasks
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org_id uuid := public.current_organization_id();
  new_task public.tasks;
begin
  if org_id is null or not public.has_org_role(org_id, array['owner','admin','manager']) then
    raise exception 'Permission denied' using errcode = '42501';
  end if;
  if not public.can_read_project(task_project_id, org_id) then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;
  insert into public.tasks (organization_id, project_id, title, due_date, priority, assignee_id)
  values (org_id, task_project_id, trim(task_title), task_due_date, task_priority, public.current_member_id())
  returning * into new_task;
  perform public.record_audit(org_id, 'task.created', 'task', new_task.id::text, null, to_jsonb(new_task));
  return new_task;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.current_member_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select om.id from public.organization_members om
  where om.organization_id = public.current_organization_id()
    and om.user_id = auth.uid() and om.status = 'active';
$function$
;

CREATE OR REPLACE FUNCTION public.current_organization_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (
      select us.active_organization_id
      from public.user_settings us
      join public.organization_members om
        on om.organization_id = us.active_organization_id
       and om.user_id = us.user_id
       and om.status = 'active'
      where us.user_id = auth.uid()
    ),
    (
      select om.organization_id
      from public.organization_members om
      join public.organizations o on o.id = om.organization_id
      where om.user_id = auth.uid() and om.status = 'active' and o.deleted_at is null
      order by om.created_at
      limit 1
    )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  insert into public.user_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;
  if coalesce(new.raw_user_meta_data ->> 'accepted_legal', 'false') = 'true' then
    insert into public.legal_consents (user_id, terms_version, privacy_version)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'terms_version', '2026-11-05'),
      coalesce(new.raw_user_meta_data ->> 'privacy_version', '2026-11-05')
    );
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.has_org_permission(target_org uuid, permission_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.organization_members om
    join public.role_permissions rp on rp.role_id = om.role
    where om.organization_id = target_org
      and om.user_id = (select auth.uid())
      and om.status = 'active'
      and rp.permission_id = permission_key
  );
$function$
;

CREATE OR REPLACE FUNCTION public.has_org_role(target_org uuid, allowed_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = target_org
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role = any(allowed_roles)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_org_member(target_org uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.has_org_role(target_org, array['owner','admin','manager','sales','contributor','client','vendor','auditor']);
$function$
;

CREATE OR REPLACE FUNCTION public.record_audit(target_org uuid, audit_action text, audit_resource_type text, audit_resource_id text, audit_before jsonb DEFAULT NULL::jsonb, audit_after jsonb DEFAULT NULL::jsonb, audit_request_id text DEFAULT NULL::text, audit_ai_involved boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.audit_logs (
    organization_id, actor_user_id, action, resource_type, resource_id,
    before_diff, after_diff, request_id, ai_involved
  ) values (
    target_org, auth.uid(), audit_action, audit_resource_type, audit_resource_id,
    audit_before, audit_after, coalesce(audit_request_id, gen_random_uuid()::text), audit_ai_involved
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.review_document(file_id uuid, next_status text, review_note text DEFAULT NULL::text)
 RETURNS files
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org_id uuid := public.current_organization_id();
  previous public.files;
  changed public.files;
begin
  if org_id is null or not public.has_org_role(org_id, array['owner','admin','manager']) then
    raise exception 'Permission denied' using errcode = '42501';
  end if;
  select * into previous from public.files where id = file_id and organization_id = org_id and deleted_at is null;
  if previous.id is null or not public.can_read_file(file_id, org_id) then
    raise exception 'Document not found' using errcode = 'P0002';
  end if;
  if next_status not in ('draft','in_review','approved') then
    raise exception 'Unsupported review transition' using errcode = '22023';
  end if;
  update public.files set review_status = next_status,
    confidentiality = case when next_status = 'approved' then confidentiality else 'internal' end
  where id = file_id and organization_id = org_id returning * into changed;
  insert into public.review_events (organization_id, file_id, actor_user_id, from_status, to_status, note)
  values (org_id, file_id, auth.uid(), previous.review_status, next_status, review_note);
  perform public.record_audit(org_id, 'document.reviewed', 'file', file_id::text,
    jsonb_build_object('status', previous.review_status), jsonb_build_object('status', changed.review_status));
  return changed;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_organization_invitation(invitation_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare org_id uuid;
begin
 select organization_id into org_id from public.invitations where id=invitation_id;
 if org_id is null then return false; end if;
 if not public.has_org_permission(org_id,'organization.members.invite') then
   raise exception 'You do not have permission to revoke invitations' using errcode='42501';
 end if;
 update public.invitations set revoked_at=now()
 where id=invitation_id and accepted_at is null and revoked_at is null;
 if found then
   perform public.record_audit(org_id,'organization.invitation.revoked','invitation',invitation_id::text,null,null,null,false);
   return true;
 end if;
 return false;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.switch_organization(target_org uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not public.is_org_member(target_org) then
    raise exception 'Organization not found' using errcode='P0002';
  end if;
  update public.user_settings set active_organization_id=target_org,updated_at=now()
  where user_id=auth.uid();
  if not found then raise exception 'User settings not found' using errcode='P0002'; end if;
  return target_org;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_task(task_id uuid, next_status text, next_blocker_reason text DEFAULT NULL::text)
 RETURNS tasks
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org_id uuid := public.current_organization_id();
  previous public.tasks;
  changed public.tasks;
begin
  select * into previous from public.tasks
  where id = task_id and organization_id = org_id and deleted_at is null;
  if previous.id is null or not public.can_read_task(task_id, org_id) then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;
  if not public.has_org_role(org_id, array['owner','admin','manager'])
     and not (public.has_org_role(org_id, array['contributor','vendor']) and previous.assignee_id = public.current_member_id()) then
    raise exception 'Permission denied' using errcode = '42501';
  end if;
  if next_status = 'blocked' and nullif(trim(next_blocker_reason), '') is null then
    raise exception 'A blocked task needs a blocker reason' using errcode = '22023';
  end if;
  update public.tasks set
    status = next_status,
    blocker_reason = case when next_status = 'blocked' then next_blocker_reason else null end,
    completed_at = case when next_status = 'done' then now() else null end
  where id = task_id and organization_id = org_id
  returning * into changed;
  perform public.record_audit(org_id, 'task.status_changed', 'task', task_id::text,
    jsonb_build_object('status', previous.status), jsonb_build_object('status', changed.status));
  return changed;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.uuid_v7()
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  unix_ts_ms bigint;
  value bytea;
begin
  unix_ts_ms := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  value := extensions.gen_random_bytes(16);
  value := set_byte(value, 0, ((unix_ts_ms >> 40) & 255)::integer);
  value := set_byte(value, 1, ((unix_ts_ms >> 32) & 255)::integer);
  value := set_byte(value, 2, ((unix_ts_ms >> 24) & 255)::integer);
  value := set_byte(value, 3, ((unix_ts_ms >> 16) & 255)::integer);
  value := set_byte(value, 4, ((unix_ts_ms >> 8) & 255)::integer);
  value := set_byte(value, 5, (unix_ts_ms & 255)::integer);
  value := set_byte(value, 6, (get_byte(value, 6) & 15) | 112);
  value := set_byte(value, 8, (get_byte(value, 8) & 63) | 128);
  return encode(value, 'hex')::uuid;
end;
$function$
;

alter table public.activities enable row level security;

alter table public.audit_logs enable row level security;

alter table public.companies enable row level security;

alter table public.contacts enable row level security;

alter table public.feature_flags enable row level security;

alter table public.file_versions enable row level security;

alter table public.files enable row level security;

alter table public.folders enable row level security;

alter table public.invitations enable row level security;

alter table public.leads enable row level security;

alter table public.legal_consents enable row level security;

alter table public.milestones enable row level security;

alter table public.notifications enable row level security;

alter table public.organization_members enable row level security;

alter table public.organizations enable row level security;

alter table public.permissions enable row level security;

alter table public.profiles enable row level security;

alter table public.project_members enable row level security;

alter table public.projects enable row level security;

alter table public.review_events enable row level security;

alter table public.role_permissions enable row level security;

alter table public.roles enable row level security;

alter table public.task_comments enable row level security;

alter table public.tasks enable row level security;

alter table public.tenant_flags enable row level security;

alter table public.user_settings enable row level security;

create policy "tenant activities" on public.activities as permissive for select to authenticated using (((organization_id = current_organization_id()) AND has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'sales'::text, 'contributor'::text, 'auditor'::text])));

create policy "audit readers" on public.audit_logs as permissive for select to authenticated using (((organization_id = current_organization_id()) AND has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text, 'auditor'::text])));

create policy "tenant companies" on public.companies as permissive for select to authenticated using (((organization_id = current_organization_id()) AND (deleted_at IS NULL) AND has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'sales'::text, 'contributor'::text, 'auditor'::text])));

create policy "tenant contacts scoped" on public.contacts as permissive for select to authenticated using (((organization_id = current_organization_id()) AND (deleted_at IS NULL) AND (has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'sales'::text, 'auditor'::text]) OR (has_org_role(organization_id, ARRAY['contributor'::text]) AND (owner_id = current_member_id())))));

create policy "read flags" on public.feature_flags as permissive for select to authenticated using (true);

create policy "tenant file versions" on public.file_versions as permissive for select to authenticated using (((organization_id = current_organization_id()) AND can_read_file(file_id, organization_id)));

create policy "tenant files scoped" on public.files as permissive for select to authenticated using (((organization_id = current_organization_id()) AND can_read_file(id, organization_id)));

create policy "tenant folders" on public.folders as permissive for select to authenticated using (((organization_id = current_organization_id()) AND has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'sales'::text, 'contributor'::text, 'auditor'::text]) AND ((project_id IS NULL) OR can_read_project(project_id, organization_id))));

create policy "admin invitations" on public.invitations as permissive for select to authenticated using (((organization_id = current_organization_id()) AND has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text])));

create policy "tenant leads scoped" on public.leads as permissive for select to authenticated using (((organization_id = current_organization_id()) AND (deleted_at IS NULL) AND (has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'sales'::text, 'auditor'::text]) OR (has_org_role(organization_id, ARRAY['contributor'::text]) AND (owner_id = current_member_id())))));

create policy "own legal consents" on public.legal_consents as permissive for select to authenticated using ((user_id = auth.uid()));

create policy "tenant milestones" on public.milestones as permissive for select to authenticated using (((organization_id = current_organization_id()) AND can_read_project(project_id, organization_id)));

create policy "own notifications" on public.notifications as permissive for select to authenticated using (((organization_id = current_organization_id()) AND (user_id = auth.uid())));

create policy "active membership" on public.organization_members as permissive for select to authenticated using (((organization_id = current_organization_id()) AND (has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'sales'::text, 'contributor'::text, 'auditor'::text]) OR (user_id = auth.uid()))));

create policy "own memberships across organizations" on public.organization_members as permissive for select to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) AND (status = 'active'::text)));

create policy "active organization" on public.organizations as permissive for select to authenticated using (((id = current_organization_id()) AND (deleted_at IS NULL)));

create policy "member organizations" on public.organizations as permissive for select to authenticated using (((deleted_at IS NULL) AND is_org_member(id)));

create policy "read permissions" on public.permissions as permissive for select to authenticated using (true);

create policy "own profile" on public.profiles as permissive for select to authenticated using ((id = auth.uid()));

create policy "tenant project members" on public.project_members as permissive for select to authenticated using (((organization_id = current_organization_id()) AND (has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'sales'::text, 'contributor'::text, 'auditor'::text]) OR (member_id = current_member_id()))));

create policy "tenant projects scoped" on public.projects as permissive for select to authenticated using (((organization_id = current_organization_id()) AND can_read_project(id, organization_id)));

create policy "tenant review events" on public.review_events as permissive for select to authenticated using (((organization_id = current_organization_id()) AND has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'sales'::text, 'contributor'::text, 'auditor'::text]) AND can_read_file(file_id, organization_id)));

create policy "read role permissions" on public.role_permissions as permissive for select to authenticated using (true);

create policy "read roles" on public.roles as permissive for select to authenticated using (true);

create policy "tenant task comments" on public.task_comments as permissive for select to authenticated using (((organization_id = current_organization_id()) AND (deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM tasks t
  WHERE ((t.id = task_comments.task_id) AND (t.organization_id = task_comments.organization_id) AND can_read_task(t.id, t.organization_id)))) AND (has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'sales'::text, 'contributor'::text, 'auditor'::text]) OR (visibility = 'client_visible'::text))));

create policy "tenant tasks scoped" on public.tasks as permissive for select to authenticated using (((organization_id = current_organization_id()) AND can_read_task(id, organization_id)));

create policy "tenant flags" on public.tenant_flags as permissive for select to authenticated using ((organization_id = current_organization_id()));

create policy "own settings" on public.user_settings as permissive for select to authenticated using ((user_id = auth.uid()));

CREATE TRIGGER companies_touch BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER contacts_touch BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER files_touch BEFORE UPDATE ON files FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER leads_touch BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER milestones_touch BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER organization_members_touch BEFORE UPDATE ON organization_members FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER organizations_touch BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER profiles_touch BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER projects_touch BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER tasks_touch BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;