import { createClient } from "npm:@supabase/supabase-js@2.57.0";

type IncomingProgramme = {
  sourceRecordId: string;
  programmeName: string;
  academicYear: string;
  programmeLevel?: string | null;
  discipline?: string | null;
  durationMonths?: number | null;
  studyMode?: string | null;
  eligibility?: string | null;
  awardingBody?: string | null;
  affiliationBody?: string | null;
  intake?: number | null;
};

type IncomingApproval = {
  sourceRecordId: string;
  programmeSourceRecordId?: string | null;
  approvalType: string;
  approvalStatus: "approved" | "conditional" | "withdrawn" | "not_approved" | "unknown";
  academicYear: string;
  approvedIntake?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  sourceUrl: string;
};

type IncomingInstitution = {
  sourceRecordId: string;
  canonicalName: string;
  institutionKind: "university" | "college" | "standalone_institute" | "academy" | "coaching_centre" | "vocational_centre" | "research_centre";
  categoryKey: string;
  ownershipKey: "central_government" | "state_government" | "local_body" | "government_aided" | "private" | "deemed" | "autonomous" | "trust_society" | "other";
  stateCode?: string | null;
  district?: string | null;
  city?: string | null;
  locality?: string | null;
  postalCode?: string | null;
  address?: string | null;
  websiteUrl?: string | null;
  aisheCode?: string | null;
  officialIdentifiers?: Record<string, string>;
  sourceUpdatedAt?: string | null;
  programmes?: IncomingProgramme[];
  approvals?: IncomingApproval[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://monk.monster",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-directory-import-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

function normalizeName(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return "{" + Object.keys(object).sort().map((key) => JSON.stringify(key) + ":" + stableJson(object[key])).join(",") + "}";
  }
  return JSON.stringify(value) ?? "null";
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validOptionalString(value: unknown, max = 300): value is string | null | undefined {
  return value === undefined || value === null || (typeof value === "string" && value.length <= max);
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "https:" || parsed.protocol === "http:")
      && Boolean(parsed.hostname)
      && !parsed.username
      && !parsed.password;
  } catch {
    return false;
  }
}

function validProgramme(programme: IncomingProgramme): boolean {
  return Boolean(
    programme && typeof programme.sourceRecordId === "string" &&
    programme.sourceRecordId.length > 0 && programme.sourceRecordId.length <= 200 &&
    typeof programme.programmeName === "string" && programme.programmeName.trim().length > 1 &&
    programme.programmeName.length <= 300 &&
    typeof programme.academicYear === "string" && /^\d{4}[-/–]\d{2,4}$/.test(programme.academicYear) &&
    validOptionalString(programme.programmeLevel, 100) &&
    validOptionalString(programme.discipline, 150) &&
    validOptionalString(programme.studyMode, 80) &&
    validOptionalString(programme.eligibility, 2000) &&
    validOptionalString(programme.awardingBody, 300) &&
    validOptionalString(programme.affiliationBody, 300) &&
    (programme.durationMonths == null || (Number.isInteger(programme.durationMonths) && programme.durationMonths > 0 && programme.durationMonths <= 1200)) &&
    (programme.intake == null || (Number.isInteger(programme.intake) && programme.intake >= 0))
  );
}

function validApproval(approval: IncomingApproval): boolean {
  const validDate = (value: string | null | undefined) =>
    value == null || (/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)));
  return Boolean(
    approval && typeof approval.sourceRecordId === "string" &&
    approval.sourceRecordId.length > 0 && approval.sourceRecordId.length <= 200 &&
    typeof approval.approvalType === "string" && approval.approvalType.trim().length > 0 &&
    approval.approvalType.length <= 120 &&
    ["approved", "conditional", "withdrawn", "not_approved", "unknown"].includes(approval.approvalStatus) &&
    typeof approval.academicYear === "string" && /^\d{4}[-/–]\d{2,4}$/.test(approval.academicYear) &&
    typeof approval.sourceUrl === "string" && approval.sourceUrl.length <= 1000 && isSafeHttpUrl(approval.sourceUrl) &&
    validOptionalString(approval.programmeSourceRecordId, 200) &&
    validDate(approval.validFrom) && validDate(approval.validUntil) &&
    (approval.approvedIntake == null || (Number.isInteger(approval.approvedIntake) && approval.approvedIntake >= 0))
  );
}

