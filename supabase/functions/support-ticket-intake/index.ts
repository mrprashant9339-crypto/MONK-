import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://monk.monster",
  "https://www.monk.monster",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(origin: string | null) {
  const allowed = origin && allowedOrigins.has(origin) ? origin : "https://monk.monster";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(data: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

const categories = new Set([
  "General enquiry", "Account access", "Workspace or product issue",
  "Privacy or data request", "Security vulnerability", "Accessibility issue",
  "Technical issue", "Billing or refund", "Campus workspace",
  "Business workspace", "Security concern", "Other",
]);

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return json({ error: "Origin not allowed." }, 403, origin);

  try {
    // Enforce the limit against the actual payload, not only Content-Length (which
    // may be absent or incorrect on streamed/chunked requests).
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > 12000) {
      return json({ error: "Request is too large." }, 413, origin);
    }

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return json({ error: "Invalid request." }, 400, origin);
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return json({ error: "Invalid JSON request." }, 400, origin);
    }

    // Honeypot: silently accept bots without storing or notifying.
    if (clean(body.website, 200)) return json({ ok: true, ticketRef: "MONK-RECEIVED" }, 200, origin);

    const fullName = clean(body.fullName, 80);
    const email = clean(body.email, 254).toLowerCase();
    const category = clean(body.category, 80);
    const subject = clean(body.subject, 120);
    const message = clean(body.message, 4000);

    if (fullName.length < 2 || !validEmail(email) || !categories.has(category) ||
        subject.length < 4 || message.length < 10) {
      return json({ error: "Please check the required fields and try again." }, 400, origin);
    }

    const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
    const secretKey = secretKeysRaw
      ? (JSON.parse(secretKeysRaw) as Record<string, string>).default
      : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl || !secretKey) {
      console.error("Support intake server configuration is incomplete.");
      return json({ error: "Support intake is temporarily unavailable. Please use the published email address." }, 503, origin);
    }

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const ip = req.headers.get("cf-connecting-ip") ||
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    const ipHash = await sha256(ip + ":" + new URL(supabaseUrl).host);
    const now = Date.now();
    const windowStart = new Date(Math.floor(now / 3600000) * 3600000).toISOString();
    const { data: allowed, error: rateError } = await admin.rpc("consume_support_intake_rate_limit", {
      p_ip_hash: ipHash,
      p_window_start: windowStart,
      p_limit: 5,
    });
    if (rateError) {
      console.error("Support rate-limit check failed:", rateError.message);
      return json({ error: "Support intake is temporarily unavailable. Please try again later." }, 503, origin);
    }
    if (allowed !== true) return json({ error: "Too many requests from this connection. Please try again later." }, 429, origin);

    const { data: ticket, error: insertError } = await admin
      .from("support_tickets")
      .insert({ full_name: fullName, email, category, subject, message, ip_hash: ipHash })
      .select("id,ticket_ref,created_at")
      .single();
    if (insertError || !ticket) {
      console.error("Support ticket insert failed:", insertError?.message || "No ticket returned");
      return json({ error: "We could not save your request. Please try again." }, 500, origin);
    }

    let notificationStatus = "not_configured";
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const inboxEmail = Deno.env.get("SUPPORT_INBOX_EMAIL") || "admin@monk.monster";
    if (resendKey && fromEmail) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: fromEmail,
            to: [inboxEmail],
            reply_to: email,
            subject: `[${ticket.ticket_ref}] ${subject}`,
            text: [
              `Ticket: ${ticket.ticket_ref}`,
              `Name: ${fullName}`,
              `Email: ${email}`,
              `Category: ${category}`,
              "",
              message,
            ].join("\n"),
          }),
        });
        notificationStatus = emailResponse.ok ? "sent" : "failed";
        if (!emailResponse.ok) console.error("Support notification provider returned:", emailResponse.status);
      } catch (mailError) {
        notificationStatus = "failed";
        console.error("Support notification request failed:", mailError);
      }
    }
    await admin.from("support_tickets").update({ notification_status: notificationStatus }).eq("id", ticket.id);

    return json({
      ok: true,
      ticketRef: ticket.ticket_ref,
      createdAt: ticket.created_at,
      notification: notificationStatus,
    }, 201, origin);
  } catch (error) {
    console.error("Support intake request failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Unexpected error while submitting your request." }, 500, origin);
  }
});
