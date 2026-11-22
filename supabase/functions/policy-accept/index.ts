import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import { getOrganizationPolicyContext, resolveRequiredPolicyKeys } from "../_shared/policy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://monk.monster",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Authentication or server configuration missing" }, 401);
  }

  let body: {
    policyDocumentId?: string;
    acceptedSha256?: string;
    method?: string;
    locale?: string;
    consentEvidence?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON" }, 400);
  }

  if (!body.policyDocumentId || !/^[0-9a-f-]{36}$/i.test(body.policyDocumentId)) {
    return json({ error: "Invalid policyDocumentId" }, 400);
  }
  if (!body.acceptedSha256 || !/^[0-9a-f]{64}$/i.test(body.acceptedSha256)) {
    return json({ error: "Invalid policy content hash" }, 400);
  }
  if (body.method !== "explicit_checkbox") return json({ error: "An explicit policy checkbox acceptance is required" }, 400);
  const locale = body.locale ?? "en-IN";
  if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale)) return json({ error: "Invalid locale" }, 400);
  const evidence = body.consentEvidence ?? {};
  if (JSON.stringify(evidence).length > 4000) return json({ error: "Consent evidence is too large" }, 413);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userResult, error: userError } = await userClient.auth.getUser();
  if (userError || !userResult.user) return json({ error: "Invalid session" }, 401);

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const organization = await getOrganizationPolicyContext(userClient);
    if (!organization) return json({ error: "No active organization", code: "ORGANIZATION_REQUIRED" }, 409);

    const requiredKeys = await resolveRequiredPolicyKeys(serviceClient, organization);
    const { data: document, error: documentError } = await serviceClient
      .from("monk_policy_documents")
      .select("id,policy_key,version,content_sha256,publication_state,effective_at")
      .eq("id", body.policyDocumentId)
      .single();

    if (documentError || !document) return json({ error: "Policy version not found" }, 404);
    if (document.publication_state !== "published" || new Date(document.effective_at).getTime() > Date.now()) {
      return json({ error: "This policy version is not currently effective" }, 409);
    }
    if (!requiredKeys.includes(document.policy_key)) return json({ error: "This policy does not apply to the active organization" }, 403);
    if (document.content_sha256.toLowerCase() !== body.acceptedSha256.toLowerCase()) {
      return json({ error: "Policy content changed; reload the current version before accepting" }, 409);
    }

    const { data: acceptance, error: acceptanceError } = await serviceClient
      .from("monk_policy_acceptances")
      .upsert({
        user_id: userResult.user.id,
        organization_id: organization.id,
        policy_document_id: document.id,
        accepted_sha256: document.content_sha256,
        method: body.method,
        locale,
        consent_evidence: evidence,
      }, { onConflict: "user_id,organization_id,policy_document_id,accepted_sha256", ignoreDuplicates: true })
      .select("id,accepted_at")
      .maybeSingle();

    if (acceptanceError) throw new Error("Policy acceptance could not be saved");
    if (acceptance) return json({ accepted: true, acceptanceId: acceptance.id, acceptedAt: acceptance.accepted_at });

    const { data: existing, error: existingError } = await serviceClient
      .from("monk_policy_acceptances")
      .select("id,accepted_at")
      .eq("user_id", userResult.user.id)
      .eq("organization_id", organization.id)
      .eq("policy_document_id", document.id)
      .eq("accepted_sha256", document.content_sha256)
      .single();
    if (existingError || !existing) throw new Error("Policy acceptance could not be confirmed");

    return json({ accepted: true, acceptanceId: existing.id, acceptedAt: existing.accepted_at, alreadyAccepted: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Policy acceptance failed" }, 500);
  }
});
