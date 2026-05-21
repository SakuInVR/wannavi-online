import type { Metadata } from "next";

import { ArticleCard } from "@/components/ArticleCard";
import { JsonLd } from "@/components/JsonLd";
import { getAllArticles } from "@/lib/articles";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "全記事",
  description: "Wanna Naviで公開しているロードマップ記事の一覧です。",
  alternates: {
    canonical: "/articles",
  },
  openGraph: {
    title: `全記事 | ${siteConfig.name}`,
    description: "Wanna Naviで公開しているロードマップ記事の一覧です。",
    url: "/articles",
  },
};

export default async function ArticlesPage() {
  const articles = await getAllArticles();

  return (
    <main className="px-5 py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `全記事 | ${siteConfig.name}`,
          description: "Wanna Naviで公開しているロードマップ記事の一覧です。",
          url: `${siteConfig.url}/articles`,
        }}
      />
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
          Articles
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
          全記事
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          AI、DTM、VR制作など、なりたい自分に近づくためのロードマップを一覧できます。
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </div>
    </main>
  );
}
