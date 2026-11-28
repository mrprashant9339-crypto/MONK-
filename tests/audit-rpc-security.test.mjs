import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("record_audit is internal-only and verifies authenticated actor membership", async () => {
  const migration = await read("../supabase/migrations/20261128021000_harden_audit_rpc_execution.sql");
  const sqlTest = await read("../supabase/tests/audit_rpc_security.sql");

  assert.match(migration, /revoke all on function public\.record_audit\([\s\S]*?from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.record_audit\([\s\S]*?to service_role/i);
  assert.match(migration, /auth\.uid\(\) is not null and not public\.is_org_member\(target_org\)/i);
  assert.match(migration, /create or replace function public\.education_audit_row\(\)[\s\S]*?security definer/i);
  assert.match(migration, /revoke all on function public\.education_audit_row\(\)\\s+from public, anon, authenticated, service_role/i);
  assert.match(migration, /set search_path = pg_catalog, public, pg_temp/i);

  assert.match(sqlTest, /authenticated must not execute record_audit directly/i);
  assert.match(sqlTest, /service_role lost trusted server-side record_audit execution/i);
  assert.match(sqlTest, /education_audit_row must run SECURITY DEFINER/i);
  assert.match(sqlTest, /SECURITY INVOKER functions calling the internal record_audit helper/i);
  assert.match(sqlTest, /audit_logs must not expose INSERT/i);
});
