"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * Browser client deliberately uses only the public project URL and anon key.
 * It is created lazily so anonymous/local-only use continues to work when a
 * deployment has not configured Supabase yet.
 */
export function getBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return undefined;
  return createClient(url, key);
}
