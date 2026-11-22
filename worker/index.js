const ALLOWED_ORIGINS = new Set([
  "https://monk.monster",
  "https://www.monk.monster",
  "http://localhost:5173",
]);

const PLACE_TYPES = new Set([
  "accounting", "atm", "bank", "bar", "beauty_salon", "bicycle_store",
  "book_store", "cafe", "car_dealer", "car_repair", "clothing_store",
  "dentist", "doctor", "electronics_store", "florist",
  "gas_station", "grocery_store", "gym", "hardware_store",
  "hospital", "jewelry_store", "lawyer", "library", "lodging",
  "meal_takeaway", "movie_theater", "pharmacy", "physiotherapist",
  "restaurant", "school", "shoe_store", "shopping_mall", "spa",
  "store", "supermarket", "tourist_attraction", "university", "veterinary_care",
]);

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.businessStatus",
].join(",");

function responseJson(data, status, origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "content-type";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function validCoordinate(value, min, max) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function distanceMeters(a, b) {
  const toRad = (value) => value * Math.PI / 180;
  const earthRadius = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * earthRadius * Math.asin(Math.sqrt(h)));
}

function mapPlace(place, origin) {
  const location = place.location;
  const hasLocation = location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude);
  return {
    provider: "google_places",
    providerPlaceId: place.id,
    name: place.displayName?.text ?? "Unnamed place",
    address: place.formattedAddress ?? null,
    category: place.primaryType ?? null,
    businessStatus: place.businessStatus ?? null,
    latitude: hasLocation ? location.latitude : null,
    longitude: hasLocation ? location.longitude : null,
    distanceMeters: hasLocation && origin ? distanceMeters(origin, location) : null,
    mapsUrl: place.id ? `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(place.id)}` : null,
  };
}

