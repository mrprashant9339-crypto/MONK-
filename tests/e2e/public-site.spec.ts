import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/about",
  "/signup",
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
  "/roadmap", "/careers", "/partners", "/403", "/500", "/session-expired",
  "/forgot-password", "/reset-password", "/verify-email", "/account-recovery", "/mfa", "/invite"
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

test("homepage offers distinct Campus and Business paths", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /I run a college.*Explore Campus/i }).click();
  await expect(page).toHaveURL(/\/campus$/);
  await page.getByRole("button", { name: /Create a college workspace/i }).click();
  await expect(page).toHaveURL(/\/signup\?vertical=education$/);

  await page.goto("/business");
  await page.getByRole("button", { name: /Create a business workspace/i }).click();
  await expect(page).toHaveURL(/\/signup\?vertical=business$/);
});

test("footer navigation opens the About page", async ({ page }) => {
  await page.goto("/");
  const aboutLink = page.locator("footer").getByRole("link", { name: /about the project/i });
  await expect(aboutLink).toBeVisible();
  await aboutLink.click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: /two focused workspaces/i })).toBeVisible();
});

test("canonical signup route and legacy query alias open the same registration flow", async ({ page }) => {
  await page.goto("/signup");
  const checkbox = page.getByRole("checkbox");
  await expect(checkbox).toBeVisible();
  const createAccount = page.getByRole("button", { name: /create account/i });
  await expect(createAccount).toBeDisabled();
  await checkbox.check();
  await expect(createAccount).toBeEnabled();
  await expect(page.getByRole("link", { name: /terms of service/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /privacy policy/i })).toBeVisible();
  await page.goto("/login?mode=signup");
  await expect(page.getByRole("checkbox")).toBeVisible();
  await expect(page.getByRole("button", { name: /create account/i })).toBeDisabled();
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
  await page.getByRole("banner").getByRole("link", { name: "Features", exact: true }).click();
  await expect(page).toHaveURL(/\/features$/);
  await expect(page.getByRole("heading", { name: /one foundation for focused work/i })).toBeVisible();
  await page.getByRole("banner").getByRole("link", { name: "Pricing", exact: true }).click();
  await expect(page).toHaveURL(/\/pricing$/);
});

test("account recovery and verification pages provide safe, usable forms", async ({ page }) => {
  await page.goto("/forgot-password");
  await expect(page.getByRole("heading", { name: /reset your password/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /send recovery email/i })).toBeDisabled();
  await page.getByRole("textbox", { name: /email address/i }).fill("person@example.com");
  await expect(page.getByRole("button", { name: /send recovery email/i })).toBeEnabled();

  await page.goto("/reset-password");
  await page.getByRole("textbox", { name: "New password", exact: true }).fill("StrongPassword123");
  await page.getByRole("textbox", { name: "Confirm new password", exact: true }).fill("DifferentPassword123");
  await expect(page.getByRole("button", { name: /update password/i })).toBeDisabled();
  await page.getByRole("textbox", { name: "Confirm new password", exact: true }).fill("StrongPassword123");
  await expect(page.getByRole("button", { name: /update password/i })).toBeEnabled();

  await page.goto("/verify-email");
  await expect(page.getByRole("heading", { name: /verify your email address/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /resend confirmation email/i })).toBeDisabled();
});

test("MFA settings require authentication and invite route explains next step", async ({ page }) => {
  await page.goto("/mfa");
  await expect(page.getByRole("heading", { name: /multi-factor authentication/i })).toBeVisible();
  await expect(page.getByText(/sign in before managing multi-factor authentication/i)).toBeVisible();
  await page.goto("/invite");
  await expect(page.getByRole("heading", { name: /workspace invitation/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /continue to sign in/i })).toBeVisible();
});

test("login exposes password recovery and email verification routes", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("link", { name: /forgot password/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /resend email verification/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /account security \/ mfa/i })).toBeVisible();
});

test("Campus directory provides India-wide institution filters and published-record search", async ({ page }) => {
  await page.goto("/campus", { waitUntil: "domcontentloaded" });
  const directory = page.locator("#college-directory");
  await expect(directory).toBeVisible();
  await expect(directory.getByRole("heading", { name: /explore institutions/i })).toBeVisible();

  const category = directory.getByLabel("Category");
  const region = directory.getByLabel("State / Union Territory");
  const ownership = directory.getByLabel("Ownership");
  await expect(category.locator("option")).toContainText(["All categories", "Engineering & Technology", "Medical Colleges", "Law Colleges"]);
  await expect(region.locator("option")).toContainText(["All India", "Andaman and Nicobar Islands", "Bihar"]);
  await expect(ownership.locator("option")).toContainText(["All ownership types", "Central Government", "Private"]);

  await category.selectOption("engineering");
  await region.selectOption("BR");
  await ownership.selectOption("private");
  const search = directory.getByRole("searchbox", { name: "Search institutions" });
  await search.fill("IIT");
  await search.press("Enter");
  await expect(directory.locator(".national-directory-summary")).toContainText(/published institution record/i);
  await expect(directory.locator("form button[type=submit]")).toBeVisible();
});

