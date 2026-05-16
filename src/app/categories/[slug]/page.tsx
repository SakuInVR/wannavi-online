import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleCard } from "@/components/ArticleCard";
import { JsonLd } from "@/components/JsonLd";
import { getArticlesByCategory } from "@/lib/articles";
import { categories, getCategory, siteConfig } from "@/lib/site";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/structured-data";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);

  if (!category) {
    return {};
  }

  return {
    title: category.title,
    description: category.description,
    alternates: {
      canonical: `/categories/${category.slug}`,
    },
    openGraph: {
      title: `${category.title} | ${siteConfig.name}`,
      description: category.description,
      url: `/categories/${category.slug}`,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = getCategory(slug);

  if (!category) {
    notFound();
  }

  const articles = getArticlesByCategory(category.slug);
  const collectionJsonLd = collectionPageJsonLd(category.slug);
  const breadcrumbs = breadcrumbJsonLd([
    { name: siteConfig.name, href: "/" },
    { name: category.title, href: `/categories/${category.slug}` },
  ]);

  return (
    <main className="px-5 py-14">
      {collectionJsonLd ? <JsonLd data={collectionJsonLd} /> : null}
      <JsonLd data={breadcrumbs} />
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-bold text-sky-700 hover:text-sky-900">
          Wanna Navi トップへ
        </Link>
        <div className={`mt-8 h-2 w-32 rounded-full bg-gradient-to-r ${category.accent}`} />
        <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">
          {category.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          {category.description}
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>

        {!articles.length ? (
          <div className="mt-10 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-slate-600">
            このカテゴリの記事はまだありません。`content/articles` にMDXを追加すると表示されます。
          </div>
        ) : null}
      </div>
    </main>
  );
}