async function handlePlaces(request, env, origin, url) {
  if (request.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Max-Age": "600",
        "Vary": "Origin",
      },
    });
  }
  if (request.method !== "POST") return responseJson({ error: "Method not allowed" }, 405, origin);
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return responseJson({ error: "Origin not allowed" }, 403, origin);

  const clientIp = request.headers.get("CF-Connecting-IP");
  if (!clientIp) return responseJson({ error: "Unable to identify request source" }, 400, origin);
  const rate = await env.NEARBY_SEARCH_RATE_LIMIT.limit({ key: clientIp });
  if (!rate.success) return responseJson({ error: "Search limit reached. Try again shortly." }, 429, origin);

  if (!env.GOOGLE_MAPS_API_KEY) {
    return responseJson({ error: "Nearby discovery is not configured yet." }, 503, origin);
  }

  const contentLength = Number(request.headers.get("Content-Length") ?? "0");
  if (contentLength > 8000) return responseJson({ error: "Request is too large" }, 413, origin);

  let body;
  try {
    body = await request.json();
  } catch {
    return responseJson({ error: "Request body must be valid JSON" }, 400, origin);
  }

  const isNearby = url.pathname === "/api/businesses/nearby";
  const isTextSearch = url.pathname === "/api/businesses/search";
  if (!isNearby && !isTextSearch) return responseJson({ error: "Not found" }, 404, origin);

  const requestBody = { maxResultCount: 20 };
  let searchOrigin = null;

  if (isNearby) {
    const latitude = body.latitude;
    const longitude = body.longitude;
    const radiusMeters = body.radiusMeters ?? 5000;
    const placeType = body.placeType ?? "store";
    if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) {
      return responseJson({ error: "A valid location is required" }, 400, origin);
    }
    if (!Number.isInteger(radiusMeters) || radiusMeters < 500 || radiusMeters > 25000) {
      return responseJson({ error: "Radius must be between 500 and 25000 metres" }, 400, origin);
    }
    if (typeof placeType !== "string" || (placeType !== "all" && !PLACE_TYPES.has(placeType))) {
      return responseJson({ error: "Unsupported business category" }, 400, origin);
    }
    searchOrigin = { latitude, longitude };
    if (placeType !== "all") requestBody.includedTypes = [placeType];
    requestBody.locationRestriction = {
      circle: {
        center: { latitude, longitude },
        radius: radiusMeters,
      },
    };
    requestBody.rankPreference = "DISTANCE";
  } else {
    const textQuery = typeof body.query === "string" ? body.query.trim() : "";
    if (textQuery.length < 2 || textQuery.length > 160) {
      return responseJson({ error: "Search text must contain 2–160 characters" }, 400, origin);
    }
    requestBody.textQuery = textQuery;
    const textPlaceType = body.placeType ?? "all";
    if (typeof textPlaceType !== "string" || (textPlaceType !== "all" && !PLACE_TYPES.has(textPlaceType))) {
      return responseJson({ error: "Unsupported business category" }, 400, origin);
    }
    if (textPlaceType !== "all") {
      requestBody.includedType = textPlaceType;
      requestBody.strictTypeFiltering = true;
    }
    if (body.latitude !== undefined || body.longitude !== undefined) {
      if (!validCoordinate(body.latitude, -90, 90) || !validCoordinate(body.longitude, -180, 180)) {
        return responseJson({ error: "Both location coordinates must be valid" }, 400, origin);
      }
      searchOrigin = { latitude: body.latitude, longitude: body.longitude };
      requestBody.locationBias = {
        circle: {
          center: searchOrigin,
          radius: Math.min(Math.max(Number(body.radiusMeters) || 5000, 500), 25000),
        },
      };
    }
  }

  try {
    const upstream = await fetch(
      isNearby
        ? "https://places.googleapis.com/v1/places:searchNearby"
        : "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(12000),
      },
    );

    if (!upstream.ok) {
      console.error(JSON.stringify({
        event: "places_provider_error",
        status: upstream.status,
        route: url.pathname,
      }));
      return responseJson({
        error: upstream.status === 429
          ? "Nearby search is temporarily busy. Try again shortly."
          : "The places provider could not complete this search.",
      }, upstream.status === 429 ? 429 : 502, origin);
    }

    const payload = await upstream.json();
    const places = Array.isArray(payload.places) ? payload.places : [];
    const results = places.map((place) => mapPlace(place, searchOrigin));
    if (searchOrigin) results.sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));

    console.log(JSON.stringify({
      event: "places_search_completed",
      route: url.pathname,
      resultCount: results.length,
    }));

    return responseJson({
      results,
      count: results.length,
      attribution: {
        label: "Google Maps",
        url: "https://maps.google.com/",
      },
      searchedAt: new Date().toISOString(),
    }, 200, origin);
  } catch (error) {
    console.error(JSON.stringify({
      event: "places_search_failed",
      route: url.pathname,
      message: error instanceof Error ? error.message : "unknown",
    }));
    return responseJson({ error: "Nearby search is temporarily unavailable." }, 502, origin);
  }
}

