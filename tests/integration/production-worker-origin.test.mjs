import assert from "node:assert/strict";
import test from "node:test";

async function assertHealthyMonkResponse(response, label) {
  assert.equal(response.status, 200, label);
  assert.equal(response.headers.get("x-monk-cf-ip-forwarded"), "yes", label);
  assert.ok(
    response.headers.get("x-monk-origin") === "vercel" ||
    response.headers.get("x-monk-origin-fallback") === "assets",
    `${label}: response must come from Vercel or safe Cloudflare Assets fallback`
  );
  const html = await response.text();
  assert.match(html, /id="root"/i, label);
  assert.doesNotMatch(html, /Vercel Security Checkpoint|Failed to verify your browser|Code\\s*21/i, label);
}

test("production Worker serves the signup app without a Vercel challenge", async () => {
  const response = await fetch("https://monk.monster/signup", { redirect: "manual" });
  await assertHealthyMonkResponse(response, "signup");
});

test("production Worker serves the homepage without a Vercel challenge", async () => {
  const response = await fetch("https://monk.monster/", { redirect: "manual" });
  await assertHealthyMonkResponse(response, "homepage");
});

test("www host redirects to the canonical apex through the Worker route", async () => {
  const response = await fetch("https://www.monk.monster/signup", { redirect: "manual" });
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://monk.monster/signup");
});