test("support ticket form submits through the intake API and stores only a receipt reference", async ({ page }) => {
  let submitted: Record<string, unknown> | null = null;

  await page.route("**/functions/v1/support-ticket-intake", async (route) => {
    const request = route.request();
    const origin = request.headers().origin ?? "*";
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 200,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": request.headers()["access-control-request-headers"] ?? "authorization, apikey, content-type, x-client-info",
          "access-control-max-age": "86400",
          vary: "Origin"
        },
        body: "ok"
      });
      return;
    }

    submitted = request.postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      headers: {
        "access-control-allow-origin": origin,
        "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
        "content-type": "application/json",
        vary: "Origin"
      },
      body: JSON.stringify({
        ok: true,
        ticketRef: "MONK-2026-TEST",
        createdAt: "2026-11-23T00:00:00.000Z",
        notification: "sent"
      })
    });
  });

  await page.goto("/support/tickets");
  await page.getByLabel(/full name/i).fill("Test User");
  await page.getByLabel(/subject/i).fill("Test support request");
  await page.getByLabel(/category/i).selectOption("Campus workspace");
  await page.getByLabel(/email address/i).fill("test@example.com");
  await page.getByLabel(/details/i).fill("This is a browser test of the support intake submission.");
  await expect(page.getByRole("button", { name: /submit support request/i })).toBeEnabled();
  await page.getByRole("button", { name: /submit support request/i }).click();

  await expect(page.getByRole("status")).toContainText("MONK-2026-TEST");
  expect(submitted).toMatchObject({
    fullName: "Test User",
    email: "test@example.com",
    category: "Campus workspace",
    subject: "Test support request"
  });
  expect(submitted?.website).toBe("");

  const receipt = await page.evaluate(() => JSON.parse(localStorage.getItem("monk-support-tickets-v1") || "[]"));
  expect(receipt).toHaveLength(1);
  expect(receipt[0]).toMatchObject({
    id: "MONK-2026-TEST",
    ticketRef: "MONK-2026-TEST",
    status: "Submitted"
  });
  expect(receipt[0]).not.toHaveProperty("message");
  expect(receipt[0]).not.toHaveProperty("email");
  expect(receipt[0]).not.toHaveProperty("fullName");

  await page.goto("/support/tickets/MONK-2026-TEST");
  await expect(page.getByText(/submission received; live tracking unavailable/i)).toBeVisible();
  await expect(page.getByText(/support inbox notified/i)).toBeVisible();
});

test("support intake failures show the backend rejection and do not save a receipt", async ({ page }) => {
  await page.route("**/functions/v1/support-ticket-intake", async (route) => {
    const request = route.request();
    const origin = request.headers().origin ?? "*";
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 200,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": request.headers()["access-control-request-headers"] ?? "authorization, apikey, content-type, x-client-info",
          "access-control-max-age": "86400",
          vary: "Origin"
        },
        body: "ok"
      });
      return;
    }
    await route.fulfill({
      status: 429,
      headers: {
        "access-control-allow-origin": origin,
        "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
        "content-type": "application/json",
        vary: "Origin"
      },
      body: JSON.stringify({ error: "Too many requests from this connection. Please try again later." })
    });
  });

  await page.goto("/support/tickets");
  await page.getByLabel(/full name/i).fill("Test User");
  await page.getByLabel(/subject/i).fill("Rate limit test");
  await page.getByLabel(/category/i).selectOption("Technical issue");
  await page.getByLabel(/email address/i).fill("test@example.com");
  await page.getByLabel(/details/i).fill("This request should be rejected by the server-side rate limit.");
  await page.getByRole("button", { name: /submit support request/i }).click();

  await expect(page.getByRole("alert")).toContainText("Too many requests from this connection");
  await expect(page.getByRole("button", { name: /submit support request/i })).toBeEnabled();
  const receipt = await page.evaluate(() => JSON.parse(localStorage.getItem("monk-support-tickets-v1") || "[]"));
  expect(receipt).toHaveLength(0);
});
