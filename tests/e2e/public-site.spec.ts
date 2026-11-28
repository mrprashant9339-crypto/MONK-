import { expect, test } from "@playwright/test";

// Cloudflare Turnstile is an external anti-bot service. Browser E2E tests use a
// deterministic client stub; server-side Siteverify is covered separately.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "turnstile", {
      configurable: true,
      value: {
        render: (_container: HTMLElement, options: { callback: (token: string) => void }) => {
          queueMicrotask(() => options.callback("playwright-turnstile-test-token"));
          return "playwright-widget";
        },
        reset: () => undefined,
        remove: () => undefined
      }
    });
  });
});

const publicRoutes = [
  "/",
  "/about",
  "/documentation",
  "/updates",
  "/faq",
  "/campus",
  "/business",
  "/directory",
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
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
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
  const createAccount = page.getByRole("button", { name: /create secure account/i });
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
  await expect(page.getByRole("complementary").getByRole("link", { name: /support@monk.monster/i })).toBeVisible();
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


test("homepage gives colleges and businesses distinct primary paths", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /College operations and business workflows/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /I run a college.*Explore Campus/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /I run a business.*Explore Business/i })).toBeVisible();
  await page.getByRole("button", { name: /I run a college.*Explore Campus/i }).click();
  await expect(page).toHaveURL(/\/campus$/);
  await page.goto("/");
  await page.getByRole("button", { name: /I run a business.*Explore Business/i }).click();
  await expect(page).toHaveURL(/\/business$/);
});

test("direct signup path opens the canonical account creation screen", async ({ page }) => {
  await page.goto("/signup");
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("button", { name: /create secure account/i })).toBeVisible();
  await expect(page.getByRole("checkbox")).toBeVisible();
});

test("homepage and consent banner fit common mobile widths", async ({ page }) => {
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      banner: (() => {
        const element = document.querySelector(".cookie-notice");
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, height: rect.height };
      })()
    }));
    expect(dimensions.document, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(width + 2);
    expect(dimensions.banner).not.toBeNull();
    expect(dimensions.banner!.top).toBeGreaterThanOrEqual(0);
    expect(dimensions.banner!.bottom).toBeLessThanOrEqual(844);
    await expect(page.getByRole("button", { name: /I run a college/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /I run a business/i })).toBeVisible();
  }
});

test("public header controls expose a visible keyboard focus indicator", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focusStyle = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return null;
    const style = getComputedStyle(active);
    return { tag: active.tagName, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focusStyle).not.toBeNull();
  expect(focusStyle!.outlineStyle).not.toBe("none");
  expect(focusStyle!.outlineWidth).not.toBe("0px");
});


test("login, password recovery and password reset routes load the shared auth experience", async ({ page }) => {
  for (const route of ["/login?vertical=education", "/forgot-password", "/reset-password", "/auth/callback?vertical=business"]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator(".authx-card")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await page.goto("/forgot-password");
  await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  await page.goto("/reset-password");
  await expect(page.locator('.authx-form input[placeholder="At least 12 characters"]')).toBeVisible();
  await expect(page.locator('.authx-form input[placeholder="Enter password again"]')).toBeVisible();
});

test("Campus and Business signup expose accessible role cards without granting authority", async ({ page }) => {
  await page.goto("/login?mode=signup&vertical=education");
  await expect(page.getByText("MONK Campus")).toBeVisible();
  const campusRoles = page.getByRole("radiogroup", { name: "Campus account type" });
  await expect(campusRoles.getByRole("radio", { name: /Student/i })).toHaveAttribute("aria-checked", "true");
  await campusRoles.getByRole("radio", { name: /Teacher \/ Faculty/i }).click();
  await expect(campusRoles.getByRole("radio", { name: /Teacher \/ Faculty/i })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText(/does not grant permissions/i)).toBeVisible();
  await page.goto("/login?mode=signup&vertical=business");
  await expect(page.getByText("MONK Business")).toBeVisible();
  const businessRoles = page.getByRole("radiogroup", { name: "Business workspace role" });
  await expect(businessRoles.getByRole("radio", { name: /Business owner/i })).toHaveAttribute("aria-checked", "true");
  await businessRoles.getByRole("radio", { name: /Manager/i }).click();
  await expect(businessRoles.getByRole("radio", { name: /Manager/i })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText(/permissions are granted by the organization owner/i)).toBeVisible();
});

test("Campus signup exposes institution selection and blocks incomplete Google profiles", async ({ page }) => {
  await page.goto("/login?mode=signup&vertical=education");
  await expect(page.getByText("MONK Campus")).toBeVisible();
  await expect(page.getByRole("searchbox", { name: /college or institution/i })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Student/i })).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Continue with Google/i }).click();
  await expect(page.getByRole("alert")).toContainText(/Enter your full name before continuing with Google/i);
  await expect(page).toHaveURL(/\/login\?mode=signup&vertical=education/);
});

