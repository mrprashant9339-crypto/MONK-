import test from "node:test";
import assert from "node:assert/strict";
import worker, { isApplicationRoute } from "../worker.js";

function mockEnv() {
  const requested = [];
  return {
    requested,
    ASSETS: {
      async fetch(request) {
        const url = new URL(request.url);
        requested.push(url.pathname);
        if (url.pathname === "/") return new Response("<main>MONK app</main>", { status: 200, headers: { "content-type": "text/html" } });
        if (url.pathname === "/404.html") return new Response("<main>404</main>", { status: 404, headers: { "content-type": "text/html" } });
        return new Response("not found", { status: 404 });
      }
    }
  };
}

test("known public routes are routed to the SPA entry document", async () => {
  for (const route of ["/", "/about", "/campus", "/business", "/faq", "/contact", "/privacy", "/support/tickets/ABC-123", "/thank-you", "/login", "/forgot-password", "/reset-password", "/auth/callback"]) {
    assert.equal(isApplicationRoute(route), true, route);
    const env = mockEnv();
    const response = await worker.fetch(new Request(`https://monk.monster${route}`), env);
    assert.equal(response.status, 200);
    assert.deepEqual(env.requested, ["/"]);
  }
});

test("unknown routes are not rewritten to the SPA entry document", async () => {
  assert.equal(isApplicationRoute("/this-page-does-not-exist"), false);
  const env = mockEnv();
  const response = await worker.fetch(new Request("https://monk.monster/this-page-does-not-exist"), env);
  assert.equal(response.status, 404);
  assert.deepEqual(env.requested, ["/this-page-does-not-exist"]);
});

test("trailing slashes resolve to the canonical application route", async () => {
  const env = mockEnv();
  const response = await worker.fetch(new Request("https://monk.monster/campus/"), env);
  assert.equal(response.status, 200);
  assert.deepEqual(env.requested, ["/"]);
});

test("signup path is served directly as the canonical account creation route", async () => {
  const env = mockEnv();
  const response = await worker.fetch(new Request("https://monk.monster/signup"), env);
  assert.equal(response.status, 200);
  assert.deepEqual(env.requested, ["/"]);
});
