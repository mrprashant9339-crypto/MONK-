import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.0";

export type OrganizationPolicyContext = {
  id: string;
  vertical: "education" | "business" | string;
  entity_type: string | null;
  institution_category: string | null;
  jurisdiction: string;
  state_code: string | null;
  enabled_modules: string[];
};

type PolicyRule = {
  rule_key: string;
  priority: number;
  conditions: Record<string, unknown>;
  required_policy_keys: string[];
};

function matchesRule(conditions: Record<string, unknown>, organization: OrganizationPolicyContext): boolean {
  if (conditions.all === true) return true;
  for (const [key, expected] of Object.entries(conditions)) {
    if (key === "enabled_modules_contains") {
      if (typeof expected !== "string" || !organization.enabled_modules.includes(expected)) return false;
      continue;
    }
    const actual = (organization as unknown as Record<string, unknown>)[key];
    if (Array.isArray(expected)) {
      if (!expected.includes(actual)) return false;
    } else if (actual !== expected) {
      return false;
    }
  }
  return true;
}

export async function getOrganizationPolicyContext(
  userClient: SupabaseClient,
): Promise<OrganizationPolicyContext | null> {
  const { data: organizationId, error: organizationIdError } = await userClient.rpc("current_organization_id");
  if (organizationIdError) throw new Error("Unable to resolve active organization");
  if (!organizationId || typeof organizationId !== "string") return null;

  const { data, error } = await userClient
    .from("organizations")
    .select("id,vertical,entity_type,institution_category,jurisdiction,state_code,enabled_modules")
    .eq("id", organizationId)
    .single();
  if (error || !data) throw new Error("Unable to load organization policy attributes");

  return {
    id: data.id,
    vertical: data.vertical,
    entity_type: data.entity_type ?? null,
    institution_category: data.institution_category ?? null,
    jurisdiction: data.jurisdiction ?? "IN",
    state_code: data.state_code ?? null,
    enabled_modules: Array.isArray(data.enabled_modules) ? data.enabled_modules : [],
  };
}

export async function resolveRequiredPolicyKeys(
  serviceClient: SupabaseClient,
  organization: OrganizationPolicyContext,
): Promise<string[]> {
  const { data: rules, error } = await serviceClient
    .from("monk_policy_rules")
    .select("rule_key,priority,conditions,required_policy_keys")
    .eq("active", true)
    .order("priority", { ascending: true });
  if (error) throw new Error("Unable to load active policy rules");

  const keys = new Set<string>();
  for (const rule of (rules ?? []) as PolicyRule[]) {
    if (matchesRule(rule.conditions ?? {}, organization)) {
      for (const key of rule.required_policy_keys ?? []) keys.add(key);
    }
  }
  return [...keys];
}
