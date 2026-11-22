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
        "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return responseJson({ error: "Origin not allowed" }, 403, origin);

  const clientIp = request.headers.get("CF-Connecting-IP");
  if (!clientIp) return responseJson({ error: "Unable to identify request source" }, 400, origin);
  const rate = await env.NEARBY_SEARCH_RATE_LIMIT.limit({ key: `directory:${clientIp}` });
  if (!rate.success) return responseJson({ error: "Directory search limit reached. Try again shortly." }, 429, origin);

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
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
    endpoint.searchParams.set("or", `(canonical_name.ilike.${pattern},city.ilike.${pattern},district.ilike.${pattern},locality.ilike.${pattern})`);
  }

  try {
    const upstream = await fetch(endpoint, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
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
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/directory/search") {
      return handleDirectorySearch(request, env, request.headers.get("Origin"), url);
    }
    if (url.pathname.startsWith("/api/businesses/")) {
      return handlePlaces(request, env, request.headers.get("Origin"), url);
    }
    return env.ASSETS.fetch(request);
  },
};
