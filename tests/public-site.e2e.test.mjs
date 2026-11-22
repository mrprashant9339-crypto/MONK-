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
    assert.match(await page.locator("h1").first().innerText(), /Make room for/i);
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
      await delay(250);
      if (!server.killed) server.kill("SIGKILL");
    }
  }
});
