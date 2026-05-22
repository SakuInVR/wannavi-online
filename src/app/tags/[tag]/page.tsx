import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleCard } from "@/components/ArticleCard";
import { JsonLd } from "@/components/JsonLd";
import { getAllTags, getArticlesByTag } from "@/lib/articles";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

type TagPageProps = {
  params: Promise<{ tag: string }>;
};

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);

  return {
    title: `${decodedTag} の記事`,
    description: `${decodedTag} に関するWanna Naviの記事一覧です。`,
    alternates: {
      canonical: `/tags/${encodeURIComponent(decodedTag)}`,
    },
    openGraph: {
      title: `${decodedTag} の記事 | ${siteConfig.name}`,
      description: `${decodedTag} に関するWanna Naviの記事一覧です。`,
      url: `/tags/${encodeURIComponent(decodedTag)}`,
    },
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const articles = await getArticlesByTag(decodedTag);

  if (!articles.length) {
    notFound();
  }

  return (
    <main className="px-5 py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${decodedTag} の記事 | ${siteConfig.name}`,
          description: `${decodedTag} に関するWanna Naviの記事一覧です。`,
          url: `${siteConfig.url}/tags/${encodeURIComponent(decodedTag)}`,
        }}
      />
      <div className="mx-auto max-w-6xl">
        <Link href="/tags" className="text-sm font-bold text-sky-700 hover:text-sky-900">
          タグ一覧へ
        </Link>
        <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">
          {decodedTag} の記事
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          {decodedTag} に関するロードマップとつまずき解決記事です。
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
