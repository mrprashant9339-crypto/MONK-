import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import test from "node:test";

const required = [
  "MONK_E2E_SUPABASE_URL",
  "MONK_E2E_SUPABASE_ANON_KEY",
  "MONK_E2E_OWNER_EMAIL",
  "MONK_E2E_OWNER_PASSWORD",
  "MONK_E2E_INVITEE_EMAIL",
  "MONK_E2E_INVITEE_PASSWORD",
  "MONK_E2E_OWNER_ORG_ID",
  "MONK_E2E_INVITEE_ORG_ID",
];
const missing = required.filter((key) => !process.env[key]);
const url = process.env.MONK_E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
const key = process.env.MONK_E2E_SUPABASE_ANON_KEY ?? "missing";
const makeClient = () => createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const owner = makeClient();
const invitee = makeClient();

test("MONK real multi-user authentication and organization invitation E2E", async () => {
  assert.deepEqual(missing, [], `Required E2E secrets are missing: ${missing.join(", ")}`);
  assert.notEqual(process.env.MONK_E2E_OWNER_EMAIL.toLowerCase(), process.env.MONK_E2E_INVITEE_EMAIL.toLowerCase(), "Use two distinct verified test accounts");
  if (url.includes("yucwackrbekwaxiyuobt") && process.env.MONK_E2E_ALLOW_PRODUCTION !== "true") {
    throw new Error("Refusing to mutate MONK production from E2E. Use a staging Supabase project or explicitly set MONK_E2E_ALLOW_PRODUCTION=true.");
  }

  const ownerLogin = await owner.auth.signInWithPassword({
    email: process.env.MONK_E2E_OWNER_EMAIL,
    password: process.env.MONK_E2E_OWNER_PASSWORD,
  });
  assert.ifError(ownerLogin.error);
  assert.ok(ownerLogin.data.user?.id, "Owner account must authenticate");

  const inviteeLogin = await invitee.auth.signInWithPassword({
    email: process.env.MONK_E2E_INVITEE_EMAIL,
    password: process.env.MONK_E2E_INVITEE_PASSWORD,
  });
  assert.ifError(inviteeLogin.error);
  assert.ok(inviteeLogin.data.user?.id, "Invitee account must authenticate");
  assert.notEqual(ownerLogin.data.user.id, inviteeLogin.data.user.id, "Test users must be distinct");

  for (const [client, userId, label] of [
    [owner, ownerLogin.data.user.id, "owner"],
    [invitee, inviteeLogin.data.user.id, "invitee"],
  ]) {
    const profile = await client.from("profiles").select("id,full_name").eq("id", userId).single();
    assert.ifError(profile.error);
    assert.equal(profile.data.id, userId, `${label} profile must be created by the auth.users trigger`);

    const consent = await client.from("legal_consents")
      .select("terms_version,privacy_version,accepted_at")
      .eq("user_id", userId)
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    assert.ifError(consent.error);
    assert.ok(consent.data?.terms_version && consent.data?.privacy_version,
      `${label} legal consent record must exist`);
  }

  const ownerOrg = process.env.MONK_E2E_OWNER_ORG_ID;
  const inviteeOrg = process.env.MONK_E2E_INVITEE_ORG_ID;
  assert.notEqual(ownerOrg, inviteeOrg, "Use two separate organizations for tenant-isolation verification");

  const ownerPermission = await owner.rpc("has_org_permission", {
    target_org: ownerOrg,
    permission_key: "organization.members.invite",
  });
  assert.ifError(ownerPermission.error);
  assert.equal(ownerPermission.data, true, "Owner must have invitation permission");

  const forbiddenBefore = await owner.rpc("has_org_permission", {
    target_org: inviteeOrg,
    permission_key: "organization.members.invite",
  });
  assert.ifError(forbiddenBefore.error);
  assert.equal(forbiddenBefore.data, false, "Owner must not have permissions in another tenant");

  const created = await owner.rpc("create_organization_invitation", {
    target_org: ownerOrg,
    invite_email: process.env.MONK_E2E_INVITEE_EMAIL,
    invite_role: "contributor",
    expires_in_days: 1,
  });
  assert.ifError(created.error);
  const invitation = Array.isArray(created.data) ? created.data[0] : created.data;
  assert.ok(invitation?.invitation_id && invitation?.invitation_token, "Invitation RPC must return a one-time token");

  const accepted = await invitee.rpc("accept_organization_invitation", {
    invite_token: invitation.invitation_token,
  });
  assert.ifError(accepted.error);
  assert.equal(accepted.data, ownerOrg, "Invitee should be switched to invited organization");

  const memberCheck = await invitee
    .from("organization_members")
    .select("organization_id,role,status")
    .eq("organization_id", ownerOrg)
    .eq("user_id", inviteeLogin.data.user.id)
    .maybeSingle();
  assert.ifError(memberCheck.error);
  assert.equal(memberCheck.data?.status, "active");
  assert.equal(memberCheck.data?.role, "contributor");

  const duplicateAccept = await invitee.rpc("accept_organization_invitation", {
    invite_token: invitation.invitation_token,
  });
  assert.ok(duplicateAccept.error, "Invitation token must be single-use");

  const switchedToOwn = await invitee.rpc("switch_organization", { target_org: inviteeOrg });
  assert.ifError(switchedToOwn.error);
  assert.equal(switchedToOwn.data, inviteeOrg, "Invitee should switch back to their original tenant");

  const switchedToInvited = await invitee.rpc("switch_organization", { target_org: ownerOrg });
  assert.ifError(switchedToInvited.error);
  assert.equal(switchedToInvited.data, ownerOrg, "Invitee should switch to the newly joined tenant");

  const outsiderMembership = await owner.rpc("is_org_member", { target_org: inviteeOrg });
  assert.ifError(outsiderMembership.error);
  assert.equal(outsiderMembership.data, false, "Owner must remain isolated from invitee's original tenant");

  const ownerSwitched = await owner.rpc("switch_organization", { target_org: ownerOrg });
  assert.ifError(ownerSwitched.error);
  assert.equal(ownerSwitched.data, ownerOrg);

  console.log("PASS: two independent verified accounts, invitation, one-time acceptance, role assignment, organization switching and tenant isolation.");
});
