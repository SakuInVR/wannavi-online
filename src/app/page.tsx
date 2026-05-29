import Link from "next/link";

import { ArticleCard } from "@/components/ArticleCard";
import { CategoryMarquee } from "@/components/CategoryMarquee";
import { getAllArticles } from "@/lib/articles";

export const dynamic = "force-dynamic";
import { getSupabaseAdmin } from "@/lib/supabase";
import { categories } from "@/lib/site";

export default async function Home() {
  const articles = await getAllArticles();

  // Fetch user-added categories from Supabase and merge with defaults
  const supabase = getSupabaseAdmin();
  const allCategories = categories.map((c) => ({
    slug: c.slug,
    title: c.title,
    description: c.description,
    accent: c.accent,
  }));

  if (supabase) {
    try {
      const { data: userCats } = await supabase
        .from("user_categories")
        .select("slug, title, description, accent")
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (userCats && userCats.length > 0) {
        const existingSlugs = new Set(allCategories.map((c) => c.slug));
        for (const uc of userCats) {
          if (!existingSlugs.has(uc.slug)) {
            allCategories.push({
              slug: uc.slug,
              title: uc.title,
              description: uc.description ?? "",
              accent: uc.accent ?? "from-blue-500 to-cyan-400",
            });
          }
        }
      }
    } catch {
      // Supabase fetch failed, use defaults only
    }
  }

  return (
    <main>
      <section className="overflow-hidden bg-slate-950 px-5 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-sky-300">
            Wanna Navi
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            あなたは、何になりたい？
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            なりたい姿への最適なステップをAIが分析し、あなた専用の学習ロードマップを瞬時に生成。
            実践に必要な信頼できる教材や道具の選定までをナビゲートする、次世代の学習設計プラットフォームです。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/generate"
              className="rounded-full bg-white px-6 py-3.5 text-sm font-black text-slate-950 transition hover:bg-sky-100 flex items-center gap-1.5 shadow-lg shadow-sky-500/10"
            >
              <span>🪄</span> AIで自分専用ロードマップを作る
            </Link>
            <Link
              href="/categories"
              className="rounded-full border border-white/30 px-6 py-3.5 text-sm font-black text-white transition hover:border-white flex items-center gap-1.5"
            >
              <span>🌐</span> 公開ロードマップを探す
            </Link>
          </div>
        </div>

        {/* Scrolling category marquee */}
        <div className="mx-auto mt-12 max-w-6xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
            なりたい姿を探す
          </p>
          <CategoryMarquee categories={allCategories} />
        </div>
      </section>

      <section id="latest" className="px-5 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
                Latest
              </p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">新着ロードマップ</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              なりたい自分に近づくためのロードマップ記事を、最新順にチェックできます。
              カテゴリやタグからも、目的に合った記事を探せます。
            </p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
