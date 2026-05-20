import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 500 }
    );
  }

  let feedback_comment: string;
  try {
    const body = await request.json();
    feedback_comment = body.feedback_comment;
  } catch {
    return NextResponse.json(
      { error: "リクエストボディが不正です" },
      { status: 400 }
    );
  }

  if (!feedback_comment || typeof feedback_comment !== "string" || !feedback_comment.trim()) {
    return NextResponse.json(
      { error: "feedback_comment は必須です" },
      { status: 400 }
    );
  }

  // 1. Get article category for feedback record
  const { data: article, error: fetchError } = await supabase
    .from("articles")
    .select("category")
    .eq("id", id)
    .single();

  if (fetchError || !article) {
    console.error("[reject] fetch error:", fetchError);
    return NextResponse.json(
      { error: "記事が見つかりません" },
      { status: 404 }
    );
  }

  // 2. Update article status to rejected
  const { error: updateError } = await supabase
    .from("articles")
    .update({ review_status: "rejected" })
    .eq("id", id);

  if (updateError) {
    console.error("[reject] update error:", updateError);
    return NextResponse.json(
      { error: "却下処理に失敗しました" },
      { status: 500 }
    );
  }

  // 3. Save feedback
  const { error: feedbackError } = await supabase
    .from("article_feedbacks")
    .insert({
      article_id: id,
      category: article.category,
      feedback_comment: feedback_comment.trim(),
    });

  if (feedbackError) {
    console.error("[reject] feedback insert error:", feedbackError);
    // 記事の却下は成功しているので、フィードバック保存だけ警告
    return NextResponse.json({
      success: true,
      review_status: "rejected",
      warning: "フィードバックの保存に失敗しました",
    });
  }

  return NextResponse.json({ success: true, review_status: "rejected" });
}
