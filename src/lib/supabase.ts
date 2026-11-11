import { createClient } from "@supabase/supabase-js";

// Browser code may use a Supabase publishable/anon key only.
// Never add a service_role or secret key to VITE_* variables.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const publishableKey = (
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
)?.trim();

export const isSupabaseConfigured = Boolean(url && publishableKey);
export const supabase = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce"
      }
    })
  : null;
