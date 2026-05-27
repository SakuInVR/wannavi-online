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
import { CommentSection } from "@/components/CommentSection";
import { JsonLd } from "@/components/JsonLd";
import { ProductAd } from "@/components/ProductAd";
import { ProductRecommendation } from "@/components/ProductRecommendation";
import { RelatedArticles } from "@/components/RelatedArticles";
import { TableOfContents } from "@/components/TableOfContents";
import { ToolRecommendation } from "@/components/ToolRecommendation";
import { UnlockCard } from "@/components/UnlockCard";
import {
  getAllArticles,
  getArticleBySlug,
  getRelatedArticles,
} from "@/lib/articles";
import { siteConfig } from "@/lib/site";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/structured-data";
import { getServerUser } from "@/lib/auth-helpers";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  // Check Unlock status
  const user = await getServerUser();
  const supabase = getSupabaseAdmin();
  let isUnlocked = false;

  // If the article has no user_id, it is an official admin article (free/unlocked for everyone)
  if (!article.userId) {
    isUnlocked = true;
  } else if (user && supabase) {
    const { data: unlock } = await supabase
      .from("article_unlocks")
      .select("id")
      .eq("user_id", user.id)
      .eq("article_id", article.id)
      .maybeSingle();
    
    if (unlock) {
      isUnlocked = true;
    }
  }

  // Split content based on lock status
  const hasPremiumDelimiter = article.body.includes("<!-- PREMIUM_SECTION -->");
  let mdxSource = article.body;

  if (hasPremiumDelimiter && !isUnlocked) {
    const parts = article.body.split("<!-- PREMIUM_SECTION -->");
    mdxSource = parts[0] + "\n\n*(後半のロードマッププランと挫折防止対策はロックされています)*";
  } else {
    // Just remove delimiter if unlocked
    mdxSource = article.body.replace("<!-- PREMIUM_SECTION -->", "");
  }

  // Amazon アフィリエイト検索 URL を動的生成（title から検索キーワードを抽出）
  const amazonSearchUrl = (title: string) =>
    `https://www.amazon.co.jp/s?k=${encodeURIComponent(title)}&tag=wannanavi-22`;

  const mdxComponents = {
    AdSlot,
    AffiliateCTA: (props: ComponentProps<typeof AffiliateCTA>) => (
      <AffiliateCTA
        {...props}
        href={props.href ?? amazonSearchUrl(props.title)}
        trackingLabel={props.trackingLabel ?? `inline:${article.slug}`}
      />
    ),
    ProductAd,
    ToolRecommendation: (props: ComponentProps<typeof ToolRecommendation>) => (
      <ToolRecommendation
        {...props}
        href={props.href ?? amazonSearchUrl(props.name)}
        trackingLabel={props.trackingLabel ?? `tool:${article.slug}`}
      />
    ),
    ProductRecommendation: (props: ComponentProps<typeof ProductRecommendation>) => (
      <ProductRecommendation
        {...props}
        trackingLabel={props.trackingLabel ?? `product:${article.slug}`}
      />
    ),
  };

  const { content } = await compileMDX({
    source: mdxSource,
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
        <div className="flex items-center gap-3">
          <Link
            href={`/categories/${article.category}`}
            className="text-sm font-bold text-sky-700 hover:text-sky-900"
          >
            {article.categoryTitle}
          </Link>
          {article.tags?.includes("ユーザー投稿") && (
            <span className="rounded bg-sky-100 border border-sky-200 px-2 py-0.5 text-[10px] font-black text-sky-700">
              ユーザー投稿
            </span>
          )}
        </div>
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
        
        {/* Table of contents only includes headings from the visible mdxSource */}
        <TableOfContents headings={getHeadings(mdxSource)} />
        
        <div className="article-body mt-10">{content}</div>
        
        {/* Render unlock card if not unlocked */}
        {!isUnlocked && (
          <UnlockCard articleId={article.id} slug={article.slug} />
        )}

        <CommentSection articleId={article.id} />
      </article>
      <div className="mx-auto max-w-6xl">
        <RelatedArticles articles={relatedArticles} />
      </div>
    </main>
  );
}

// Inline helper for client heading extraction in this scope to prevent breaking dependencies
function getHeadings(content: string) {
  return Array.from(content.matchAll(/^##\s+(.+)$/gm)).map((match) => {
    const text = match[1].trim();
    return {
      id: text.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-"),
      text,
    };
  });
}

