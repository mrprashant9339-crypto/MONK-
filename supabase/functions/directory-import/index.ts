import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ALLOWED_ORIGINS = new Set([
  "https://monk.monster",
  "https://www.monk.monster",
  "https://monk-platform-git-feature-auth-registrat-3476eb-makto-community.vercel.app",
]);

function response(body: unknown, status: number, origin: string | null) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "vary": "Origin",
  });
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-headers", "authorization, content-type, apikey, x-client-info");
    headers.set("access-control-allow-methods", "POST, OPTIONS");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return response({ error: "Origin is not allowed." }, 403, null);
  if (req.method === "OPTIONS") return response({ ok: true }, 200, origin);
  if (req.method !== "POST") return response({ error: "Method not allowed." }, 405, origin);
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    console.error("Directory import function is missing required Supabase environment variables.");
    return response({ error: "Directory import is not configured." }, 503, origin);
  }

  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return response({ error: "Authentication required." }, 401, origin);

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: userData, error: authError } = await authClient.auth.getUser();
  const user = userData.user;
  if (authError || !user) return response({ error: "Your session is invalid or expired." }, 401, origin);

  const platformRole = user.app_metadata?.platform_role;
  if (platformRole !== "platform_admin" && platformRole !== "directory_admin") {
    return response({ error: "Directory administration permission is required." }, 403, origin);
  }

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > 1_100_000) {
      return response({ error: "Request is too large. Send batches of at most 250 compact records." }, 413, origin);
    }
    body = JSON.parse(raw);
  } catch {
    return response({ error: "A valid JSON request body is required." }, 400, origin);
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (body.action === "status") {
    const [total, published, verified, sources] = await Promise.all([
      adminClient.from("monk_directory_institutions").select("id", { count: "exact", head: true }),
      adminClient.from("monk_directory_institutions").select("id", { count: "exact", head: true }).eq("published", true),
      adminClient.from("monk_directory_institutions").select("id", { count: "exact", head: true }).eq("verification_state", "verified"),
      adminClient.from("monk_directory_sources").select("source_key,authority_name,terms_review_status,import_enabled,last_checked_at"),
    ]);
    const failure = total.error ?? published.error ?? verified.error ?? sources.error;
    if (failure) return response({ error: "Unable to read directory status." }, 500, origin);
    return response({
      totalInstitutions: total.count ?? 0,
      publishedInstitutions: published.count ?? 0,
      fullyVerifiedInstitutions: verified.count ?? 0,
      sources: sources.data ?? [],
    }, 200, origin);
  }

  if (body.action !== "import") return response({ error: "Unsupported action." }, 400, origin);
  const sourceKey = typeof body.sourceKey === "string" ? body.sourceKey.trim() : "";
  const records = body.records;
  if (!sourceKey || !Array.isArray(records) || records.length < 1 || records.length > 250) {
    return response({ error: "Provide an approved sourceKey and 1–250 records." }, 400, origin);
  }
  const { data, error } = await adminClient.rpc("ingest_monk_directory_batch", {
    p_source_key: sourceKey,
    p_records: records,
  });
  if (error) {
    console.error("Directory batch rejected:", error.message);
    return response({ error: "The directory batch failed validation or source authorization." }, 422, origin);
  }
  return response({ result: data }, 200, origin);
});
