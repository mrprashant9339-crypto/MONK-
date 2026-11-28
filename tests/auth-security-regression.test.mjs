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
  assert.ok(resend.includes('setCaptchaToken("")'));
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

test("successful CAPTCHA completion clears only CAPTCHA errors, not authentication failures", async () => {
  const auth = await read("../src/components/AuthExperience.tsx");
  const tokenStart = auth.indexOf("function handleCaptchaToken(token: string)");
  const tokenEnd = auth.indexOf("\n  function handleCaptchaError()", tokenStart);
  const tokenHandler = auth.slice(tokenStart, tokenEnd);
  const errorStart = auth.indexOf("function handleCaptchaError()");
  const expiredStart = auth.indexOf("function handleCaptchaExpired()", errorStart);
  const captchaErrorHandler = auth.slice(errorStart, expiredStart);

  assert.ok(tokenStart >= 0 && tokenEnd > tokenStart, "CAPTCHA token handler must exist");
  assert.match(tokenHandler, /setCaptchaError\(""\)/);
  assert.doesNotMatch(tokenHandler, /setError\(/);
  assert.match(captchaErrorHandler, /setCaptchaError\(/);
  assert.doesNotMatch(captchaErrorHandler, /setError\(/);
  assert.match(auth, /const \[captchaError, setCaptchaError\] = useState\(""\)/);
});


test("local development is pinned to staging Supabase and staging Turnstile", async () => {
  const client = await read("../src/lib/supabase.ts");
  const widget = await read("../src/components/TurnstileWidget.tsx");

  assert.match(client, /import\.meta\.env\.DEV\\s*\\?\\s*STAGING_SUPABASE_URL/);
  assert.match(client, /https:\\/\\/ysspnuldfiijagagwiqk\\.supabase\\.co/);
  assert.match(client, /import\.meta\.env\.DEV\\s*\\?\\s*STAGING_PUBLISHABLE_KEY/);
  assert.match(widget, /import\.meta\.env\.DEV\\s*\\?\\s*STAGING_SITE_KEY/);
  assert.match(widget, /0x4AAAAAAGV936arziIBwyrJ/);
});
