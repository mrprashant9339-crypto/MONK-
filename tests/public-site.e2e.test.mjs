import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:4173";
let server;
let browser;

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await delay(300);
  }
  throw new Error("Vite development server did not become ready within 30 seconds.");
}

test("public MONK portals render and expose expected navigation and consent controls", async () => {
  server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4173", "--strictPort"], {
    stdio: "ignore",
    env: { ...process.env, CI: "true" },
  });

  try {
    await waitForServer();
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    assert.match(await page.locator("h1").first().innerText(), /Run your work/i);
    assert.equal(await page.locator(".hero-art[aria-hidden='true']").count(), 1);
    assert.equal(await page.getByRole("img", { name: "MONK logo" }).count() > 0, true);

    const llmsResponse = await page.request.get(baseUrl + "/llms.txt");
    assert.equal(llmsResponse.status(), 200);
    const llmsText = await llmsResponse.text();
    assert.match(llmsText, /^# MONK/m);
    assert.match(llmsText, /\[MONK Campus\]/);

    const catalogResponse = await page.request.get(baseUrl + "/.well-known/ai-catalog.json");
    assert.equal(catalogResponse.status(), 200);
    assert.match(catalogResponse.headers()["content-type"] || "", /application\/json/);
    const catalog = await catalogResponse.json();
    assert.equal(catalog.specVersion, "1.0");
    assert.deepEqual(catalog.entries, []);
    assert.equal(catalog.host.displayName, "MONK");
    assert.equal(await page.getByRole("button", { name: /MONK Campus/i }).count() > 0, true);
    assert.equal(await page.getByRole("button", { name: /MONK Business/i }).count() > 0, true);

    await page.goto(baseUrl + "/campus", { waitUntil: "networkidle" });
    assert.match(await page.locator("h1").first().innerText(), /One campus/i);
    assert.equal(await page.getByRole("button", { name: /Use my location/i }).count(), 0);

    await page.goto(baseUrl + "/business", { waitUntil: "networkidle" });
    assert.match(await page.locator("h1").first().innerText(), /Run your business/i);
    assert.equal(await page.getByRole("button", { name: /Use my location/i }).count(), 1);
    assert.equal(await page.getByPlaceholder(/pharmacy in Muzaffarpur/i).count(), 1);

    assert.deepEqual(pageErrors, [], "Public portal navigation must not produce uncaught browser errors.");
  } finally {
    if (browser) await browser.close();
    if (server && !server.killed) {
      server.kill("SIGTERM");
      await Promise.race([
        new Promise(resolve => server.once("exit", resolve)),
        delay(2_000),
      ]);
      if (server.exitCode === null) server.kill("SIGKILL");
    }
  }
});
