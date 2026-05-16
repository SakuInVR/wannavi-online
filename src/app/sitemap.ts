import type { MetadataRoute } from "next";

import { getAllArticles, getAllTags } from "@/lib/articles";
import { categories, siteConfig, staticPages } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const categoryRoutes = categories.map((category) => ({
    url: `${siteConfig.url}/categories/${category.slug}`,
    lastModified: now,
  }));
  const articleRoutes = getAllArticles().map((article) => ({
    url: `${siteConfig.url}/articles/${article.slug}`,
    lastModified: new Date(article.updatedAt ?? article.publishedAt),
  }));
  const tagRoutes = getAllTags().map((tag) => ({
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
