const expectedRef = "ysspnuldfiijagagwiqk";
const urlValue = process.env.MONK_STAGING_SUPABASE_URL;
const key = process.env.MONK_STAGING_SUPABASE_ANON_KEY;

function fail(message) {
  console.error(`STAGING SMOKE FAIL: ${message}`);
  process.exitCode = 1;
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
        const response = await fetch(`${url.origin}/auth/v1/health`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(15000)
        });
        if (!response.ok) {
          fail(`Supabase Auth health endpoint returned HTTP ${response.status}.`);
        } else {
          console.log(`STAGING SMOKE PASS: ${url.origin} Auth health endpoint responded HTTP ${response.status}.`);
        }
      } catch (error) {
        fail(error instanceof Error ? error.message : "Could not reach Supabase Auth health endpoint.");
      }
    }
  }
}
