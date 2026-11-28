import test from "node:test";
import assert from "node:assert/strict";
import { getPasswordPolicyError, PASSWORD_MIN_LENGTH } from "../src/lib/password-policy.mjs";

test("accepts a password that satisfies the current MONK Supabase policy", () => {
  assert.equal(getPasswordPolicyError("SecureMonk2026!"), null);
});

test("rejects passwords shorter than the configured minimum", () => {
  assert.equal(PASSWORD_MIN_LENGTH, 12);
  assert.match(getPasswordPolicyError("Aa1!short"), /at least 12 characters/);
});

test("rejects a password without a lowercase letter", () => {
  assert.match(getPasswordPolicyError("SECUREMONK2026!"), /lowercase/);
});

test("rejects a password without an uppercase letter", () => {
  assert.match(getPasswordPolicyError("securemonk2026!"), /uppercase/);
});

test("rejects a password without a number", () => {
  assert.match(getPasswordPolicyError("SecureMonkPassword!"), /number/);
});

test("rejects a password without a special character", () => {
  assert.match(getPasswordPolicyError("SecureMonk2026"), /special character/);
});
