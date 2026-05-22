import { getSupabaseAdmin } from "@/lib/supabase";
import { AdminDashboard } from "./admin-dashboard";
import type { Article, UserCategory, AspMaterial, Stats, LinkedAspInfo } from "./admin-dashboard";

export const dynamic = "force-dynamic";

async function fetchArticlesWithAsps(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  status: string,
  limit = 50
): Promise<Article[]> {
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, slug, title, category, review_status, created_at, retake_instructions, tags, body")
    .eq("review_status", status)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !articles) return [];

  // Fetch linked ASPs for each article
  const result = await Promise.all(
    articles.map(async (article) => {
      const { data: asps } = await supabase
        .from("article_asp_materials")
        .select("asp_material_id, asp_materials(name, asp_name, affiliate_url, price_note, usage_type, description)")
        .eq("article_id", article.id);

      const linked_asps: LinkedAspInfo[] = (asps ?? [])
        .map((row: unknown) => {
          const r = row as {
            asp_material_id: string;
            asp_materials: {
              name: string; asp_name: string; affiliate_url: string | null;
              price_note: string | null; usage_type: string | null; description: string | null;
            } | null;
          };
          if (!r.asp_materials) return null;
          return {
            name: r.asp_materials.name,
            asp_name: r.asp_materials.asp_name,
            affiliate_url: r.asp_materials.affiliate_url,
            price_note: r.asp_materials.price_note,
            usage_type: r.asp_materials.usage_type ?? "recommendation",
            description: r.asp_materials.description,
          };
        })
        .filter(Boolean) as LinkedAspInfo[];

      return { ...article, linked_asps } as Article;
    })
  );

  return result;
}

export default async function AdminPage() {
  const supabase = getSupabaseAdmin();

  let pendingArticles: Article[] = [];
  let publishedArticles: Article[] = [];
  let categories: UserCategory[] = [];
  let aspMaterials: AspMaterial[] = [];
  const stats: Stats = { pending: 0, approved: 0, rejected: 0, materials: 0 };

  if (supabase) {
    const [pendingRes, publishedRes, catRes, aspRes, statsRes] = await Promise.all([
      fetchArticlesWithAsps(supabase, "pending"),
      fetchArticlesWithAsps(supabase, "approved"),
      supabase.from("user_categories").select("*").order("created_at", { ascending: false }),
      supabase.from("asp_materials").select("*").eq("status", "active").order("created_at", { ascending: false }),
      supabase
        .from("articles")
        .select("review_status", { count: "exact", head: false }),
    ]);

    pendingArticles = pendingRes;
    publishedArticles = publishedRes;
    categories = (catRes.data as UserCategory[]) ?? [];
    aspMaterials = (aspRes.data as AspMaterial[]) ?? [];

    if (statsRes.data) {
      const arr = statsRes.data as Array<{ review_status: string }>;
      stats.pending = arr.filter((a) => a.review_status === "pending").length;
      stats.approved = arr.filter((a) => a.review_status === "approved").length;
      stats.rejected = arr.filter((a) => a.review_status === "rejected").length;
    }
    stats.materials = aspMaterials.length;
  }

  return (
    <AdminDashboard
      initialPending={pendingArticles}
      initialPublished={publishedArticles}
      initialCategories={categories}
      initialAspMaterials={aspMaterials}
      initialStats={stats}
      supabaseConfigured={!!supabase}
    />
  );
}
