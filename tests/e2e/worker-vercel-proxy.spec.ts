import { expect, test } from "@playwright/test";

test.skip(!process.env.MONK_BASE_URL?.startsWith("https://preview.monk.monster"), "requires the isolated Vercel proxy preview host");

test("isolated Cloudflare Worker proxies the Vercel origin", async ({ request }) => {
  const response = await request.get("/", { timeout: 30_000, maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers()["x-monk-proxy-upstream"]).toBe("vercel-origin");
  expect(response.headers()["x-monk-proxy-host"]).toBe("preview.monk.monster");
  expect(response.headers()["x-monk-proxy-route"]).toBe("spa");
  expect(response.headers()["content-type"]).toContain("text/html");
  expect(await response.text()).toContain('id="root"');
});

test("Vercel SPA deep links survive the Cloudflare proxy", async ({ request }) => {
  for (const path of ["/signup", "/login", "/campus", "/business"]) {
    const response = await request.get(path, { timeout: 30_000, maxRedirects: 0 });
    expect(response.status(), path).toBe(200);
    expect(response.headers()["x-monk-proxy-upstream"], path).toBe("vercel-origin");
    expect(response.headers()["x-monk-proxy-route"], path).toBe("spa");
    expect(await response.text(), path).toContain('id="root"');
  }
});

test("hashed Vite assets are served through the Vercel origin", async ({ request }) => {
  const response = await request.get("/", { timeout: 30_000 });
  expect(response.status()).toBe(200);
  const html = await response.text();
  const script = html.match(/src="([^"]+\.js)"/);
  expect(script).not.toBeNull();
  const assetUrl = new URL(script![1], "https://preview.monk.monster").toString();
  const asset = await request.get(assetUrl, { timeout: 30_000 });
  expect(asset.status()).toBe(200);
  expect(asset.headers()["x-monk-proxy-route"]).toBe("asset");
  expect(asset.headers()["content-type"]).toMatch(/javascript|ecmascript/i);
});
