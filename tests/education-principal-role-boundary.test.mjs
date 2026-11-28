import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("Education principals cannot assign or invite broader platform roles", async () => {
  const migration = await read("../supabase/migrations/20261128024500_guard_education_principal_role_ceiling.sql");
  const behavior = await read("../supabase/tests/education_principal_role_boundary_behavior.sql");

  assert.match(migration, /Institution principals may only assign Education roles/);
  assert.match(migration, /next_role not in \('admin','principal','hod','teacher','student','parent'\)/);
  assert.match(migration, /Institution principals may only invite Education roles/);
  assert.match(migration, /invite_role not in \('admin','principal','hod','teacher','student','parent'\)/);
  assert.match(migration, /where id = target_member_id[\s\S]*?for update/i);

  assert.match(behavior, /principal promoted a member to manager/i);
  assert.match(behavior, /principal created a manager invitation/i);
  assert.match(behavior, /Principal should retain the ability to assign Education teacher role/i);
  assert.match(behavior, /Owner should retain the ability to assign manager role/i);
  assert.match(behavior, /dynamic education principal role-boundary behavior: PASS/i);
  assert.match(behavior, /rollback;/i);
});
