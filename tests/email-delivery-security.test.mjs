import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("welcome email CORS is scoped to the configured app origin, not production or generated preview hosts", async () => {
  const fn = await read("../supabase/functions/send-welcome-email/index.ts");
  assert.match(fn, /function getConfiguredAppUrl\(\): URL \| null/);
  assert.match(fn, /Deno\.env\.get\("MONK_APP_URL"\)/);
  assert.match(fn, /url\.protocol === "https:"/);
  assert.match(fn, /url\.pathname !== "\/"/);
  assert.match(fn, /\.\.\.\(configuredAppUrl \? \[configuredAppUrl\.origin\] : \[\]\)/);
  assert.doesNotMatch(fn, /https:\/\/monk\.monster/);
  assert.doesNotMatch(fn, /monk-platform-git-fix-auth-captcha-resen/);
  assert.match(fn, /if \(!configuredAppUrl\)/);
});

test("welcome email retries use a stable provider idempotency key", async () => {
  const fn = await read("../supabase/functions/send-welcome-email/index.ts");
  assert.match(fn, /"Idempotency-Key": `monk-welcome-\$\{user\.id\}`/);
  assert.match(fn, /status: "failed"/);
  assert.match(fn, /status: "sent"/);
  assert.match(fn, /provider_message_id: delivery\.id/);
});

test("email delivery ledger is server-only and its claim RPC is restricted to service_role", async () => {
  const migration = await read("../supabase/migrations/20261125143000_welcome_email_delivery.sql");
  const sqlTest = await read("../supabase/tests/auth_email_delivery_security.sql");
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.email_delivery_events from public, anon, authenticated/i);
  assert.match(migration, /grant all on table public\.email_delivery_events to service_role/i);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /revoke all on function public\.claim_welcome_email\(uuid\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.claim_welcome_email\(uuid\) to service_role/i);
  assert.match(migration, /unique \(user_id, event_type\)/i);
  assert.match(sqlTest, /RLS is disabled/i);
  assert.match(sqlTest, /has_table_privilege\('anon'/i);
  assert.match(sqlTest, /has_table_privilege\('authenticated'/i);
  assert.match(sqlTest, /no client policies/i);
  assert.match(sqlTest, /security definer/i);
  assert.match(sqlTest, /service_role/i);
});
