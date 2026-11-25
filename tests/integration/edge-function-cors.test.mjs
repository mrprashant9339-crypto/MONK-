import assert from "node:assert/strict";
import test from "node:test";

const supabaseUrl = (process.env.MONK_SUPABASE_URL ?? "https://yucwackrbekwaxiyuobt.supabase.co").replace(/\/$/, "");
const endpoint = `${supabaseUrl}/functions/v1/send-education-invitation`;

test("MONK production origin receives the invitation function preflight", async () => {
  const response = await fetch(endpoint, {
    method: "OPTIONS",
    redirect: "manual",
    headers: {
      Origin: "https://monk.monster",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://monk.monster");
  assert.match(response.headers.get("access-control-allow-headers") ?? "", /authorization/i);
});

test("unapproved origins cannot use the invitation function", async () => {
  const response = await fetch(endpoint, {
    method: "OPTIONS",
    redirect: "manual",
    headers: {
      Origin: "https://untrusted.example",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});
