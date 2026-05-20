import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function getSupabaseServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function hasSupabaseConfig() {
  return !!(getSupabaseUrl() && getSupabaseAnonKey());
}

/**
 * Client-side (anon key) – safe for browser.
 * Returns null when env vars are not configured.
 */
export function getSupabase(): SupabaseClient | null {
  if (!hasSupabaseConfig()) return null;

  if (!_supabase) {
    _supabase = createClient(getSupabaseUrl()!, getSupabaseAnonKey()!);
  }
  return _supabase;
}

/**
 * Server-side (service_role key) – admin operations only.
 * Falls back to anon key in dev when service key is not set.
 * Returns null when env vars are not configured.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!hasSupabaseConfig()) return null;

  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      getSupabaseUrl()!,
      getSupabaseServiceKey() ?? getSupabaseAnonKey()!
    );
  }
  return _supabaseAdmin;
}

// Legacy convenience exports (may be null)
export const supabase = () => getSupabase();
export const supabaseAdmin = () => getSupabaseAdmin();
