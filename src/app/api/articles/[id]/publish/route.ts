import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    // Retrieve article and check ownership
    const { data: article, error: fetchError } = await supabase
      .from("articles")
      .select("user_id, review_status")
      .eq("id", id)
      .single();

    if (fetchError || !article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    if (article.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this article" }, { status: 403 });
    }

    // Publish article
    const { error: updateError } = await supabase
      .from("articles")
      .update({
        review_status: "approved",
        pipeline_state: "published",
        published_at: new Date().toISOString().split("T")[0],
        state_updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Roadmap published successfully!" });
  } catch (err: unknown) {
    console.error("Publish article error:", err);
    return NextResponse.json({ error: (err as Error).message || "Internal server error" }, { status: 500 });
  }
}
