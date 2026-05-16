import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";

import { getCategory } from "@/lib/site";

const articlesDirectory = path.join(process.cwd(), "content", "articles");

export type ArticleFrontmatter = {
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  updatedAt?: string;
  heroLabel?: string;
  tags?: string[];
  affiliateIntent?: "low" | "medium" | "high";
  draft?: boolean;
};

export type Article = ArticleFrontmatter & {
  slug: string;
  body: string;
  readingMinutes: string;
  categoryTitle: string;
  headings: ArticleHeading[];
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

function getArticleFilenames() {
  if (!fs.existsSync(articlesDirectory)) {
    return [];
  }

  return fs
    .readdirSync(articlesDirectory)
    .filter((filename) => filename.endsWith(".mdx"));
}

export function getAllArticles(): Article[] {
  return getArticleFilenames()
    .map((filename) => getArticleBySlug(filename.replace(/\.mdx$/, "")))
    .filter((article) => !article.draft)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
}

export function getArticleBySlug(slug: string): Article {
  const filePath = path.join(articlesDirectory, `${slug}.mdx`);
  const source = fs.readFileSync(filePath, "utf8");
  const { content, data } = matter(source);
  const frontmatter = data as ArticleFrontmatter;
  const category = getCategory(frontmatter.category);

  return {
    ...frontmatter,
    slug,
    body: content,
    readingMinutes: readingTime(content).text,
    categoryTitle: category?.title ?? frontmatter.category,
    headings: getHeadings(content),
  };
}

export function getArticlesByCategory(categorySlug: string) {
  return getAllArticles().filter((article) => article.category === categorySlug);
}

export function getRelatedArticles(article: Article, limit = 3) {
  return getAllArticles()
    .filter(
      (candidate) =>
        candidate.slug !== article.slug && candidate.category === article.category,
    )
    .slice(0, limit);
}

export function getAllTags() {
  const tagSet = new Set<string>();

  for (const article of getAllArticles()) {
    for (const tag of article.tags ?? []) {
      tagSet.add(tag);
    }
  }

  return Array.from(tagSet).sort((a, b) => a.localeCompare(b, "ja"));
}

export function getArticlesByTag(tag: string) {
  return getAllArticles().filter((article) => article.tags?.includes(tag));
}
