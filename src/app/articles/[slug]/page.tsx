import type { Metadata } from "next";
import type { ComponentProps } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { AdSlot } from "@/components/AdSlot";
import { AffiliateCTA } from "@/components/AffiliateCTA";
import { JsonLd } from "@/components/JsonLd";
import { MonetizationPanel } from "@/components/MonetizationPanel";
import { ProductAd } from "@/components/ProductAd";
import { RelatedArticles } from "@/components/RelatedArticles";
import { TableOfContents } from "@/components/TableOfContents";
import { ToolRecommendation } from "@/components/ToolRecommendation";
import {
  getAllArticles,
  getArticleBySlug,
  getRelatedArticles,
} from "@/lib/articles";
import { getMonetizationOffer } from "@/lib/monetization";
import { siteConfig } from "@/lib/site";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/structured-data";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const articles = await getAllArticles();
  return articles.map((article) => ({ slug: article.slug }));
}

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const article = await getArticleBySlug(slug);

    if (article.draft) {
      return {};
    }

    return {
      title: article.title,
      description: article.description,
      alternates: {
        canonical: `/articles/${article.slug}`,
      },
      openGraph: {
        title: `${article.title} | ${siteConfig.name}`,
        description: article.description,
        url: `/articles/${article.slug}`,
        type: "article",
        publishedTime: article.publishedAt,
        modifiedTime: article.updatedAt ?? article.publishedAt,
      },
    };
  } catch {
    return {};
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  let article;

  try {
    article = await getArticleBySlug(slug);
  } catch {
    notFound();
  }

  if (article.draft) {
    notFound();
  }

  const offer = getMonetizationOffer(article.category);
  const mdxComponents = {
    AdSlot,
    AffiliateCTA: (props: ComponentProps<typeof AffiliateCTA>) => (
      <AffiliateCTA
        {...props}
        href={props.href ?? offer?.href}
        trackingLabel={props.trackingLabel ?? `inline:${article.slug}`}
      />
    ),
    ProductAd,
    ToolRecommendation: (props: ComponentProps<typeof ToolRecommendation>) => (
      <ToolRecommendation
        {...props}
        href={props.href ?? offer?.href}
        trackingLabel={props.trackingLabel ?? `tool:${article.slug}`}
      />
    ),
  };

  const { content } = await compileMDX({
    source: article.body,
    components: mdxComponents,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: "wrap" }],
        ],
      },
    },
  });
  const relatedArticles = await getRelatedArticles(article);
  const breadcrumbs = breadcrumbJsonLd([
    { name: siteConfig.name, href: "/" },
    { name: article.categoryTitle, href: `/categories/${article.category}` },
    { name: article.title, href: `/articles/${article.slug}` },
  ]);

  return (
    <main className="px-5 py-12">
      <JsonLd data={articleJsonLd(article)} />
      <JsonLd data={breadcrumbs} />
      <article className="mx-auto max-w-3xl">
        <Link
          href={`/categories/${article.category}`}
          className="text-sm font-bold text-sky-700 hover:text-sky-900"
        >
          {article.categoryTitle}
        </Link>
        <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
          {article.title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">{article.description}</p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-slate-500">
          <span>{article.publishedAt}</span>
          <span>{article.readingMinutes}</span>
        </div>
        {article.tags?.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <Link
                key={tag}
                href={`/tags/${encodeURIComponent(tag)}`}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"
              >
                {tag}
              </Link>
            ))}
          </div>
        ) : null}
        <TableOfContents headings={article.headings} />
        <div className="article-body mt-10">{content}</div>
        <MonetizationPanel category={article.category} />
        <AdSlot slotName={`${article.slug}-bottom`} />
      </article>
      <div className="mx-auto max-w-6xl">
        <RelatedArticles articles={relatedArticles} />
      </div>
    </main>
  );
}
