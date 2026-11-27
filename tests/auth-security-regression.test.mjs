import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("verification resend renders its own Turnstile widget and submits the fresh token", async () => {
  const auth = await read("../src/components/AuthExperience.tsx");
  const resendStart = auth.indexOf("async function resendVerification()");
  const resendEnd = auth.indexOf("\n  const isSignup", resendStart);
  const resend = auth.slice(resendStart, resendEnd);
  const pendingStart = auth.indexOf('{mode === "pending" ? (');
  const pendingEnd = auth.indexOf("\n        ) : (", pendingStart);
  const pending = auth.slice(pendingStart, pendingEnd);

  assert.ok(resendStart >= 0 && resendEnd > resendStart, "resend handler must exist");
  assert.match(resend, /if \(!captchaToken\)/);
  assert.match(resend, /captchaToken:\s*currentCaptchaToken/);
  assert.match(resend, /setCaptchaToken\("")/);
  assert.match(resend, /setCaptchaResetKey/);
  assert.match(pending, /<TurnstileWidget/);
  assert.match(pending, /!captchaToken/);
});

test("signup and password recovery enforce the same password policy", async () => {
  const auth = await read("../src/components/AuthExperience.tsx");
  const widget = await read("../src/components/TurnstileWidget.tsx");
  assert.equal((auth.match(/getPasswordPolicyError\(password\)/g) || []).length, 2);
  assert.match(auth, /PASSWORD_POLICY_HINT/);
  assert.match(widget, /onExpired\?: \(\) => void/);
  assert.match(widget, /onExpiredRef\.current\?\.\(\)/);
});
