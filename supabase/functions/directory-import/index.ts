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


const STATE_CODES: Record<string, string> = {
  "andaman and nicobar islands":"AN","andhra pradesh":"AP","arunachal pradesh":"AR","assam":"AS","bihar":"BR",
  "chandigarh":"CH","chhattisgarh":"CT","dadra and nagar haveli":"DN","daman and diu":"DD","delhi":"DL","goa":"GA",
  "gujarat":"GJ","haryana":"HR","himachal pradesh":"HP","jammu and kashmir":"JK","jharkhand":"JH","karnataka":"KA",
  "kerala":"KL","ladakh":"LA","lakshadweep":"LD","madhya pradesh":"MP","maharashtra":"MH","manipur":"MN",
  "meghalaya":"ML","mizoram":"MZ","nagaland":"NL","odisha":"OD","orissa":"OD","puducherry":"PY","pondicherry":"PY",
  "punjab":"PB","rajasthan":"RJ","sikkim":"SK","tamil nadu":"TN","telangana":"TS","tripura":"TR",
  "uttar pradesh":"UP","uttarakhand":"UK","uttaranchal":"UK","west bengal":"WB"
};
const AICTE_ENDPOINT = "https://facilities.aicte-india.org/dashboard/pages/php/approvedinstituteserver.php";

function normalizeAicteRows(payload: unknown): Record<string, unknown>[] {
  const root = payload && typeof payload === "object" && !Array.isArray(payload)
    ? ((payload as Record<string, unknown>).data ?? (payload as Record<string, unknown>).combined ?? payload)
    : payload;
  if (!Array.isArray(root)) return [];
  const keys = ["aicte_id","institute_name","address","district","institution_type","women","minority","other_id"];
  return root.map((item) => {
    if (Array.isArray(item)) return Object.fromEntries(item.map((value, index) => [keys[index] ?? "extra_"+index, value]));
    return item && typeof item === "object" ? item as Record<string, unknown> : {};
  });
}
function aicteOwnership(value: unknown): string {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("central")) return "central_government";
  if (text.includes("state government") || text === "government" || text.includes("govt")) return "state_government";
  if (text.includes("aided")) return "government_aided";
  if (text.includes("private") || text.includes("self financing")) return "private";
  if (text.includes("trust") || text.includes("society")) return "trust_society";
  return "other";
}

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

  if (body.action === "sync_aicte") {
    const { data: aicteSource, error: sourceError } = await adminClient
      .from("monk_directory_sources")
      .select("terms_review_status,import_enabled")
      .eq("source_key", "aicte_live_approved_institutes")
      .maybeSingle();
    if (sourceError || !aicteSource || !aicteSource.import_enabled || aicteSource.terms_review_status !== "approved") {
      return response({ error: "AICTE bulk import is disabled until its data-reuse terms are approved. No upstream request was made." }, 409, origin);
    }
    const stateName = typeof body.state === "string" ? body.state.trim() : "";
    const stateCode = STATE_CODES[stateName.toLowerCase()];
    const academicYear = typeof body.academicYear === "string" ? body.academicYear : "2025-2026";
    if (!stateCode) return response({ error: "Provide a supported Indian state or union territory name." }, 400, origin);
    if (!["2025-2026", "2026-2027"].includes(academicYear)) {
      return response({ error: "Only explicitly supported AICTE academic years can be synchronized." }, 400, origin);
    }
    const params = new URLSearchParams({
      method: "fetchdata", year: academicYear, program: "1", level: "1",
      institutiontype: "1", Women: "1", Minority: "1", state: stateName, course: "1"
    });
    const upstreamUrl = AICTE_ENDPOINT + "?" + params.toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    let upstream: Response;
    try {
      upstream = await fetch(upstreamUrl, {
        headers: {
          accept: "application/json, text/javascript, */*; q=0.01",
          "x-requested-with": "XMLHttpRequest"
        },
        signal: controller.signal
      });
    } catch (error) {
      clearTimeout(timeout);
      console.error("AICTE upstream fetch failed:", String(error));
      return response({ error: "AICTE source could not be reached. No records were changed." }, 502, origin);
    }
    clearTimeout(timeout);
    if (!upstream.ok) return response({ error: "AICTE source returned HTTP " + upstream.status + ". No records were changed." }, 502, origin);
    let payload: unknown;
    try { payload = await upstream.json(); }
    catch { return response({ error: "AICTE source did not return JSON. No records were changed." }, 502, origin); }
    const sourceRows = normalizeAicteRows(payload);
    if (!sourceRows.length) return response({ state: stateName, academicYear, fetched: 0, imported: 0, message: "AICTE returned no rows for this filter." }, 200, origin);
    if (sourceRows.length > 5000) return response({ error: "AICTE returned an unexpectedly large state response. Split or review the source query before importing." }, 413, origin);

    const records = sourceRows.flatMap((row) => {
      const id = String(row.aicte_id ?? row.AICTE_ID ?? row.id ?? "").trim();
      const name = String(row.institute_name ?? row.instituteName ?? row.name ?? "").trim();
      if (!id || !name) return [];
      return [{
        source_record_id: id,
        aicte_id: id,
        canonical_name: name,
        state_code: stateCode,
        district: String(row.district ?? "").trim() || null,
        address: String(row.address ?? "").trim() || null,
        category_key: "other",
        institution_kind: "college",
        ownership_key: aicteOwnership(row.institution_type ?? row.institutionType),
        academic_year: academicYear
      }];
    });
    if (!records.length) return response({ error: "AICTE response contained no usable institution IDs and names." }, 422, origin);

    let totals = { inserted: 0, updated: 0, rejected: 0, published_from_official_sources: 0 };
    for (let offset = 0; offset < records.length; offset += 200) {
      const { data, error } = await adminClient.rpc("ingest_monk_directory_batch", {
        p_source_key: "aicte_live_approved_institutes",
        p_records: records.slice(offset, offset + 200)
      });
      if (error) {
        console.error("AICTE directory batch rejected:", error.message);
        return response({ error: "An AICTE batch failed validation. Earlier batches remain imported; rerun this state to safely resume.", partial: totals }, 422, origin);
      }
      for (const key of Object.keys(totals) as Array<keyof typeof totals>) totals[key] += Number(data?.[key] ?? 0);
    }
    return response({
      source: "AICTE official approved-institutes endpoint",
      state: stateName,
      stateCode,
      academicYear,
      fetched: sourceRows.length,
      normalized: records.length,
      ...totals
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
