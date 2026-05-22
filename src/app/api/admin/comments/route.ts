import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/admin/comments
 * 管理画面用：全コメント一覧を取得（新着順）
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10);

  const { data: comments, error } = await supabase
    .from("comments")
    .select("id, article_id, articles!inner(slug, title), author_name, body, is_anonymous, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[admin/comments] Fetch error:", error);
    return NextResponse.json({ error: "コメントの取得に失敗しました" }, { status: 500 });
  }

  const formatted = (comments ?? []).map((c) => {
    const article = c.articles as unknown as { slug: string; title: string } | null;
    return {
      id: c.id,
      article_id: c.article_id,
      article_slug: article?.slug ?? "",
      article_title: article?.title ?? "(削除済み)",
      author_name: c.author_name,
      body: c.body,
      is_anonymous: c.is_anonymous,
      created_at: c.created_at,
    };
  });

  const { count } = await supabase
    .from("comments")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    comments: formatted,
    total: count ?? 0,
  });
}
