import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { getAllTags, getArticlesByTag } from "@/lib/articles";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "タグ一覧",
  description: "Wanna Naviの記事タグ一覧です。",
  alternates: {
    canonical: "/tags",
  },
  openGraph: {
    title: `タグ一覧 | ${siteConfig.name}`,
    description: "Wanna Naviの記事タグ一覧です。",
    url: "/tags",
  },
};

export default function TagsPage() {
  const tags = getAllTags();

  return (
    <main className="px-5 py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `タグ一覧 | ${siteConfig.name}`,
          description: "Wanna Naviの記事タグ一覧です。",
          url: `${siteConfig.url}/tags`,
        }}
      />
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
          Tags
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
          タグ一覧
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          気になるテーマから、なりたい自分へのロードマップを探せます。
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
            >
              {tag}
              <span className="ml-2 text-slate-400">{getArticlesByTag(tag).length}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
