import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("soft-deleted organizations are excluded from tenant authorization helpers", async () => {
  const migration = await read("../supabase/migrations/20261128025000_disable_soft_deleted_org_access.sql");
  const invitationMigration = await read("../supabase/migrations/20261128025700_reject_deleted_org_invitation_acceptance.sql");
  const behavior = await read("../supabase/tests/soft_deleted_org_access_behavior.sql");
  const invitationBehavior = await read("../supabase/tests/deleted_org_invitation_acceptance_behavior.sql");

  assert.match(migration, /o\.deleted_at is null/);
  assert.match(migration, /public\.is_org_member\(target_org\)/);
  assert.match(migration, /join public\.organizations o/i);
  assert.match(migration, /public\.has_org_permission/);
  assert.match(migration, /create or replace function public\.current_organization_id\(\)/);
  assert.match(migration, /create or replace function public\.switch_organization\(target_org uuid\)/);

  assert.match(invitationMigration, /create or replace function public\.accept_organization_invitation\(invite_token text\)/);
  assert.match(invitationMigration, /o\.deleted_at is null/);
  assert.match(invitationMigration, /Organization not found/);

  assert.match(behavior, /Soft-deleted workspace must not count as a current membership/i);
  assert.match(behavior, /unexpectedly accepted by switch_organization/i);
  assert.match(behavior, /RLS exposed/i);
  assert.match(behavior, /RLS allowed a write/i);
  assert.match(behavior, /Active workspace membership and owner permissions must remain available/i);
  assert.match(behavior, /soft-deleted organization authorization boundary: PASS/i);
  assert.match(behavior, /rollback;/i);

  assert.match(invitationBehavior, /Deleted organization invitation was unexpectedly accepted/i);
  assert.match(invitationBehavior, /Rejected invitation left an active organization membership/i);
  assert.match(invitationBehavior, /deleted organization invitation acceptance boundary: PASS/i);
  assert.match(invitationBehavior, /rollback;/i);
});
