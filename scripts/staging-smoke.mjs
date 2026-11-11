const expectedRef = "ysspnuldfiijagagwiqk";
const urlValue = process.env.MONK_STAGING_SUPABASE_URL;
const key = process.env.MONK_STAGING_SUPABASE_ANON_KEY;

function fail(message) {
  console.error(`STAGING SMOKE FAIL: ${message}`);
  process.exitCode = 1;
}

async function request(path, label) {
  const response = await fetch(`${urlValue.replace(/\/$/, "")}${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    fail(`${label} returned HTTP ${response.status}: ${detail}`);
    return;
  }
  console.log(`STAGING SMOKE PASS: ${label} responded HTTP ${response.status}.`);
}

if (!urlValue || !key) {
  fail("Set MONK_STAGING_SUPABASE_URL and MONK_STAGING_SUPABASE_ANON_KEY.");
} else {
  let url;
  try {
    url = new URL(urlValue);
  } catch {
    fail("MONK_STAGING_SUPABASE_URL is not a valid URL.");
  }

  if (url) {
    if (url.protocol !== "https:" || url.hostname !== `${expectedRef}.supabase.co`) {
      fail(`Refusing non-staging target. Expected https://${expectedRef}.supabase.co`);
    } else {
      try {
        await request("/auth/v1/health", "Supabase Auth health endpoint");
        if (process.exitCode !== 1) {
          await request("/rest/v1/organizations?select=id&limit=0", "MONK organizations REST schema");
          await request("/rest/v1/tasks?select=id&limit=0", "MONK tasks REST schema");
          await request("/rest/v1/profiles?select=id&limit=0", "MONK profiles REST schema");
        }
      } catch (error) {
        fail(error instanceof Error ? error.message : "Could not reach staging Supabase endpoints.");
      }
    }
  }
}
