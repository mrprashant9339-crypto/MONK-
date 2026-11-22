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

    const requiredPolicyKeys = await resolveRequiredPolicyKeys(serviceClient, organization);
    const now = new Date().toISOString();
    const { data: documents, error: documentsError } = await serviceClient
      .from("monk_policy_documents")
      .select("id,policy_key,version,title,jurisdiction,effective_at,content_markdown,content_sha256")
      .in("policy_key", requiredPolicyKeys.length ? requiredPolicyKeys : ["__none__"])
      .eq("publication_state", "published")
      .lte("effective_at", now)
      .order("effective_at", { ascending: false });

    if (documentsError) throw new Error("Unable to load published policy documents");

    const latestByKey = new Map<string, Record<string, unknown>>();
    for (const document of documents ?? []) {
      if (!latestByKey.has(document.policy_key)) latestByKey.set(document.policy_key, document);
    }
    const availablePolicies = [...latestByKey.values()];
    const availableKeys = new Set(availablePolicies.map((document) => document.policy_key));

    return json({
      organization: {
        id: organization.id,
        vertical: organization.vertical,
        entityType: organization.entity_type,
        institutionCategory: organization.institution_category,
        jurisdiction: organization.jurisdiction,
        stateCode: organization.state_code,
      },
      classificationRequired: !organization.entity_type,
      requiredPolicyKeys,
      availablePolicies,
      missingPolicyKeys: requiredPolicyKeys.filter((key) => !availableKeys.has(key)),
      resolvedAt: now,
      message: "Only published, effective policy versions are returned. Missing documents must be legally reviewed and published before onboarding can require acceptance.",
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Policy resolution failed" }, 500);
  }
});