async function handlePublicPolicies(request, env, origin, url) {
  if (request.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Max-Age": "600",
        "Vary": "Origin",
      },
    });
  }
  if (request.method !== "GET") return responseJson({ error: "Method not allowed" }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return responseJson({ error: "Origin not allowed" }, 403, origin);

  const clientIp = request.headers.get("CF-Connecting-IP");
  if (!clientIp) return responseJson({ error: "Unable to identify request source" }, 400, origin);
  const rate = await env.NEARBY_SEARCH_RATE_LIMIT.limit({ key: `public-policy:${clientIp}` });
  if (!rate.success) return responseJson({ error: "Policy document limit reached. Try again shortly." }, 429, origin);

  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    return responseJson({ error: "Policy documents are temporarily unavailable." }, 503, origin);
  }

  const policyKey = url.searchParams.get("key") ?? "platform";
  if (!["platform", "privacy"].includes(policyKey)) {
    return responseJson({ error: "Unsupported public policy key" }, 400, origin);
  }

  try {
    const endpoint = new URL("/rest/v1/monk_policy_documents", env.SUPABASE_URL);
    endpoint.searchParams.set("select", "id,policy_key,version,title,jurisdiction,effective_at,content_markdown,content_sha256");
    endpoint.searchParams.set("policy_key", `eq.${policyKey}`);
    endpoint.searchParams.set("publication_state", "eq.published");
    endpoint.searchParams.set("effective_at", `lte.${new Date().toISOString()}`);
    endpoint.searchParams.set("order", "effective_at.desc");
    endpoint.searchParams.set("limit", "20");

    const upstream = await fetch(endpoint, {
      headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, "Cache-Control": "no-store" },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) return responseJson({ error: "Policy documents are temporarily unavailable." }, 502, origin);
    const documents = await upstream.json();
    const latest = [];
    const seen = new Set();
    for (const document of documents) {
      if (!seen.has(document.policy_key)) {
        seen.add(document.policy_key);
        latest.push(document);
      }
    }
    return responseJson({ documents: latest, published: latest.length > 0 }, 200, origin);
  } catch (error) {
    console.error(JSON.stringify({
      event: "public_policy_fetch_failed",
      message: error instanceof Error ? error.message : "unknown",
    }));
    return responseJson({ error: "Policy documents are temporarily unavailable." }, 502, origin);
  }
}

