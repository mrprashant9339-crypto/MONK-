import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char] ?? char);
}
async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Authentication required" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromAddress = Deno.env.get("MONK_EMAIL_FROM");
  const appUrl = (Deno.env.get("MONK_APP_URL") ?? "https://monk.monster").replace(/\/+$/, "");
  if (!supabaseUrl || !anonKey || !serviceKey) return json(500, { error: "Supabase function environment is incomplete." });
  if (!resendKey || !fromAddress) return json(503, { error: "Email delivery is not configured. Share the generated secure invitation link instead.", code: "EMAIL_NOT_CONFIGURED" });

  let body: { organizationId?: string; email?: string; role?: string; token?: string };
  try { body = await request.json(); } catch { return json(400, { error: "Invalid JSON body." }); }
  const organizationId = body.organizationId?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const role = body.role?.trim() ?? "";
  const token = body.token?.trim() ?? "";
  if (!organizationId || !email || !role || token.length < 32 || token.length > 256) return json(400, { error: "organizationId, email, role and a valid invitation token are required." });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json(401, { error: "Invalid or expired session." });
  const { data: canInvite, error: permissionError } = await userClient.rpc("has_org_permission", {
    target_org: organizationId, permission_key: "organization.members.invite",
  });
  if (permissionError || canInvite !== true) return json(403, { error: "You cannot send invitations for this organization." });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const tokenHash = await sha256Hex(token);
  const { data: invitation, error: invitationError } = await admin.from("invitations")
    .select("id,organization_id,email,role,invited_by,expires_at,accepted_at,revoked_at")
    .eq("token_hash", tokenHash).eq("organization_id", organizationId).maybeSingle();
  if (invitationError || !invitation) return json(404, { error: "Invitation token not found." });
  if (invitation.invited_by !== userData.user.id) return json(403, { error: "Only the original inviter can send this invitation." });
  if (String(invitation.email).toLowerCase() !== email || invitation.role !== role) return json(400, { error: "Invitation email or role does not match." });
  if (invitation.accepted_at || invitation.revoked_at || new Date(invitation.expires_at).getTime() <= Date.now()) return json(410, { error: "This invitation is no longer active." });
  const { data: organization, error: organizationError } = await admin.from("organizations").select("name").eq("id", organizationId).maybeSingle();
  if (organizationError || !organization) return json(404, { error: "Organization not found." });

  const inviteUrl = appUrl + "/#invite=" + encodeURIComponent(token);
  const safeOrg = escapeHtml(organization.name);
  const safeRole = escapeHtml(role.replaceAll("_", " "));
  const expiry = escapeHtml(new Date(invitation.expires_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
  const html = '<div style="font-family:Arial,sans-serif;max-width:560px;margin:32px auto;padding:28px;border:1px solid #e8e3d9;border-radius:14px;color:#28251f">' +
    '<p style="font-size:12px;letter-spacing:2px;color:#9a7c4d">MONK WORKSPACE INVITATION</p>' +
    '<h1 style="font-size:24px;font-weight:600">You have been invited</h1>' +
    '<p>You have been invited to join <strong>' + safeOrg + '</strong> as <strong>' + safeRole + '</strong>.</p>' +
    '<p>Use the secure, email-bound invitation link below. It expires on ' + expiry + '.</p>' +
    '<p style="margin:28px 0"><a href="' + inviteUrl + '" style="display:inline-block;padding:13px 20px;border-radius:8px;background:#5b4632;color:white;text-decoration:none">Accept invitation</a></p>' +
    '<p style="font-size:12px;color:#777">If you were not expecting this invitation, you can ignore this email.</p></div>';

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + resendKey, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromAddress, to: [email], subject: "Invitation to join " + organization.name + " on MONK", html }),
  });
  if (!response.ok) {
    const providerError = await response.text();
    return json(502, { error: "Invitation link was created, but the email provider rejected delivery.", providerStatus: response.status, detail: providerError.slice(0, 500) });
  }
  const delivery = await response.json();
  return json(200, { sent: true, email, role, providerId: delivery.id ?? null });
});
