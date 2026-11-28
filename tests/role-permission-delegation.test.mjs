import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("custom role permission updates cannot exceed the caller permission ceiling", async () => {
  const migration = await read("../supabase/migrations/20261128023000_harden_custom_role_permission_delegation.sql");
  const sqlTest = await read("../supabase/tests/role_permission_delegation_security.sql");
  const behavior = await read("../supabase/tests/role_permission_delegation_behavior.sql");

  assert.match(migration, /public\.has_org_permission\(target_org, requested\.permission_id\)/);
  assert.match(migration, /You may only delegate permissions that you currently hold/);
  assert.match(migration, /for update/i);
  assert.match(migration, /organization\.members\.update/);
  assert.match(sqlTest, /Owner and admin must hold the complete current permission catalog/i);
  assert.match(behavior, /Delegated role manager self-granted finance permission/i);
  assert.match(behavior, /dynamic permission-delegation behavior: PASS/i);
  assert.match(behavior, /rollback;/i);
});
