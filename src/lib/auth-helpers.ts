import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export interface AuthUser {
  id: string;
  email?: string;
}

/**
 * Verifies the Supabase JWT token passed via the Authorization header.
 * Returns the authenticated user object or null if invalid/missing.
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthUser | null> {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase config variables are missing!");
    return null;
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const token = authHeader.split(" ")[1];
  if (!token) return null;

  try {
    // Create a standalone client to query the user by token
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
  } catch (err) {
    console.error("Auth helper exception:", err);
    return null;
  }
}

/**
 * Retrieve authenticated user in Server Components via Cookies.
 */
export async function getServerUser(): Promise<AuthUser | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Look for Supabase auth cookie (format: sb-[project-id]-auth-token)
    const authCookie = allCookies.find(
      (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
    );

    if (!authCookie) return null;

    // Decode URL encoded JSON value
    const parsed = JSON.parse(decodeURIComponent(authCookie.value));
    const token = Array.isArray(parsed) ? parsed[0] : parsed?.access_token;

    if (!token) return null;

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) return null;

    return {
      id: user.id,
      email: user.email,
    };
  } catch (e) {
    console.error("Failed to authenticate user from cookies:", e);
    return null;
  }
}