test("split-screen authentication panel remains visible and fits desktop, tablet and mobile", async ({ page }) => {
  for (const [width, height] of [[1440, 900], [768, 1024], [390, 844], [360, 800]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/login?vertical=business");
    await expect(page.locator(".authx-card")).toBeVisible();
    await expect(page.locator(".authx-aside")).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth
    }));
    expect(dimensions.document, `authentication overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 2);
  }
});

test("Google sign-in controls appear after the required auth form and legal acknowledgement", async ({ page }) => {
  await page.goto("/login?mode=signup&vertical=education");
  const order = await page.locator(".authx-form").evaluate(form => {
    const google = document.querySelector(".authx-google");
    return Boolean(google && (form.compareDocumentPosition(google) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(order).toBe(true);
  await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
});

test("India-wide directory renders source-aware filters and an honest empty state", async ({ page }) => {
  await page.route("**/rest/v1/monk_directory_*", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "content-range": "*/0" },
    body: "[]"
  }));
  await page.goto("/directory");
  const directory = page.locator("#college-directory");
  await expect(directory).toBeVisible();
  await expect(directory.getByRole("heading", { name: /explore institutions/i })).toBeVisible();
  await expect(directory.getByLabel("Search institutions")).toBeVisible();
  await expect(directory.getByLabel("Category")).toBeVisible();
  await expect(directory.getByLabel("State / Union Territory")).toBeVisible();
  await expect(directory.getByLabel("Ownership")).toBeVisible();
  await expect(directory.getByText("Published listings are being prepared")).toBeVisible();
  await expect(directory.getByText(/No institution or approval records are fabricated/i)).toBeVisible();
  await expect(directory.getByText(/46 Government polytechnic institutes|Directory preview/i)).toHaveCount(0);
});


test("Data Rights page collects and submits privacy requests through the secure support workflow", async ({ page }) => {
  await page.goto("/data-rights");
  await expect(page.getByRole("heading", { name: /submit a privacy-aware request/i })).toBeVisible();
  await expect(page.getByLabel(/Your name/i)).toBeVisible();
  await expect(page.getByLabel(/Account email/i)).toBeVisible();
  await expect(page.getByLabel(/Request details/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /submit privacy request/i })).toBeDisabled();
  await expect(page.getByText(/server-side support queue/i)).toBeVisible();
});
test("Campus directory provides India-wide filters without inventing institution records", async ({ page }) => {
  await page.goto("/campus", { waitUntil: "domcontentloaded" });
  const directory = page.locator("#college-directory");
  await expect(directory).toBeVisible();
  await expect(directory.getByRole("heading", { name: /explore institutions/i })).toBeVisible();
  await expect(directory.getByLabel("Category").locator("option")).toContainText(["All categories", "Engineering & Technology", "Medical Colleges"]);
  await expect(directory.getByLabel("State / Union Territory").locator("option")).toContainText(["All India", "Andaman and Nicobar Islands", "Bihar"]);
  await expect(directory.getByLabel("Ownership").locator("option")).toContainText(["All ownership types", "Central Government", "Private"]);
  await directory.getByLabel("Category").selectOption("engineering");
  await directory.getByLabel("State / Union Territory").selectOption("BR");
  await directory.getByLabel("Ownership").selectOption("private");
  await directory.getByRole("searchbox", { name: "Search institutions" }).fill("IIT");
  await directory.getByRole("searchbox", { name: "Search institutions" }).press("Enter");
  await expect(directory.locator(".national-directory-summary")).toContainText(/published institution record/i);
});
