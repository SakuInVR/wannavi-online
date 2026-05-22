import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const status = request.nextUrl.searchParams.get("status") ?? "pending";

  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, slug, title, category, review_status, created_at, retake_instructions, tags, body")
    .eq("review_status", status)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    return NextResponse.json([]);
  }

  // Fetch linked ASP materials for each article
  const result = await Promise.all(
    articles.map(async (article) => {
      const { data: asps } = await supabase
        .from("article_asp_materials")
        .select("asp_material_id, asp_materials(name, asp_name, affiliate_url, price_note, usage_type, description)")
        .eq("article_id", article.id);

      const linked_asps = (asps ?? [])
        .map((row: unknown) => {
          const r = row as {
            asp_material_id: string;
            asp_materials: {
              name: string;
              asp_name: string;
              affiliate_url: string | null;
              price_note: string | null;
              usage_type: string | null;
              description: string | null;
            } | null;
          };
          return r.asp_materials;
        })
        .filter(Boolean);

      return {
        ...article,
        linked_asps,
      };
    })
  );

  return NextResponse.json(result);
}
