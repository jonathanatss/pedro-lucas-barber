import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env, hasSupabaseServiceCredentials } from "@/lib/env";

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (!hasSupabaseServiceCredentials) {
    return null;
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return supabaseAdmin;
}
