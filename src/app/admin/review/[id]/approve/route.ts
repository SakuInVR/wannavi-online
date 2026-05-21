import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  // Accept optional body edit
  let editedBody: string | undefined;
  try {
    const body = await request.json();
    if (body.body && typeof body.body === "string") {
      editedBody = body.body;
    }
  } catch {
    // no body - just approve as-is
  }

  // Fetch full article info
  const { data: article, error: fetchError } = await supabase
    .from("articles")
    .select("title, description, category, slug, body")
    .eq("id", id)
    .single();

  if (fetchError || !article) {
    console.error("[approve] fetch error:", fetchError);
    return NextResponse.json({ error: "記事情報の取得に失敗しました" }, { status: 404 });
  }

  // Update in Supabase
  const updateData: Record<string, unknown> = {
    review_status: "approved",
    pipeline_state: "published",
    published_at: new Date().toISOString().split("T")[0],
    updated_at: new Date().toISOString().split("T")[0],
  };
  if (editedBody) {
    updateData.body = editedBody;
  }

  const { error: updateError } = await supabase
    .from("articles")
    .update(updateData)
    .eq("id", id);

  if (updateError) {
    console.error("[approve] update error:", updateError);
    return NextResponse.json({ error: "承認ステータスの更新に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    review_status: "approved",
    body_updated: !!editedBody,
  });
}
