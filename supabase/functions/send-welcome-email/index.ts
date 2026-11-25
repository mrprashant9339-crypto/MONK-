import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://monk.monster",
  "https://www.monk.monster",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(origin: string | null) {
  const headers = new Headers({
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  });
  if (origin && allowedOrigins.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);
  const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
    status,
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

  if (origin && !allowedOrigins.has(origin)) return json(403, { error: "Origin not allowed." });
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return json(405, { error: "Method not allowed." });
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Authentication required." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromAddress = Deno.env.get("MONK_EMAIL_FROM");
  const appUrl = (Deno.env.get("MONK_APP_URL") ?? "https://monk.monster").replace(/\/+$/, "");
  const supportEmail = Deno.env.get("MONK_SUPPORT_EMAIL") ?? "support@monk.monster";
  if (!supabaseUrl || !anonKey || !serviceKey) return json(500, { error: "Supabase email function configuration is incomplete." });
  if (!resendKey || !fromAddress) return json(503, { error: "Welcome email delivery is not configured.", code: "EMAIL_NOT_CONFIGURED" });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;
  if (userError || !user) return json(401, { error: "Invalid or expired session." });
  if (!user.email || !user.email_confirmed_at) return json(403, { error: "A verified email address is required." });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: claimed, error: claimError } = await admin.rpc("claim_welcome_email", { p_user_id: user.id });
  if (claimError) {
    console.error("Welcome email claim failed:", claimError.message);
    return json(500, { error: "Could not reserve the welcome email delivery." });
  }
  if (claimed !== true) {
    const { data: event } = await admin.from("email_delivery_events")
      .select("status").eq("user_id", user.id).eq("event_type", "welcome").maybeSingle();
    return json(200, { sent: event?.status === "sent", alreadyProcessed: true, status: event?.status ?? "unknown" });
  }

  const metadata = user.user_metadata ?? {};
  const rawName = typeof metadata.full_name === "string" ? metadata.full_name
    : typeof metadata.name === "string" ? metadata.name : "";
  const firstName = rawName.trim().split(/\s+/)[0] || "there";
  const safeName = escapeHtml(firstName);
  const safeSupport = escapeHtml(supportEmail);
  const dashboardUrl = appUrl + "/";

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#f5f2fa;font-family:Arial,Helvetica,sans-serif;color:#171522">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden">
<tr><td style="padding:32px 28px 26px;text-align:center;background:linear-gradient(135deg,#171027,#241044 62%,#5421a7)">
<div style="font-size:25px;font-weight:800;letter-spacing:1px;color:#fff">MONK</div>
<p style="margin:26px 0 8px;font-size:30px;line-height:1.2;font-weight:800;color:#fff">Welcome to MONK!</p>
<p style="margin:0;color:#e8defb;font-size:15px">Your account has been successfully verified.</p>
<div style="margin:28px auto 0;width:72px;height:72px;border-radius:20px;background:linear-gradient(135deg,#a855f7,#fb923c);display:flex;align-items:center;justify-content:center;color:#fff;font-size:34px;font-weight:800">M</div>
</td></tr>
<tr><td style="padding:30px 28px 12px">
<h1 style="margin:0 0 12px;font-size:23px">Hi ${safeName},</h1>
<p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#4b4657">Thank you for joining MONK. Your email is verified and your account is ready. You can now explore the workspace and tools available to your account.</p>
<div style="padding:18px;border-radius:14px;background:#f7f3ff">
<strong style="display:block;margin-bottom:14px;font-size:15px">What you can do now</strong>
<p style="margin:7px 0;color:#4b4657;font-size:14px">Explore your Campus or Business workspace</p>
<p style="margin:7px 0;color:#4b4657;font-size:14px">Manage projects, tasks and team collaboration</p>
<p style="margin:7px 0;color:#4b4657;font-size:14px">Access the features enabled for your verified role</p>
</div>
<p style="margin:26px 0;text-align:center"><a href="${dashboardUrl}" style="display:inline-block;padding:15px 28px;border-radius:999px;background:linear-gradient(90deg,#6d28d9,#f97316);color:#fff;text-decoration:none;font-size:16px;font-weight:700">Go to MONK Dashboard &#8594;</a></p>
<p style="margin:0 0 24px;text-align:center;color:#625c6d;font-size:13px">Need help? Contact <a href="mailto:${safeSupport}" style="color:#6d28d9;text-decoration:none">${safeSupport}</a></p>
</td></tr>
<tr><td style="padding:18px 28px 26px;border-top:1px solid #eeeaf4;text-align:center;color:#777181;font-size:12px">MONK · Build · Learn · Deploy · Grow<br><br>You received this email because a MONK account was created using this address.</td></tr>
</table></body></html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + resendKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress,
        to: [user.email],
        subject: "Welcome to MONK — Your journey starts here!",
        html,
        text: [
          "Welcome to MONK!",
          "",
          "Hi " + firstName + ",",
          "Your email is verified and your account is ready.",
          "Explore your MONK workspace: " + dashboardUrl,
          "Need help? " + supportEmail,
        ].join("\n"),
      }),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      await admin.from("email_delivery_events").update({
        status: "failed", last_error: "Resend HTTP " + response.status + ": " + detail, updated_at: new Date().toISOString(),
      }).eq("user_id", user.id).eq("event_type", "welcome").eq("status", "sending");
      console.error("Resend rejected welcome email:", response.status, detail);
      return json(502, { error: "The welcome email provider rejected delivery." });
    }
    const delivery = await response.json();
    await admin.from("email_delivery_events").update({
      status: "sent", provider_message_id: delivery.id ?? null, last_error: null,
      sent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("user_id", user.id).eq("event_type", "welcome").eq("status", "sending");
    return json(200, { sent: true });
  } catch (error) {
    await admin.from("email_delivery_events").update({
      status: "failed", last_error: error instanceof Error ? error.message.slice(0, 500) : "Unknown provider error",
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id).eq("event_type", "welcome").eq("status", "sending");
    console.error("Welcome email delivery failed:", error instanceof Error ? error.message : "Unknown error");
    return json(502, { error: "Welcome email delivery failed. It can be retried safely." });
  }
});
