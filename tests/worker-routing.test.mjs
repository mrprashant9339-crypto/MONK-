import test from "node:test";
import assert from "node:assert/strict";
import worker, { isApplicationRoute, isStaticAssetPath } from "../worker.js";

function mockEnv() {
  const requested = [];
  return {
    requested,
    ASSETS: {
      async fetch(request) {
        const url = new URL(request.url);
        requested.push(url.pathname);
        if (url.pathname === "/") return new Response("<main>MONK app fallback</main>", { status: 200, headers: { "content-type": "text/html" } });
        if (url.pathname === "/404.html") return new Response("<main>404</main>", { status: 404, headers: { "content-type": "text/html" } });
        return new Response("not found", { status: 404 });
      }
    }
  };
}

const appShell = `<!doctype html><html><head><title>MONK</title><meta name="description" content="MONK"><meta name="robots" content="index, follow"><link rel="canonical" href="https://origin.monk.monster/"><meta property="og:title" content="MONK"><meta property="og:description" content="MONK"><meta property="og:url" content="https://origin.monk.monster/"><meta name="twitter:title" content="MONK"><meta name="twitter:description" content="MONK"><meta name="twitter:card" content="summary"></head><body><div id="root"></div></body></html>`;

async function withMockFetch(handler, callback) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  try { return await callback(); }
  finally { globalThis.fetch = originalFetch; }
}

test("known public routes are served from the Vercel app shell with route metadata", async () => {
  await withMockFetch(async request => {
    assert.equal(new URL(request.url).hostname, "origin.monk.monster");
    assert.equal(new URL(request.url).pathname, "/");
    assert.equal(request.headers.get("cf-connecting-ip"), "203.0.113.10");
    return new Response(appShell, { status: 200, headers: { "content-type": "text/html" } });
  }, async () => {
    for (const route of ["/", "/about", "/campus", "/business", "/faq", "/contact", "/privacy", "/support/tickets/ABC-123", "/thank-you", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback"]) {
      assert.equal(isApplicationRoute(route), true, route);
      const env = mockEnv();
      const response = await worker.fetch(new Request(`https://monk.monster${route}`, { headers: { "cf-connecting-ip": "203.0.113.10" } }), env);
      assert.equal(response.status, 200, route);
      assert.equal(response.headers.get("x-monk-origin"), "vercel", route);
      assert.equal(response.headers.get("x-monk-cf-ip-forwarded"), "yes", route);
      assert.deepEqual(env.requested, [], route);
      const html = await response.text();
      if (route === "/signup") assert.match(html, /Create a MONK Account/);
    }
  });
});

test("static assets are proxied to Vercel without SPA rewriting", async () => {
  await withMockFetch(async request => {
    assert.equal(new URL(request.url).pathname, "/assets/app.js");
    return new Response("console.log('MONK')", { status: 200, headers: { "content-type": "text/javascript" } });
  }, async () => {
    const env = mockEnv();
    const response = await worker.fetch(new Request("https://monk.monster/assets/app.js"), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-monk-origin"), "vercel");
    assert.equal(await response.text(), "console.log('MONK')");
    assert.deepEqual(env.requested, []);
  });
});

test("the offline HTML shell remains available as an explicit static asset", async () => {
  await withMockFetch(async request => {
    assert.equal(new URL(request.url).pathname, "/offline.html");
    return new Response("<!doctype html><title>Offline</title>", { status: 200, headers: { "content-type": "text/html" } });
  }, async () => {
    const response = await worker.fetch(new Request("https://monk.monster/offline.html"), mockEnv());
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Offline/);
  });
});
test("origin network failure falls back to Cloudflare assets", async () => {
  await withMockFetch(async () => { throw new Error("origin unavailable"); }, async () => {
    const env = mockEnv();
    const response = await worker.fetch(new Request("https://monk.monster/signup"), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-monk-origin-fallback"), "assets");
    assert.deepEqual(env.requested, ["/"]);
  });
});

test("unknown application paths return a real 404 instead of the SPA shell", async () => {
  await withMockFetch(async () => new Response("not found", { status: 404 }), async () => {
    const env = mockEnv();
    const response = await worker.fetch(new Request("https://monk.monster/unknown-page"), env);
    assert.equal(response.status, 404);
    assert.match(await response.text(), /ERROR 404/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(env.requested, []);
  });
});

test("unknown static assets return 404 and never the application HTML", async () => {
  await withMockFetch(async () => new Response("not found", { status: 404 }), async () => {
    const env = mockEnv();
    const response = await worker.fetch(new Request("https://monk.monster/assets/missing.js"), env);
    assert.equal(response.status, 404);
    assert.deepEqual(env.requested, ["/assets/missing.js"]);
  });
});

test("non-read methods are rejected by the static application Worker", async () => {
  const response = await worker.fetch(new Request("https://monk.monster/unknown-page", { method: "POST" }), mockEnv());
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD");
});

test("static asset path detection does not classify unknown SPA routes as assets", () => {
  assert.equal(isStaticAssetPath("/assets/app.js"), true);
  assert.equal(isStaticAssetPath("/brand/monk-icon.svg"), true);
  assert.equal(isStaticAssetPath("/unknown-page"), false);
});

test("www host redirects to the canonical MONK domain", async () => {
  const env = mockEnv();
  const response = await worker.fetch(new Request("https://www.monk.monster/signup?vertical=education"), env);
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://monk.monster/signup?vertical=education");
});


test("Worker applies security headers to application, asset, redirect, error and 404 responses", async () => {
  const assertSecurityHeaders = response => {
    assert.match(response.headers.get("strict-transport-security") ?? "", /max-age=31536000; includeSubDomains/i);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.match(response.headers.get("permissions-policy") ?? "", /camera=\(\)/);
    const csp = response.headers.get("content-security-policy-report-only") ?? "";
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /object-src 'none'/);
  };

  await withMockFetch(async () => new Response(appShell, { status: 200, headers: { "content-type": "text/html" } }), async () => {
    const app = await worker.fetch(new Request("https://monk.monster/login"), mockEnv());
    assertSecurityHeaders(app);
  });

  await withMockFetch(async () => new Response("asset", { status: 200, headers: { "content-type": "text/javascript" } }), async () => {
    const asset = await worker.fetch(new Request("https://monk.monster/assets/app.js"), mockEnv());
    assertSecurityHeaders(asset);
  });

  const redirect = await worker.fetch(new Request("https://www.monk.monster/"), mockEnv());
  assertSecurityHeaders(redirect);

  const method = await worker.fetch(new Request("https://monk.monster/private", { method: "POST" }), mockEnv());
  assertSecurityHeaders(method);

  await withMockFetch(async () => new Response("not found", { status: 404 }), async () => {
    const missing = await worker.fetch(new Request("https://monk.monster/missing"), mockEnv());
    assertSecurityHeaders(missing);
  });
});

test("Vercel security checkpoint is never exposed to visitors", async () => {
  await withMockFetch(async () => new Response("<html><title>Vercel Security Checkpoint</title><p>Code 21</p></html>", { status: 200, headers: { "content-type": "text/html" } }), async () => {
    const env = mockEnv();
    const response = await worker.fetch(new Request("https://monk.monster/signup", { headers: { "cf-connecting-ip": "203.0.113.10" } }), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-monk-origin-fallback"), "assets");
    assert.equal(response.headers.get("x-monk-cf-ip-forwarded"), "yes");
    assert.doesNotMatch(await response.text(), /Vercel Security Checkpoint|Code\s*21/i);
  });
});
