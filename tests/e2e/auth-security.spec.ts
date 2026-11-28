import { expect, test } from "@playwright/test";

test("signup enforces the full password policy and verification resend sends a Turnstile token", async ({ page }) => {
  const authRequests: Array<{ path: string; body: Record<string, unknown> }> = [];
  const createdAt = "2026-11-27T00:00:00.000Z";
  const userId = "10000000-0000-4000-8000-000000000001";

  await page.addInitScript(() => {
    let nextWidgetId = 0;
    const containers = new Map<string, HTMLElement>();
    Object.defineProperty(window, "turnstile", {
      configurable: true,
      value: {
        render: (container: HTMLElement, options: { callback: (token: string) => void }) => {
          const id = "mock-turnstile-" + (++nextWidgetId);
          containers.set(id, container);
          const verifyButton = document.createElement("button");
          verifyButton.type = "button";
          verifyButton.textContent = "Verify test CAPTCHA";
          verifyButton.setAttribute("data-testid", "mock-turnstile-verify");
          verifyButton.addEventListener("click", () => options.callback("e2e-turnstile-token-" + nextWidgetId));
          container.replaceChildren(verifyButton);
          return id;
        },
        remove: (id: string) => {
          containers.get(id)?.replaceChildren();
          containers.delete(id);
        },
        reset: (id?: string) => {
          if (id) containers.get(id)?.replaceChildren();
        }
      }
    });
  });

  await page.route("https://ysspnuldfiijagagwiqk.supabase.co/auth/v1/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const body = request.postDataJSON?.() as Record<string, unknown> | undefined;
    authRequests.push({ path: url.pathname, body: body ?? {} });

    if (url.pathname === "/auth/v1/signup") {
      const email = String(body?.email ?? "");
      const user = {
        id: userId,
        aud: "authenticated",
        role: "authenticated",
        email,
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: body?.data ?? {},
        identities: [{
          identity_id: userId,
          id: email,
          user_id: userId,
          identity_data: { sub: userId, email },
          provider: "email",
          last_sign_in_at: null,
          created_at: createdAt,
          updated_at: createdAt
        }],
        created_at: createdAt,
        updated_at: createdAt
      };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user, session: null }) });
      return;
    }

    if (url.pathname === "/auth/v1/resend") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/signup?vertical=business");
  await page.locator('input[autocomplete="name"]').fill("MONK Staging Tester");
  await page.locator('input[type="email"]').fill("monk-auth-regression@example.test");
  const passwordInputs = page.locator('input[autocomplete="new-password"]');
  await passwordInputs.nth(0).fill("SecureMonk2026");
  await passwordInputs.nth(1).fill("SecureMonk2026");
  await page.getByRole("checkbox").check();
  await page.getByTestId("mock-turnstile-verify").click();
  await page.getByRole("button", { name: /Create secure account/ }).click();

  await expect(page.getByRole("alert")).toContainText("special character");
  expect(authRequests.filter(request => request.path === "/auth/v1/signup")).toHaveLength(0);

  await passwordInputs.nth(0).fill("SecureMonk2026!");
  await passwordInputs.nth(1).fill("SecureMonk2026!");
  await page.getByTestId("mock-turnstile-verify").click();
  await page.getByRole("button", { name: /Create secure account/ }).click();

  await expect(page.getByRole("heading", { name: "Verification email sent" })).toBeVisible();
  const signupRequest = authRequests.find(request => request.path === "/auth/v1/signup");
  expect(signupRequest?.body.email).toBe("monk-auth-regression@example.test");
  expect((signupRequest?.body.gotrue_meta_security as Record<string, unknown>)?.captcha_token).toMatch(/^e2e-turnstile-token-/);

  await page.getByTestId("mock-turnstile-verify").click();
  const resendButton = page.getByRole("button", { name: "Resend verification email" });
  await expect(resendButton).toBeEnabled();
  await resendButton.click();

  await expect(page.locator(".authx-pending")).toContainText("new confirmation email has been sent");
  const resendRequest = authRequests.find(request => request.path === "/auth/v1/resend");
  expect(resendRequest?.body.email).toBe("monk-auth-regression@example.test");
  expect(resendRequest?.body.type).toBe("signup");
  expect((resendRequest?.body.gotrue_meta_security as Record<string, unknown>)?.captcha_token).toMatch(/^e2e-turnstile-token-/);
});


