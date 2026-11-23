import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/about",
  "/documentation",
  "/updates",
  "/faq",
  "/campus",
  "/business",
  "/privacy",
  "/terms",
  "/cookies",
  "/refunds",
  "/disclaimer",
  "/security",
  "/accessibility",
  "/data-rights",
  "/contact"
];

test("public routes render the application without a blank screen", async ({ page }) => {
  for (const route of publicRoutes) {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response, `missing document response for ${route}`).not.toBeNull();
    expect(response!.status(), `unexpected HTTP status for ${route}`).toBe(200);
    await expect(page.locator("#root")).toBeVisible();
    await expect(page.locator("#root")).toContainText(/MONK/i);
    await expect(page.locator("body")).not.toContainText(/application error|uncaught runtime error/i);
  }
});

test("reference-inspired footer panel renders and footer navigation opens About", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("footer .footer-feature-panel")).toBeVisible();
  await expect(page.locator("footer .footer-panel-wordmark")).toContainText("MONK");
  const aboutLink = page.locator("footer").getByRole("link", { name: /about monk/i });
  await expect(aboutLink).toBeVisible();
  await aboutLink.click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: /two focused workspaces/i })).toBeVisible();
});

test("signup requires explicit terms and privacy acknowledgement", async ({ page }) => {
  await page.goto("/login?mode=signup");
  const checkbox = page.getByRole("checkbox");
  await expect(checkbox).toBeVisible();
  const createAccount = page.getByRole("button", { name: /create account/i });
  await expect(createAccount).toBeDisabled();
  await checkbox.check();
  await expect(createAccount).toBeEnabled();
  await expect(page.getByRole("link", { name: /terms of service/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /privacy policy/i })).toBeVisible();
});

test("public pages remain usable at a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/about", { waitUntil: "networkidle" });
  await expect(page.locator("#root")).toContainText(/Built independently/i);
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 2);
  await page.screenshot({ path: test.info().outputPath("about-mobile.png"), fullPage: true });
});

test("primary, Campus and Business logos render from their brand assets", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('img[src="/brand/monk-icon.svg"]').first()).toBeVisible();
  await page.goto("/campus");
  await expect(page.getByRole("img", { name: "MONK Campus" })).toBeVisible();
  await page.goto("/business");
  await expect(page.getByRole("img", { name: "MONK Business" })).toBeVisible();
});

test("contact page exposes email support without publishing a personal phone number", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByRole("heading", { name: /a clear path to the right help/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /WhatsApp support/i })).toHaveCount(0);
  await expect(page.getByRole("complementary").getByRole("link", { name: /admin@monk.monster/i })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/WhatsApp|92884\s*35641|919288435641/i);
});

test("manifest and favicon are served by the production preview", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  const manifestJson = await manifest.json();
  expect(manifestJson.name).toMatch(/MONK/i);
  expect(manifestJson.icons[0].src).toBe("/brand/monk-icon.svg");
  const brandIcon = await request.get(manifestJson.icons[0].src);
  expect(brandIcon.status()).toBe(200);
  expect(await brandIcon.text()).toContain("<svg");
  const favicon = await request.get("/favicon.svg");
  expect(favicon.status()).toBe(200);
  expect(await favicon.text()).toContain("<svg");
});

test("contact form submits to the server-side support intake and shows a reference", async ({ page }) => {
  await page.route("https://yucwackrbekwaxiyuobt.supabase.co/functions/v1/support-ticket-intake", async route => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, ticketRef: "MONK-20261123-AB12CD34", createdAt: "2026-11-23T12:00:00.000Z", notification: "not_configured" })
    });
  });
  await page.goto("/contact");
  await page.getByLabel(/Your name/i).fill("Test User");
  await page.getByLabel(/Email address/i).fill("test@example.com");
  await page.getByLabel(/Message/i).fill("I need help with my MONK workspace account.");
  await page.getByRole("button", { name: /Submit support request/i }).click();
  await expect(page.getByRole("status")).toContainText("MONK-20261123-AB12CD34");
});
