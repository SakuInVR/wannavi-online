import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { categories, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "カテゴリ一覧",
  description: "Wanna Naviのロードマップカテゴリ一覧です。",
  alternates: {
    canonical: "/categories",
  },
  openGraph: {
    title: `カテゴリ一覧 | ${siteConfig.name}`,
    description: "Wanna Naviのロードマップカテゴリ一覧です。",
    url: "/categories",
  },
};

export default function CategoriesPage() {
  return (
    <main className="px-5 py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `カテゴリ一覧 | ${siteConfig.name}`,
          description: "Wanna Naviのロードマップカテゴリ一覧です。",
          url: `${siteConfig.url}/categories`,
        }}
      />
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
          Categories
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
          カテゴリ一覧
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          なりたい姿ごとに、最初の一歩と必要な道具を整理しています。
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/categories/${category.slug}`}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className={`h-1.5 w-24 rounded-full bg-gradient-to-r ${category.accent}`} />
              <h2 className="mt-5 text-2xl font-black text-slate-950">{category.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{category.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
