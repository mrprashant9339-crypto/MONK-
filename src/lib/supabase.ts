import { createClient } from "@supabase/supabase-js";

// Browser builds must be explicitly configured for the intended environment.
// Never silently point a preview/local build at production.
const configuredUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const configuredKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(configuredUrl && configuredKey);
const url = configuredUrl || "http://127.0.0.1:54321";
const publishableKey = configuredKey || "missing-supabase-configuration";

export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
