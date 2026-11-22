import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";

const originalFetch = globalThis.fetch;

function createEnv(overrides = {}) {
  return {
    SUPABASE_URL: "https://example-project.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    NEARBY_SEARCH_RATE_LIMIT: { limit: async () => ({ success: true }) },
    ASSETS: { fetch: async () => new Response("static asset", { status: 200 }) },
    ...overrides,
  };
}

test("public directory search accepts same-origin GET without Origin and enforces published=true", async () => {
  let requestedUrl;
  globalThis.fetch = async (input) => {
    requestedUrl = new URL(input);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Range": "0-0/0" },
    });
  };

  try {
    const response = await worker.fetch(
      new Request("https://monk.monster/api/directory/search?state=BR", {
        headers: { "CF-Connecting-IP": "203.0.113.10" },
      }),
      createEnv(),
    );
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).results, []);
    assert.equal(requestedUrl.pathname, "/rest/v1/monk_directory_institutions");
    assert.equal(requestedUrl.searchParams.get("published"), "eq.true");
    assert.equal(requestedUrl.searchParams.get("state_code"), "eq.BR");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("institution detail returns only a published institution and its programmes/approvals", async () => {
  const institutionId = "018f2f5a-7b3c-7a11-8a22-123456789abc";
  const requested = [];
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    requested.push(url);
    if (url.pathname.endsWith("/monk_directory_institutions")) {
      assert.equal(url.searchParams.get("published"), "eq.true");
      return new Response(JSON.stringify([{
        id: institutionId,
        canonical_name: "Example Institute",
        verification_state: "unverified",
        primary_source_id: null,
      }]), { status: 200 });
    }
    if (url.pathname.endsWith("/monk_directory_programmes")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.pathname.endsWith("/monk_directory_approvals")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    throw new Error("Unexpected upstream URL: " + url.pathname);
  };

  try {
    const response = await worker.fetch(
      new Request(`https://monk.monster/api/directory/institutions/${institutionId}`, {
        headers: { "CF-Connecting-IP": "203.0.113.10" },
      }),
      createEnv(),
    );
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.institution.id, institutionId);
    assert.deepEqual(payload.programmes, []);
    assert.deepEqual(payload.approvals, []);
    assert.equal(requested.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("institution detail rejects malformed identifiers before querying Supabase", async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error("Supabase must not be called for an invalid ID");
  };

  try {
    const response = await worker.fetch(
      new Request("https://monk.monster/api/directory/institutions/not-a-uuid"),
      createEnv(),
    );
    assert.equal(response.status, 400);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("nearby business discovery fails closed when the provider secret is absent", async () => {
  const response = await worker.fetch(
    new Request("https://monk.monster/api/businesses/nearby", {
      method: "POST",
      headers: {
        Origin: "https://monk.monster",
        "CF-Connecting-IP": "203.0.113.10",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ latitude: 26.12, longitude: 85.39 }),
    }),
    createEnv({ GOOGLE_MAPS_API_KEY: undefined }),
  );
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /not configured/i);
});

test("unknown routes are served by the static asset binding", async () => {
  const response = await worker.fetch(
    new Request("https://monk.monster/campus"),
    createEnv(),
  );
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "static asset");
});
