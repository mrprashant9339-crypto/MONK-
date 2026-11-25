import assert from "node:assert/strict";
import test from "node:test";

test("production Worker serves the signup app shell from Vercel origin", async () => {
  const response = await fetch("https://monk.monster/signup", { redirect: "manual" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-monk-origin"), "vercel");
  assert.equal(response.headers.get("x-monk-origin-fallback"), null);
  assert.match(await response.text(), /id="root"/i);
});

test("production Worker serves the homepage from Vercel origin", async () => {
  const response = await fetch("https://monk.monster/", { redirect: "manual" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-monk-origin"), "vercel");
  assert.equal(response.headers.get("x-monk-origin-fallback"), null);
});