function validRecord(record: IncomingInstitution): boolean {
  return Boolean(
    record && typeof record.sourceRecordId === "string" && record.sourceRecordId.length > 0 && record.sourceRecordId.length <= 200 &&
    typeof record.canonicalName === "string" && record.canonicalName.trim().length > 1 && record.canonicalName.length <= 300 &&
    typeof record.institutionKind === "string" && typeof record.categoryKey === "string" && typeof record.ownershipKey === "string" &&
    validOptionalString(record.stateCode, 2) && validOptionalString(record.district) && validOptionalString(record.city) &&
    validOptionalString(record.locality) && validOptionalString(record.postalCode, 20) && validOptionalString(record.address, 1000) &&
    validOptionalString(record.websiteUrl, 500) &&
    (record.websiteUrl == null || isSafeHttpUrl(record.websiteUrl)) &&
    validOptionalString(record.aisheCode, 100) &&
    validOptionalString(record.sourceUpdatedAt, 50) &&
    (record.sourceUpdatedAt == null || Number.isFinite(Date.parse(record.sourceUpdatedAt))) &&
    (record.officialIdentifiers === undefined || (
      record.officialIdentifiers !== null &&
      typeof record.officialIdentifiers === "object" &&
      Object.keys(record.officialIdentifiers).length <= 20 &&
      Object.entries(record.officialIdentifiers).every(([key, value]) =>
        key.length <= 80 && typeof value === "string" && value.length <= 200
      )
    )) &&
    (record.programmes === undefined || (Array.isArray(record.programmes) && record.programmes.length <= 200 && record.programmes.every(validProgramme))) &&
    (record.approvals === undefined || (Array.isArray(record.approvals) && record.approvals.length <= 300 && record.approvals.every(validApproval)))
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expectedToken = Deno.env.get("DIRECTORY_IMPORT_TOKEN");
  const suppliedToken = request.headers.get("x-directory-import-token") ?? "";
  if (!expectedToken || !constantTimeEqual(suppliedToken, expectedToken)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server configuration incomplete" }, 503);

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 2_000_000) return json({ error: "Payload too large; maximum is 2 MB" }, 413);

  let body: { sourceKey?: string; records?: IncomingInstitution[] };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON" }, 400);
  }

  if (!body.sourceKey || !/^[a-z0-9_]{2,50}$/.test(body.sourceKey)) return json({ error: "Invalid sourceKey" }, 400);
  if (!Array.isArray(body.records) || body.records.length < 1 || body.records.length > 200) {
    return json({ error: "records must contain between 1 and 200 items" }, 400);
  }
  if (!body.records.every(validRecord)) return json({ error: "One or more records have invalid fields" }, 400);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: source, error: sourceError } = await supabase
    .from("monk_directory_sources")
    .select("id, source_key, authority_name, terms_review_status, import_enabled")
    .eq("source_key", body.sourceKey)
    .maybeSingle();

  if (sourceError) return json({ error: "Could not validate source registry entry" }, 500);
  if (!source) return json({ error: "Unknown source key" }, 404);
  if (source.terms_review_status !== "approved" || source.import_enabled !== true) {
    return json({ error: "Source import is disabled until its terms and ingestion permissions are reviewed" }, 403);
  }

  const counts = { snapshots: 0, newInstitutions: 0, mappedRecords: 0, programmes: 0, approvals: 0, rejected: 0 };
  const errors: Array<{ sourceRecordId: string; error: string }> = [];

  for (const record of body.records) {
    try {
      const normalized = normalizeName(record.canonicalName);
      if (!normalized) throw new Error("Institution name normalizes to an empty value");

      const snapshotHash = await sha256(stableJson(record));
      const { data: snapshot, error: snapshotError } = await supabase
        .from("monk_directory_source_snapshots")
        .upsert({
          source_id: source.id,
          source_record_id: record.sourceRecordId,
          snapshot_hash: snapshotHash,
          source_published_at: record.sourceUpdatedAt ?? null,
          payload: record,
          import_status: "received",
        }, { onConflict: "source_id,source_record_id,snapshot_hash", ignoreDuplicates: true })
        .select("id")
        .maybeSingle();

      if (snapshotError) throw new Error("Snapshot write failed: " + snapshotError.message);
      let snapshotId = snapshot?.id as string | undefined;
      if (!snapshotId) {
        const { data: existingSnapshot, error: existingSnapshotError } = await supabase
          .from("monk_directory_source_snapshots")
          .select("id")
          .eq("source_id", source.id)
          .eq("source_record_id", record.sourceRecordId)
          .eq("snapshot_hash", snapshotHash)
          .single();
        if (existingSnapshotError) throw new Error("Snapshot confirmation failed: " + existingSnapshotError.message);
        snapshotId = existingSnapshot.id;
      }
      counts.snapshots++;

      const { data: mapping, error: mappingError } = await supabase
        .from("monk_directory_source_records")
        .select("id, institution_id")
        .eq("source_id", source.id)
        .eq("source_record_id", record.sourceRecordId)
        .maybeSingle();
      if (mappingError) throw new Error("Source identity lookup failed: " + mappingError.message);

      let institutionId = mapping?.institution_id as string | undefined;

      if (!institutionId) {
        const { data: existingBySource, error: sourceIdentityError } = await supabase
          .from("monk_directory_institutions")
          .select("id")
          .eq("primary_source_id", source.id)
          .eq("primary_source_record_id", record.sourceRecordId)
          .maybeSingle();
        if (sourceIdentityError) throw new Error("Primary source identity lookup failed: " + sourceIdentityError.message);
        institutionId = existingBySource?.id;
      }

      if (!institutionId && record.aisheCode) {
        const { data: existingByAishe, error: aisheError } = await supabase
          .from("monk_directory_institutions")
          .select("id")
          .eq("aishe_code", record.aisheCode)
          .maybeSingle();
        if (aisheError) throw new Error("AISHE identity lookup failed: " + aisheError.message);
        institutionId = existingByAishe?.id;
      }

      if (!institutionId) {
        const { data: created, error: createError } = await supabase
          .from("monk_directory_institutions")
          .insert({
            canonical_name: record.canonicalName.trim(),
            normalized_name: normalized,
            institution_kind: record.institutionKind,
            category_key: record.categoryKey,
            ownership_key: record.ownershipKey,
            state_code: record.stateCode ?? null,
            district: record.district ?? null,
            city: record.city ?? null,
            locality: record.locality ?? null,
            postal_code: record.postalCode ?? null,
            address: record.address ?? null,
            website_url: record.websiteUrl ?? null,
            aishe_code: record.aisheCode ?? null,
            primary_source_id: source.id,
            primary_source_record_id: record.sourceRecordId,
            official_identifiers: record.officialIdentifiers ?? {},
            source_updated_at: record.sourceUpdatedAt ?? null,
            verification_state: "unverified",
            verified_fields: [],
            published: false,
          })
          .select("id")
          .single();
        if (createError || !created) throw new Error("Institution insert failed: " + (createError?.message ?? "No ID returned"));
        institutionId = created.id;
        counts.newInstitutions++;
      }

      if (mapping?.institution_id === undefined && institutionId) {
        const { error: provenanceError } = await supabase
          .from("monk_directory_institutions")
          .update({ primary_source_id: source.id, primary_source_record_id: record.sourceRecordId })
          .eq("id", institutionId)
          .is("primary_source_id", null);
        if (provenanceError) throw new Error("Primary source provenance could not be attached: " + provenanceError.message);
      }

      const { error: mapUpsertError } = await supabase
        .from("monk_directory_source_records")
        .upsert({
          source_id: source.id,
          source_record_id: record.sourceRecordId,
          institution_id: institutionId,
          last_seen_snapshot_id: snapshotId,
          last_seen_at: new Date().toISOString(),
        }, { onConflict: "source_id,source_record_id" });
      if (mapUpsertError) throw new Error("Source identity mapping failed: " + mapUpsertError.message);

      for (const programme of record.programmes ?? []) {
        const { error: programmeError } = await supabase
          .from("monk_directory_programmes")
          .upsert({
            institution_id: institutionId,
            programme_name: programme.programmeName.trim(),
            programme_level: programme.programmeLevel ?? null,
            discipline: programme.discipline ?? null,
            duration_months: programme.durationMonths ?? null,
            study_mode: programme.studyMode ?? null,
            eligibility: programme.eligibility ?? null,
            awarding_body: programme.awardingBody ?? null,
            affiliation_body: programme.affiliationBody ?? null,
            academic_year: programme.academicYear,
            intake: programme.intake ?? null,
            source_id: source.id,
            source_record_id: programme.sourceRecordId,
            verification_state: "unverified",
            last_verified_at: null,
          }, {
            onConflict: "institution_id,programme_name,academic_year,source_id,source_record_id",
            ignoreDuplicates: true,
          });
        if (programmeError) throw new Error("Programme import failed: " + programmeError.message);
        counts.programmes++;
      }

      for (const approval of record.approvals ?? []) {
        let programmeId: string | null = null;
        if (approval.programmeSourceRecordId) {
          const { data: linkedProgramme, error: programmeLookupError } = await supabase
            .from("monk_directory_programmes")
            .select("id")
            .eq("institution_id", institutionId)
            .eq("source_id", source.id)
            .eq("source_record_id", approval.programmeSourceRecordId)
            .maybeSingle();
          if (programmeLookupError) throw new Error("Approval programme link lookup failed: " + programmeLookupError.message);
          programmeId = linkedProgramme?.id ?? null;
        }

        const { error: approvalError } = await supabase
          .from("monk_directory_approvals")
          .upsert({
            institution_id: institutionId,
            programme_id: programmeId,
            regulator_source_id: source.id,
            approval_type: approval.approvalType.trim(),
            approval_status: approval.approvalStatus,
            academic_year: approval.academicYear,
            approved_intake: approval.approvedIntake ?? null,
            valid_from: approval.validFrom ?? null,
            valid_until: approval.validUntil ?? null,
            source_url: approval.sourceUrl,
            source_record_id: approval.sourceRecordId,
            verified_at: null,
          }, {
            onConflict: "institution_id,regulator_source_id,approval_type,academic_year,source_record_id",
            ignoreDuplicates: true,
          });
        if (approvalError) throw new Error("Approval import failed: " + approvalError.message);
        if (programmeId) {
          const { error: approvalLinkError } = await supabase
            .from("monk_directory_approvals")
            .update({ programme_id: programmeId })
            .eq("institution_id", institutionId)
            .eq("regulator_source_id", source.id)
            .eq("approval_type", approval.approvalType.trim())
            .eq("academic_year", approval.academicYear)
            .eq("source_record_id", approval.sourceRecordId)
            .is("programme_id", null);
          if (approvalLinkError) throw new Error("Approval programme link update failed: " + approvalLinkError.message);
        }
        counts.approvals++;
      }

      if (snapshotId) {
        const { error: reviewStatusError } = await supabase.from("monk_directory_source_snapshots")
          .update({ import_status: "needs_review" })
          .eq("id", snapshotId)
          .eq("import_status", "received");
        if (reviewStatusError) throw new Error("Snapshot status update failed: " + reviewStatusError.message);
      }
      counts.mappedRecords++;
    } catch (error) {
      counts.rejected++;
      errors.push({
        sourceRecordId: record.sourceRecordId,
        error: error instanceof Error ? error.message : "Unknown import error",
      });
    }
  }

  const { error: sourceCheckError } = await supabase
    .from("monk_directory_sources")
    .update({ last_checked_at: new Date().toISOString() })
    .eq("id", source.id);
  if (sourceCheckError) {
    console.error("Source check timestamp update failed:", sourceCheckError.message);
  }

  return json({
    source: { key: source.source_key, authority: source.authority_name },
    counts,
    errors,
    note: "Imported records remain unpublished and unverified until field-level review. This endpoint does not grant regulator approval.",
  }, counts.rejected ? 207 : 200);
});
