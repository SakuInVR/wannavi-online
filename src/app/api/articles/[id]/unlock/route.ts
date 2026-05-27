import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: articleId } = await params;

    // 1. Authenticate user
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    // 2. Check if already unlocked
    const { data: existingUnlock } = await supabase
      .from("article_unlocks")
      .select("id")
      .eq("user_id", user.id)
      .eq("article_id", articleId)
      .maybeSingle();

    if (existingUnlock) {
      return NextResponse.json({ success: true, message: "既にアンロックされています" });
    }

    // 3. Fetch user credit balance
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "ユーザープロフィールが見つかりません" }, { status: 404 });
    }

    if ((profile.credits ?? 0) <= 0) {
      return NextResponse.json({ error: "クレジット残高がありません。追加購入してください。" }, { status: 402 });
    }

    // 4. Deduct credit and register unlock
    const newCredits = profile.credits - 1;

    // Update profile credits
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({ credits: newCredits, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (updateProfileError) {
      console.error("Failed to deduct credits:", updateProfileError);
      return NextResponse.json({ error: "クレジットの減算に失敗しました" }, { status: 500 });
    }

    // Insert into article_unlocks
    const { error: insertUnlockError } = await supabase
      .from("article_unlocks")
      .insert({
        user_id: user.id,
        article_id: articleId,
      });

    if (insertUnlockError) {
      console.error("Failed to insert unlock record:", insertUnlockError);
      // Refund credits in case of insertion failure
      await supabase
        .from("profiles")
        .update({ credits: profile.credits, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      return NextResponse.json({ error: "アンロック記録の作成に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      credits_remaining: newCredits,
    });
  } catch (err: unknown) {
    console.error("Unlock API error:", err);
    return NextResponse.json({ error: (err as Error).message || "Internal server error" }, { status: 500 });
  }
}
