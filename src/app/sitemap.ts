import type { MetadataRoute } from "next";

import { getAllArticles, getAllTags } from "@/lib/articles";
import { categories, siteConfig, staticPages } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const categoryRoutes = categories.map((category) => ({
    url: `${siteConfig.url}/categories/${category.slug}`,
    lastModified: now,
  }));
  const articles = await getAllArticles();
  const articleRoutes = articles.map((article) => ({
    url: `${siteConfig.url}/articles/${article.slug}`,
    lastModified: new Date(article.updatedAt ?? article.publishedAt),
  }));
  const tags = await getAllTags();
  const tagRoutes = tags.map((tag) => ({
    url: `${siteConfig.url}/tags/${encodeURIComponent(tag)}`,
    lastModified: now,
  }));
  const staticRoutes = staticPages.map((page) => ({
    url: `${siteConfig.url}${page.href}`,
    lastModified: now,
  }));

  return [
    {
      url: siteConfig.url,
      lastModified: now,
    },
    {
      url: `${siteConfig.url}/articles`,
      lastModified: now,
    },
    {
      url: `${siteConfig.url}/categories`,
      lastModified: now,
    },
    {
      url: `${siteConfig.url}/tags`,
      lastModified: now,
    },
    {
      url: `${siteConfig.url}/feed.xml`,
      lastModified: now,
    },
    {
      url: `${siteConfig.url}/ads.txt`,
      lastModified: now,
    },
    ...staticRoutes,
    ...categoryRoutes,
    ...articleRoutes,
    ...tagRoutes,
  ];
}
