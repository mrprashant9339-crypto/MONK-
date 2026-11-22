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

test("footer navigation opens the About page", async ({ page }) => {
  await page.goto("/");
  const aboutLink = page.locator("footer").getByRole("link", { name: /about the project/i });
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

test("contact page exposes email and WhatsApp support routes", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByRole("heading", { name: /a clear path to the right help/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /WhatsApp support/i })).toHaveAttribute("href", "https://wa.me/919288435641");
  await expect(page.getByRole("complementary").getByRole("link", { name: /admin@monk.monster/i })).toBeVisible();
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
