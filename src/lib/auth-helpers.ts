import { NextRequest } from "next/server";
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
