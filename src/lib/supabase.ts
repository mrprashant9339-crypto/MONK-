import { createClient } from "@supabase/supabase-js";

// Local development is deliberately pinned to the isolated staging project.
// Never let a developer's .env.local accidentally direct local signup traffic to production.
const STAGING_SUPABASE_URL = "https://ysspnuldfiijagagwiqk.supabase.co";
const STAGING_PUBLISHABLE_KEY = "sb_publishable_3auck9P-qvZADFO9GnbR0A_1MzHU0zp";

// Production retains its existing public fallback for the current deployed Worker/Vercel
// build. Production and Preview Vercel environments should override these with their
// environment-specific public values.
const PRODUCTION_SUPABASE_URL = "https://yucwackrbekwaxiyuobt.supabase.co";
const PRODUCTION_PUBLISHABLE_KEY = "sb_publishable_T5QKS6ZJkiUMGfKq8a4OHQ_c1ri_Al9";

const url = import.meta.env.DEV
  ? STAGING_SUPABASE_URL
  : ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? PRODUCTION_SUPABASE_URL);
const publishableKey = import.meta.env.DEV
  ? STAGING_PUBLISHABLE_KEY
  : ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? PRODUCTION_PUBLISHABLE_KEY);

export const isSupabaseConfigured = Boolean(url && publishableKey);
export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: "pkce"
  }
});