test("login and forgot-password requests both forward the current Turnstile token", async ({ page }) => {
  const authRequests: Array<{ path: string; body: Record<string, unknown> }> = [];

  await page.addInitScript(() => {
    let nextWidgetId = 0;
    const containers = new Map<string, HTMLElement>();
    Object.defineProperty(window, "turnstile", {
      configurable: true,
      value: {
        render: (container: HTMLElement, options: { callback: (token: string) => void }) => {
          const id = "mock-turnstile-" + (++nextWidgetId);
          containers.set(id, container);
          const verifyButton = document.createElement("button");
          verifyButton.type = "button";
          verifyButton.textContent = "Verify test CAPTCHA";
          verifyButton.setAttribute("data-testid", "mock-turnstile-verify");
          verifyButton.addEventListener("click", () => options.callback("e2e-turnstile-token-" + nextWidgetId));
          container.replaceChildren(verifyButton);
          return id;
        },
        remove: (id: string) => {
          containers.get(id)?.replaceChildren();
          containers.delete(id);
        },
        reset: (id?: string) => {
          if (id) containers.get(id)?.replaceChildren();
        }
      }
    });
  });

  await page.route("https://ysspnuldfiijagagwiqk.supabase.co/auth/v1/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const body = request.postDataJSON?.() as Record<string, unknown> | undefined;
    authRequests.push({ path: url.pathname, body: body ?? {} });

    if (url.pathname === "/auth/v1/token") {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" })
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/login?vertical=business");
  await page.locator('input[type="email"]').fill("MONK-TEST@EXAMPLE.TEST");
  await page.locator('input[autocomplete="current-password"]').fill("DemoPassword2026!");
  await page.getByTestId("mock-turnstile-verify").click();
  await page.getByRole("button", { name: /Sign in/ }).click();

  await expect(page.getByRole("alert")).toContainText("Invalid login credentials");
  const loginRequest = authRequests.find(request => request.path === "/auth/v1/token");
  expect(loginRequest?.body.email).toBe("monk-test@example.test");
  expect((loginRequest?.body.gotrue_meta_security as Record<string, unknown>)?.captcha_token).toMatch(/^e2e-turnstile-token-/);

  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.locator('input[type="email"]').fill("MONK-TEST@EXAMPLE.TEST");
  await page.getByTestId("mock-turnstile-verify").click();
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(page.getByRole("status")).toContainText("password-reset email has been sent");
  const recoveryRequest = authRequests.find(request => request.path === "/auth/v1/recover");
  expect(recoveryRequest?.body.email).toBe("monk-test@example.test");
  expect((recoveryRequest?.body.gotrue_meta_security as Record<string, unknown>)?.captcha_token).toMatch(/^e2e-turnstile-token-/);
});


test("password reset rejects weak/mismatched passwords and updates a compliant password with an active recovery session", async ({ page }) => {
  const authRequests: Array<{ method: string; path: string; body: Record<string, unknown> }> = [];
  const userId = "10000000-0000-4000-8000-000000000099";
  const email = "monk-reset-regression@example.test";

  await page.addInitScript(({ userId, email }) => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem("sb-ysspnuldfiijagagwiqk-auth-token", JSON.stringify({
      access_token: "e2e-recovery-access-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: now + 3600,
      refresh_token: "e2e-recovery-refresh-token",
      user: {
        id: userId,
        aud: "authenticated",
        role: "authenticated",
        email,
        email_confirmed_at: new Date().toISOString(),
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: { full_name: "Reset Regression Tester" },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }));
  }, { userId, email });

  await page.route("https://ysspnuldfiijagagwiqk.supabase.co/auth/v1/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const body = request.postDataJSON?.() as Record<string, unknown> | undefined;
    authRequests.push({ method: request.method(), path: url.pathname, body: body ?? {} });

    if (url.pathname === "/auth/v1/user" && request.method() === "PUT") {
      const user = {
        id: userId,
        aud: "authenticated",
        role: "authenticated",
        email,
        email_confirmed_at: new Date().toISOString(),
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: { full_name: "Reset Regression Tester" },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(user) });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/reset-password");

  await expect(page.getByRole("heading", { name: "Set a new password." })).toBeVisible();
  const passwordFields = page.locator('input[autocomplete="new-password"]');
  await passwordFields.nth(0).fill("SecureReset2026");
  await passwordFields.nth(1).fill("SecureReset2026");
  await page.getByRole("button", { name: "Update password" }).click();

  await expect(page.getByRole("alert")).toContainText("special character");
  expect(authRequests.filter(request => request.path === "/auth/v1/user" && request.method === "PUT")).toHaveLength(0);

  await passwordFields.nth(0).fill("SecureReset2026!");
  await passwordFields.nth(1).fill("SecureReset2026?");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("alert")).toContainText("do not match");
  expect(authRequests.filter(request => request.path === "/auth/v1/user" && request.method === "PUT")).toHaveLength(0);

  await passwordFields.nth(1).fill("SecureReset2026!");
  await page.getByRole("button", { name: "Update password" }).click();

  await expect(page.getByRole("status")).toContainText("Password updated. Your account is ready to use.");
  const updateRequest = authRequests.find(request => request.path === "/auth/v1/user" && request.method === "PUT");
  expect(updateRequest?.body.password).toBe("SecureReset2026!");
  await expect(passwordFields.nth(0)).toHaveValue("");
  await expect(passwordFields.nth(1)).toHaveValue("");
});
