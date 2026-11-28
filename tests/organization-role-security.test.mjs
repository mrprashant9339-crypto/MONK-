import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("organization role assignment prevents owner/admin escalation and vertical misuse", async () => {
  const migration = await read("../supabase/migrations/20261128021900_harden_organization_role_assignment.sql");
  const sqlTest = await read("../supabase/tests/organization_role_assignment_security.sql");
  const behaviorTest = await read("../supabase/tests/organization_role_assignment_behavior.sql");

  assert.match(migration, /built_in_role = 'owner'/);
  assert.match(migration, /Owner assignment requires the dedicated ownership-transfer workflow/);
  assert.match(migration, /built_in_role = 'admin' and not public\.has_org_role\(target_org, array\['owner'\]\)/);
  assert.match(migration, /target_row\.role = 'admin' and not public\.has_org_role\(target_org, array\['owner'\]\)/);
  assert.match(migration, /target_row\.user_id = auth\.uid\(\)/);
  assert.match(migration, /target_row\.role = 'owner'/);
  assert.match(migration, /org_vertical <> 'education'/);
  assert.match(migration, /for update/i);

  assert.match(sqlTest, /Built-in owner assignment must be prohibited/i);
  assert.match(sqlTest, /Assigning an administrator must be owner-only/i);
  assert.match(sqlTest, /existing administrator must be owner-only/i);
  assert.match(sqlTest, /Education-only built-in roles must be restricted/i);
  assert.match(behaviorTest, /dynamic organization role-assignment behavior: PASS/i);
  assert.match(behaviorTest, /admin assigned owner/i);
  assert.match(behaviorTest, /admin promoted member to admin/i);
  assert.match(behaviorTest, /owner could not assign admin role/i);
  assert.match(behaviorTest, /rollback;/i);
});
