import { createClient } from "@supabase/supabase-js";

// Supabase publishable keys are designed for browser use. Row Level Security is the
// security boundary; never put a service_role/secret key in this file.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "https://yucwackrbekwaxiyuobt.supabase.co";
const publishableKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "sb_publishable_T5QKS6ZJkiUMGfKq8a4OHQ_c1ri_Al9";

export const isSupabaseConfigured = Boolean(url && publishableKey);
export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce"
  }
});
