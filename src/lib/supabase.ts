import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;
let serverClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function createSupabaseClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** Browser-only Supabase client using the public anon key. */
export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (!isSupabaseConfigured()) return null;

  if (!browserClient) {
    browserClient = createSupabaseClient();
  }

  return browserClient;
}

/** Server-side Supabase client for API routes and Vercel Cron. */
export function getServerSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  if (!serverClient) {
    serverClient = createSupabaseClient();
  }

  return serverClient;
}
