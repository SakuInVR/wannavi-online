import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  // Enforce development mode only
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Forbidden: Mock payment is only available in development mode" },
      { status: 403 }
    );
  }

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    // 1. Fetch current credits
    const { data: profile, error: profileFetchError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    if (profileFetchError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const newCredits = (profile.credits ?? 0) + 10;
    const mockSessionId = `mock_session_${Date.now()}`;

    // 2. Log mock purchase
    await supabase.from("purchases").insert({
      user_id: user.id,
      stripe_session_id: mockSessionId,
      amount_total: 1000,
      credits_added: 10,
      status: "completed",
    });

    // 3. Increment credits
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits: newCredits, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update credits" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Mock payment processed successfully! Added 10 credits.",
      credits: newCredits,
    });
  } catch (err: unknown) {
    console.error("Mock payment error:", err);
    return NextResponse.json({ error: (err as Error).message || "Internal server error" }, { status: 500 });
  }
}
