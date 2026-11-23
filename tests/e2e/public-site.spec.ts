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
  "/contact",
  "/thank-you"
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

test("extended homepage sections, app preview and footer render", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".brand-marquee")).toBeVisible();
  await expect(page.getByRole("heading", { name: /different work/i })).toBeVisible();
  await expect(page.locator(".product-ui-window")).toBeVisible();
  await expect(page.locator(".site-scroll-progress")).toBeAttached();
  await expect(page.locator("footer .footer-feature-panel")).toBeVisible();
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

test("contact form submits to the server-side support intake and opens a noindex thank-you page", async ({ page }) => {
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
  await expect(page).toHaveURL(/\/thank-you$/);
  await expect(page.getByText("MONK-20261123-AB12CD34")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

test("unknown production URLs return an actual HTTP 404", async ({ request }) => {
  test.skip(!process.env.MONK_BASE_URL, "Real Worker HTTP status is checked in the production deployment job.");
  const response = await request.get("/this-monk-page-should-not-exist-404-check");
  expect(response.status()).toBe(404);
  expect(await response.text()).toContain("ERROR 404");
});

test("route-specific titles and social preview tags are served before hydration", async ({ page }) => {
  await page.goto("/campus");
  await expect(page).toHaveTitle("MONK Campus — College & Institution Workspaces");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "MONK Campus — College & Institution Workspaces");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://monk.monster/brand/monk-share-placeholder.svg");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await page.goto("/business");
  await expect(page).toHaveTitle("MONK Business — Business Operations Workspace");
});

test("GA4 loads only after consent and only when a real Measurement ID is configured", async ({ page }) => {
  const measurementId = process.env.VITE_GA4_MEASUREMENT_ID;
  const validMeasurementId = Boolean(measurementId && /^G-[A-Z0-9]{10}$/i.test(measurementId) && measurementId !== "G-XXXXXXXXXX");
  await page.goto("/");
  await expect(page.locator(".cookie-notice")).toBeVisible();
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Accept optional" }).click();
  if (validMeasurementId) {
    await expect(page.locator(`script[src*="googletagmanager.com/gtag/js?id=${measurementId}"]`)).toHaveCount(1);
  } else {
    await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(0);
  }
});

test("FAQ contains current answers and reviews are explicitly unpublished placeholders", async ({ page }) => {
  await page.goto("/faq");
  await expect(page.getByText(/Is MONK a registered company or official college portal/i)).toBeVisible();
  await expect(page.getByText(/Is the college directory a complete India-wide directory/i)).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Real experiences/i })).toBeVisible();
  await expect(page.getByText(/No customer reviews are published yet/i)).toBeVisible();
  await expect(page.getByText("REVIEW PLACEHOLDER 01")).toBeVisible();
});

test("plain HTTP redirects to the HTTPS canonical origin", async ({ request }) => {
  test.skip(!process.env.MONK_BASE_URL, "HTTP-to-HTTPS redirect is checked only against production.");
  const response = await request.get("http://monk.monster", { maxRedirects: 0 });
  expect([301, 302, 307, 308]).toContain(response.status());
  expect(response.headers().location).toMatch(/^https:\/\//);
});

test("internal links across public pages resolve to real pages or assets", async ({ page }) => {
  const hrefs = new Set<string>();
  for (const route of publicRoutes) {
    await page.goto(route);
    const currentOrigin = new URL(page.url()).origin;
    const links = await page.locator("a[href]").evaluateAll(anchors =>
      anchors.map(anchor => (anchor as HTMLAnchorElement).href)
    );
    for (const href of links) {
      const url = new URL(href, page.url());
      if (url.origin !== currentOrigin) continue;
      if (url.pathname === new URL(page.url()).pathname && url.hash) continue;
      hrefs.add(url.pathname + url.search);
    }
  }
  const origin = new URL(page.url()).origin;
  for (const href of hrefs) {
    const response = await page.request.get(new URL(href, origin).toString());
    expect(response.status(), `broken internal link: ${href}`).toBeLessThan(400);
  }
});