async function handleDirectoryInstitution(request, env, origin, url) {
  if (request.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Max-Age": "600",
        "Vary": "Origin",
      },
    });
  }
  if (request.method !== "GET") return responseJson({ error: "Method not allowed" }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return responseJson({ error: "Origin not allowed" }, 403, origin);

  const clientIp = request.headers.get("CF-Connecting-IP");
  if (!clientIp) return responseJson({ error: "Unable to identify request source" }, 400, origin);
  const rate = await env.NEARBY_SEARCH_RATE_LIMIT.limit({ key: `directory-detail:${clientIp}` });
  if (!rate.success) return responseJson({ error: "Directory detail limit reached. Try again shortly." }, 429, origin);

  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    return responseJson({ error: "National directory service is not configured yet." }, 503, origin);
  }

  const institutionId = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(institutionId)) {
    return responseJson({ error: "Invalid institution identifier" }, 400, origin);
  }

  try {
    const institutionUrl = new URL("/rest/v1/monk_directory_institutions", env.SUPABASE_URL);
    institutionUrl.searchParams.set("select", "id,canonical_name,institution_kind,category_key,ownership_key,state_code,district,city,locality,postal_code,address,website_url,phone_public,email_public,aishe_code,official_identifiers,verification_state,verified_fields,last_verified_at,source_updated_at,next_review_at,primary_source_id,primary_source_record_id");
    institutionUrl.searchParams.set("id", `eq.${institutionId}`);
    institutionUrl.searchParams.set("published", "eq.true");
    institutionUrl.searchParams.set("limit", "1");

    const institutionResponse = await fetch(institutionUrl, {
      headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, "Cache-Control": "no-store" },
      signal: AbortSignal.timeout(8000),
    });
    if (!institutionResponse.ok) {
      console.error(JSON.stringify({ event: "directory_detail_institution_failed", status: institutionResponse.status }));
      return responseJson({ error: "Institution details are temporarily unavailable." }, 502, origin);
    }
    const institutions = await institutionResponse.json();
    const institution = institutions[0];
    if (!institution) return responseJson({ error: "Published institution not found" }, 404, origin);

    const programmesUrl = new URL("/rest/v1/monk_directory_programmes", env.SUPABASE_URL);
    programmesUrl.searchParams.set("select", "id,programme_name,programme_level,discipline,duration_months,study_mode,eligibility,awarding_body,affiliation_body,academic_year,intake,verification_state,last_verified_at,source_id,source_record_id");
    programmesUrl.searchParams.set("institution_id", `eq.${institutionId}`);
    programmesUrl.searchParams.set("order", "programme_name.asc");
    programmesUrl.searchParams.set("limit", "200");

    const approvalsUrl = new URL("/rest/v1/monk_directory_approvals", env.SUPABASE_URL);
    approvalsUrl.searchParams.set("select", "id,programme_id,regulator_source_id,approval_type,approval_status,academic_year,approved_intake,valid_from,valid_until,source_url,source_record_id,verified_at");
    approvalsUrl.searchParams.set("institution_id", `eq.${institutionId}`);
    approvalsUrl.searchParams.set("order", "academic_year.desc");
    approvalsUrl.searchParams.set("limit", "300");

    const [programmesResponse, approvalsResponse] = await Promise.all([
      fetch(programmesUrl, {
        headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, "Cache-Control": "no-store" },
        signal: AbortSignal.timeout(8000),
      }),
      fetch(approvalsUrl, {
        headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, "Cache-Control": "no-store" },
        signal: AbortSignal.timeout(8000),
      }),
    ]);
    if (!programmesResponse.ok || !approvalsResponse.ok) {
      return responseJson({ error: "Programme and approval details are temporarily unavailable." }, 502, origin);
    }
    const [programmes, approvals] = await Promise.all([programmesResponse.json(), approvalsResponse.json()]);
    const sourceIds = [...new Set([
      institution.primary_source_id,
      ...programmes.map((programme) => programme.source_id),
      ...approvals.map((approval) => approval.regulator_source_id),
    ].filter(Boolean))];

    let sourcesById = new Map();
    if (sourceIds.length) {
      const sourceUrl = new URL("/rest/v1/monk_directory_sources", env.SUPABASE_URL);
      sourceUrl.searchParams.set("select", "id,authority_name,source_url,last_checked_at");
      sourceUrl.searchParams.set("id", `in.(${sourceIds.join(",")})`);
      const sourceResponse = await fetch(sourceUrl, {
        headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, "Cache-Control": "no-store" },
        signal: AbortSignal.timeout(8000),
      });
      if (sourceResponse.ok) {
        const sourceRows = await sourceResponse.json();
        sourcesById = new Map(sourceRows.map((source) => [source.id, source]));
      }
    }

    return responseJson({
      institution: {
        ...institution,
        source: institution.primary_source_id ? sourcesById.get(institution.primary_source_id) ?? null : null,
      },
      programmes: programmes.map((programme) => ({
        ...programme,
        source: programme.source_id ? sourcesById.get(programme.source_id) ?? null : null,
      })),
      approvals: approvals.map((approval) => ({
        ...approval,
        regulator: sourcesById.get(approval.regulator_source_id) ?? null,
      })),
      retrievedAt: new Date().toISOString(),
    }, 200, origin);
  } catch (error) {
    console.error(JSON.stringify({
      event: "directory_detail_failed",
      message: error instanceof Error ? error.message : "unknown",
    }));
    return responseJson({ error: "Institution details are temporarily unavailable." }, 502, origin);
  }
}

