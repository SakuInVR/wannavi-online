import readingTime from "reading-time";
import { getCategory } from "@/lib/site";
import { getSupabaseAdmin } from "@/lib/supabase";

export type ArticleFrontmatter = {
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  updatedAt?: string;
  heroLabel?: string;
  tags?: string[];
  sourceVideos?: string[];
  affiliateIntent?: "low" | "medium" | "high";
  draft?: boolean;
};

export type Article = ArticleFrontmatter & {
  id: string;
  slug: string;
  body: string;
  readingMinutes: string;
  categoryTitle: string;
  headings: ArticleHeading[];
  userId?: string | null;
  isPrivate: boolean;
};

export type ArticleHeading = {
  id: string;
  text: string;
};

function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

function getHeadings(content: string): ArticleHeading[] {
  return Array.from(content.matchAll(/^##\s+(.+)$/gm)).map((match) => {
    const text = match[1].trim();

    return {
      id: slugifyHeading(text),
      text,
    };
  });
}

export async function getAllArticles(): Promise<Article[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return [];
  }

  const query = supabase
    .from("articles")
    .select("*, research_sources(url)")
    .eq("review_status", "approved")
    .eq("pipeline_state", "published");

  let { data: dbArticles, error } = await query
    .eq("is_private", false)
    .order("published_at", { ascending: false });

  if (error) {
    if (error.code === "42703") {
      console.warn("Column 'is_private' does not exist yet. Falling back to query without is_private filter.");
      const fallbackResult = await query.order("published_at", { ascending: false });
      dbArticles = fallbackResult.data;
      error = fallbackResult.error;
    }
  }

  if (error || !dbArticles) {
    console.error("Error fetching articles from Supabase:", error);
    return [];
  }

  return dbArticles.map((dbArticle) => {
    const sourceVideos = (dbArticle.research_sources || []).map((source: { url: string }) => source.url);
    const category = getCategory(dbArticle.category);

    return {
      id: dbArticle.id,
      slug: dbArticle.slug,
      title: dbArticle.title,
      description: dbArticle.description,
      category: dbArticle.category,
      publishedAt: dbArticle.published_at,
      updatedAt: dbArticle.updated_at || undefined,
      tags: dbArticle.tags || [],
      sourceVideos,
      affiliateIntent: dbArticle.affiliate_intent as "low" | "medium" | "high",
      draft: false,
      body: dbArticle.body || "",
      readingMinutes: readingTime(dbArticle.body || "").text,
      categoryTitle: category?.title ?? dbArticle.category,
      headings: getHeadings(dbArticle.body || ""),
      userId: dbArticle.user_id,
      isPrivate: dbArticle.is_private || false,
    };
  });
}

export async function getArticleBySlug(slug: string): Promise<Article> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const { data: dbArticle, error } = await supabase
    .from("articles")
    .select("*, research_sources(url)")
    .eq("slug", slug)
    .single();

  if (error || !dbArticle) {
    throw new Error(`Article not found with slug: ${slug}`);
  }

  const sourceVideos = (dbArticle.research_sources || []).map((source: { url: string }) => source.url);
  const category = getCategory(dbArticle.category);

  return {
    id: dbArticle.id,
    slug: dbArticle.slug,
    title: dbArticle.title,
    description: dbArticle.description,
    category: dbArticle.category,
    publishedAt: dbArticle.published_at,
    updatedAt: dbArticle.updated_at || undefined,
    tags: dbArticle.tags || [],
    sourceVideos,
    affiliateIntent: dbArticle.affiliate_intent as "low" | "medium" | "high",
    draft: dbArticle.review_status !== "approved" || dbArticle.pipeline_state !== "published",
    body: dbArticle.body || "",
    readingMinutes: readingTime(dbArticle.body || "").text,
    categoryTitle: category?.title ?? dbArticle.category,
    headings: getHeadings(dbArticle.body || ""),
    userId: dbArticle.user_id,
    isPrivate: dbArticle.is_private || false,
  };
}

export async function getArticlesByCategory(categorySlug: string): Promise<Article[]> {
  const articles = await getAllArticles();
  return articles.filter((article) => article.category === categorySlug);
}

export async function getRelatedArticles(article: Article, limit = 3): Promise<Article[]> {
  const articles = await getAllArticles();
  return articles
    .filter(
      (candidate) =>
        candidate.slug !== article.slug && candidate.category === article.category,
    )
    .slice(0, limit);
}

export async function getAllTags(): Promise<string[]> {
  const articles = await getAllArticles();
  const tagSet = new Set<string>();

  for (const article of articles) {
    for (const tag of article.tags ?? []) {
      tagSet.add(tag);
    }
  }

  return Array.from(tagSet).sort((a, b) => a.localeCompare(b, "ja"));
}

export async function getArticlesByTag(tag: string): Promise<Article[]> {
  const articles = await getAllArticles();
  return articles.filter((article) => article.tags?.includes(tag));
}
