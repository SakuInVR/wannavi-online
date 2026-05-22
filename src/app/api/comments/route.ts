import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * POST /api/comments
 * 記事にコメントを投稿する（一般公開API / 即時反映）
 *
 * Body: { article_id: string, body: string, author_name?: string, is_anonymous: boolean }
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  let body: {
    article_id?: string;
    body?: string;
    author_name?: string;
    is_anonymous?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { article_id, body: commentBody, author_name, is_anonymous } = body;

  // Validation
  if (!article_id || typeof article_id !== "string") {
    return NextResponse.json({ error: "article_id is required" }, { status: 400 });
  }
  if (!commentBody || typeof commentBody !== "string" || !commentBody.trim()) {
    return NextResponse.json({ error: "コメント本文を入力してください" }, { status: 400 });
  }
  if (commentBody.length > 2000) {
    return NextResponse.json({ error: "コメントは2000文字以内で入力してください" }, { status: 400 });
  }

  const finalIsAnonymous = is_anonymous === true;
  const finalAuthorName = finalIsAnonymous ? null : (author_name?.trim() || "名無し");

  // Verify article exists and is published
  const { data: article, error: articleError } = await supabase
    .from("articles")
    .select("id, review_status, pipeline_state")
    .eq("id", article_id)
    .single();

  if (articleError || !article) {
    return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
  }

  if (article.review_status !== "approved" || article.pipeline_state !== "published") {
    return NextResponse.json({ error: "この記事にはコメントできません" }, { status: 403 });
  }

  // Insert comment (immediately visible)
  const { data: comment, error: insertError } = await supabase
    .from("comments")
    .insert({
      article_id,
      body: commentBody.trim(),
      author_name: finalAuthorName,
      is_anonymous: finalIsAnonymous,
    })
    .select("id, created_at")
    .single();

  if (insertError || !comment) {
    console.error("[comments] Insert error:", insertError);
    return NextResponse.json({ error: "コメントの投稿に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "コメントを投稿しました！",
  });
}

/**
 * GET /api/comments?article_id=xxx
 * 記事のコメント一覧を取得（一般公開API / 全件表示）
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const articleId = request.nextUrl.searchParams.get("article_id");
  if (!articleId) {
    return NextResponse.json({ error: "article_id is required" }, { status: 400 });
  }

  const { data: comments, error } = await supabase
    .from("comments")
    .select("id, author_name, body, is_anonymous, created_at")
    .eq("article_id", articleId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[comments] Fetch error:", error);
    return NextResponse.json({ error: "コメントの取得に失敗しました" }, { status: 500 });
  }

  return NextResponse.json(comments ?? []);
}