async function handleDirectorySearch(request, env, origin, url) {
  if (request.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Max-Age": "600",
        "Vary": "Origin",
      },
    });
  }
  if (request.method !== "GET") return responseJson({ error: "Method not allowed" }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return responseJson({ error: "Origin not allowed" }, 403, origin);

  const clientIp = request.headers.get("CF-Connecting-IP");
  if (!clientIp) return responseJson({ error: "Unable to identify request source" }, 400, origin);
  const rate = await env.NEARBY_SEARCH_RATE_LIMIT.limit({ key: `directory:${clientIp}` });
  if (!rate.success) return responseJson({ error: "Directory search limit reached. Try again shortly." }, 429, origin);

  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    return responseJson({ error: "National directory service is not configured yet." }, 503, origin);
  }

  const query = (url.searchParams.get("query") ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  const stateCode = url.searchParams.get("state") ?? "";
  const categoryKey = url.searchParams.get("category") ?? "";
  const ownershipKey = url.searchParams.get("ownership") ?? "";
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  if (!Number.isInteger(page) || page < 1 || page > 10000) {
    return responseJson({ error: "Invalid page number" }, 400, origin);
  }
  if (stateCode && !/^[A-Z]{2}$/.test(stateCode)) return responseJson({ error: "Invalid state filter" }, 400, origin);
  if (categoryKey && !/^[a-z_]{2,40}$/.test(categoryKey)) return responseJson({ error: "Invalid category filter" }, 400, origin);
  if (ownershipKey && !/^[a-z_]{2,40}$/.test(ownershipKey)) return responseJson({ error: "Invalid ownership filter" }, 400, origin);

  const pageSize = 24;
  const offset = (page - 1) * pageSize;
  const endpoint = new URL("/rest/v1/monk_directory_institutions", env.SUPABASE_URL);
  endpoint.searchParams.set("select", "id,canonical_name,institution_kind,category_key,ownership_key,state_code,district,city,locality,address,website_url,aishe_code,verification_state,verified_fields,last_verified_at,primary_source_id,primary_source_record_id");
  endpoint.searchParams.set("published", "eq.true");
  endpoint.searchParams.set("order", "canonical_name.asc");
  endpoint.searchParams.set("limit", String(pageSize));
  endpoint.searchParams.set("offset", String(offset));
  if (stateCode) endpoint.searchParams.set("state_code", `eq.${stateCode}`);
  if (categoryKey) endpoint.searchParams.set("category_key", `eq.${categoryKey}`);
  if (ownershipKey) endpoint.searchParams.set("ownership_key", `eq.${ownershipKey}`);
  if (query) {
    const pattern = `*${query}*`;
    endpoint.searchParams.set("or", `(canonical_name.ilike.${pattern},city.ilike.${pattern},district.ilike.${pattern},locality.ilike.${pattern},postal_code.ilike.${pattern},address.ilike.${pattern},aishe_code.ilike.${pattern})`);
  }

  try {
    const upstream = await fetch(endpoint, {
      headers: {
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        Prefer: "count=exact",
        "Cache-Control": "no-store",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) {
      console.error(JSON.stringify({ event: "directory_query_failed", status: upstream.status }));
      return responseJson({ error: "National directory search is temporarily unavailable." }, 502, origin);
    }

    const records = await upstream.json();
    const sourceIds = [...new Set(records.map((record) => record.primary_source_id).filter(Boolean))];
    let sourcesById = new Map();
    if (sourceIds.length) {
      const sourceEndpoint = new URL("/rest/v1/monk_directory_sources", env.SUPABASE_URL);
      sourceEndpoint.searchParams.set("select", "id,authority_name,source_url,last_checked_at");
      sourceEndpoint.searchParams.set("id", `in.(${sourceIds.join(",")})`);
      const sourceResponse = await fetch(sourceEndpoint, {
        headers: {
          apikey: env.SUPABASE_PUBLISHABLE_KEY,
          "Cache-Control": "no-store",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (sourceResponse.ok) {
        const sourceRows = await sourceResponse.json();
        sourcesById = new Map(sourceRows.map((source) => [source.id, source]));
      }
    }

    const contentRange = upstream.headers.get("Content-Range") ?? "";
    const totalMatch = contentRange.match(/\/(\d+|\*)$/);
    const total = totalMatch && totalMatch[1] !== "*" ? Number(totalMatch[1]) : null;
    const results = records.map((record) => ({
      ...record,
      source: record.primary_source_id ? sourcesById.get(record.primary_source_id) ?? null : null,
    }));

    return responseJson({
      results,
      page,
      pageSize,
      total,
      totalPages: total === null ? null : Math.ceil(total / pageSize),
    }, 200, origin);
  } catch (error) {
    console.error(JSON.stringify({
      event: "directory_search_failed",
      message: error instanceof Error ? error.message : "unknown",
    }));
    return responseJson({ error: "National directory search is temporarily unavailable." }, 502, origin);
  }
}

function countFromContentRange(response) {
  const match = (response.headers.get("Content-Range") ?? "").match(/\/(\d+|\*)$/);
  return match && match[1] !== "*" ? Number(match[1]) : null;
}

async function handleSystemReadiness(request, env, origin) {
  if (request.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Max-Age": "600",
        "Vary": "Origin",
      },
    });
  }
  if (request.method !== "GET") return responseJson({ error: "Method not allowed" }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return responseJson({ error: "Origin not allowed" }, 403, origin);
  const clientIp = request.headers.get("CF-Connecting-IP");
  if (!clientIp) return responseJson({ error: "Unable to identify request source" }, 400, origin);
  const rate = await env.NEARBY_SEARCH_RATE_LIMIT.limit({ key: `readiness:${clientIp}` });
  if (!rate.success) return responseJson({ error: "Readiness check limit reached. Try again shortly." }, 429, origin);
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    return responseJson({ error: "Readiness service is not configured." }, 503, origin);
  }

  try {
    const definitions = [
      ["publishedInstitutions", "/rest/v1/monk_directory_institutions", [["published", "eq.true"]]],
      ["approvedImportSources", "/rest/v1/monk_directory_sources", [["terms_review_status", "eq.approved"], ["import_enabled", "eq.true"]]],
      ["publishedEffectivePolicies", "/rest/v1/monk_policy_documents", [["publication_state", "eq.published"], ["effective_at", `lte.${new Date().toISOString()}`]]],
    ];
    const checks = await Promise.all(definitions.map(async ([key, path, filters]) => {
      const endpoint = new URL(path, env.SUPABASE_URL);
      endpoint.searchParams.set("select", "id");
      endpoint.searchParams.set("limit", "1");
      for (const [filter, value] of filters) endpoint.searchParams.set(filter, value);
      const response = await fetch(endpoint, {
        headers: {
          apikey: env.SUPABASE_PUBLISHABLE_KEY,
          Prefer: "count=exact",
          Range: "0-0",
          "Cache-Control": "no-store",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`Readiness query failed for ${key}`);
      return [key, countFromContentRange(response)];
    }));
    const counts = Object.fromEntries(checks);
    const googlePlacesConfigured = Boolean(env.GOOGLE_MAPS_API_KEY);
    const blockers = [];
    if (!googlePlacesConfigured) blockers.push("GOOGLE_MAPS_API_KEY is not configured on the Cloudflare Worker.");
    if (counts.publishedInstitutions === 0) blockers.push("No verified and published institution records are available.");
    if (counts.approvedImportSources === 0) blockers.push("No official source is approved and enabled for import.");
    if (counts.publishedEffectivePolicies === 0) blockers.push("No legally reviewed policy documents are published and effective.");
    return responseJson({
      status: blockers.length ? "blocked" : "ready",
      checks: {
        googlePlacesConfigured,
        ...counts,
        directoryImportToken: "not introspectable from the public Worker; verify in Supabase Edge Function secrets",
      },
      blockers,
      checkedAt: new Date().toISOString(),
    }, 200, origin);
  } catch (error) {
    console.error(JSON.stringify({
      event: "system_readiness_failed",
      message: error instanceof Error ? error.message : "unknown",
    }));
    return responseJson({ error: "System readiness could not be verified." }, 502, origin);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/system/readiness") {
      return handleSystemReadiness(request, env, request.headers.get("Origin"));
    }
    if (url.pathname === "/api/policies/public") {
      return handlePublicPolicies(request, env, request.headers.get("Origin"), url);
    }
    if (url.pathname.startsWith("/api/directory/institutions/")) {
      return handleDirectoryInstitution(request, env, request.headers.get("Origin"), url);
    }
    if (url.pathname === "/api/directory/search") {
      return handleDirectorySearch(request, env, request.headers.get("Origin"), url);
    }
    if (url.pathname.startsWith("/api/businesses/")) {
      return handlePlaces(request, env, request.headers.get("Origin"), url);
    }
    return env.ASSETS.fetch(request);
  },
};
