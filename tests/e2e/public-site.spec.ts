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
  "/features", "/solutions", "/pricing", "/compare-plans", "/integrations", "/resources",
  "/blog", "/blog/building-with-clarity", "/case-studies", "/case-studies/local-business-example",
  "/roadmap", "/careers", "/partners", "/403", "/500", "/session-expired"
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

test("manifest and favicon are served by the production preview", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  const manifestJson = await manifest.json();
  expect(manifestJson.name).toMatch(/MONK/i);
  const favicon = await request.get("/favicon.svg");
  expect(favicon.status()).toBe(200);
  expect(await favicon.text()).toContain("<svg");
});

const trustRoutes = [
  "/contact",
  "/support/tickets",
  "/support/tickets/LOCAL-MISSING",
  "/status",
  "/incidents",
  "/security-center",
  "/security/vulnerability-disclosure",
  "/privacy-center",
  "/cookies/preferences",
  "/data-rights",
  "/offline",
  "/maintenance",
  "/error",
  "/this-route-does-not-exist"
];

test("support, trust, privacy and recovery routes render meaningful pages", async ({ page }) => {
  for (const route of trustRoutes) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response, `missing document response for ${route}`).not.toBeNull();
    expect(response!.status(), `unexpected HTTP status for ${route}`).toBe(200);
    await expect(page.locator("body"), `missing page content for ${route}`).toContainText(/MONK/i);
    await expect(page.locator("h1").first(), `missing page heading for ${route}`).toBeVisible();
  }
});

test("offline fallback and service worker assets are available", async ({ request }) => {
  const offline = await request.get("/offline.html");
  expect(offline.status()).toBe(200);
  expect(await offline.text()).toContain("You're offline right now.");
  const worker = await request.get("/sw.js");
  expect(worker.status()).toBe(200);
  expect(await worker.text()).toContain("monk-shell-v1");
});

test("feature filters and integration search update the visible catalogue", async ({ page }) => {
  await page.goto("/features");
  await page.getByRole("button", { name: "Planned" }).click();
  await expect(page.getByRole("heading", { name: "AI-assisted workflows" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Workspace foundation" })).toHaveCount(0);
  await page.goto("/integrations");
  await page.getByRole("textbox", { name: "Search integrations" }).fill("Supabase");
  await expect(page.getByRole("heading", { name: "Supabase" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Email delivery" })).toHaveCount(0);
});

test("pricing does not invent prices or expose checkout", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText(/No fabricated prices or checkout/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /contact the project/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /buy|subscribe|checkout/i })).toHaveCount(0);
});

test("case study examples are explicitly labelled illustrative", async ({ page }) => {
  await page.goto("/case-studies/local-business-example");
  await expect(page.getByText(/Illustrative scenario — not a customer case study/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /local business workflow example/i })).toBeVisible();
});

test("unknown editorial slugs and recovery routes provide clear next steps", async ({ page }) => {
  for (const route of ["/blog/missing-article", "/case-studies/missing-example", "/403", "/500", "/session-expired"]) {
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /contact support/i })).toBeVisible();
  }
});

test("FAQ search and accordion are keyboard-operable", async ({ page }) => {
  await page.goto("/faq");
  const firstQuestion = page.getByRole("button", { name: /what is monk/i });
  await expect(firstQuestion).toHaveAttribute("aria-expanded", "true");
  await firstQuestion.click();
  await expect(firstQuestion).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("textbox", { name: /search frequently asked questions/i }).fill("pricing");
  await expect(page.getByText(/No verified public price list/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /what is monk/i })).toHaveCount(0);
});

test("new public sections are discoverable from the primary website navigation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Features", exact: true }).click();
  await expect(page).toHaveURL(/\/features$/);
  await expect(page.getByRole("heading", { name: /one foundation for focused work/i })).toBeVisible();
  await page.getByRole("link", { name: "Pricing", exact: true }).click();
  await expect(page).toHaveURL(/\/pricing$/);
});
