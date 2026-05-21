import Link from "next/link";

import { ArticleCard } from "@/components/ArticleCard";
import { getAllArticles } from "@/lib/articles";
import { categories } from "@/lib/site";

export default async function Home() {
  const articles = await getAllArticles();

  return (
    <main>
      <section className="bg-slate-950 px-5 py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-sky-300">
              Wanna Navi
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              あなたは、何になりたい？
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              AI、音楽、VR、個人開発。なりたい姿までの最初の一歩を、
              ロードマップと道具選びでナビゲートする実践メディアです。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/categories/ai-engineer"
                className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-sky-100"
              >
                ロードマップを見る
              </Link>
              <a
                href="#latest"
                className="rounded-full border border-white/30 px-5 py-3 text-sm font-black text-white transition hover:border-white"
              >
                新着記事へ
              </a>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/categories/${category.slug}`}
                  className="rounded-lg bg-white p-5 text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-50"
                >
                  <div className={`h-1.5 w-24 rounded-full bg-gradient-to-r ${category.accent}`} />
                  <h2 className="mt-4 text-xl font-black">{category.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {category.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
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
              記事はMDXファイルとして管理しています。ロードマップ記事から、
              おすすめ道具や関連記事へ自然につながる構成です。
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
