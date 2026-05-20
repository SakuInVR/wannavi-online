import { getSupabaseAdmin } from "@/lib/supabase";
import { AdminDashboard } from "./admin-dashboard";
import type { Article, UserCategory, AspMaterial, Stats } from "./admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = getSupabaseAdmin();

  let pendingArticles: Article[] = [];
  let categories: UserCategory[] = [];
  let aspMaterials: AspMaterial[] = [];
  const stats: Stats = { pending: 0, approved: 0, rejected: 0, materials: 0 };

  if (supabase) {
    const [pendingRes, catRes, aspRes, statsRes] = await Promise.all([
      supabase
        .from("articles")
        .select("id, title, category, review_status, created_at")
        .eq("review_status", "pending")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("user_categories").select("*").order("created_at", { ascending: false }),
      supabase.from("asp_materials").select("*").eq("status", "active").order("created_at", { ascending: false }),
      supabase
        .from("articles")
        .select("review_status", { count: "exact", head: false }),
    ]);

    pendingArticles = (pendingRes.data as Article[]) ?? [];
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
      initialCategories={categories}
      initialAspMaterials={aspMaterials}
      initialStats={stats}
      supabaseConfigured={!!supabase}
    />
  );
}
