import type { Article } from "@/lib/articles";
import { getCategory, siteConfig } from "@/lib/site";

export function articleJsonLd(article: Article) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    mainEntityOfPage: `${siteConfig.url}/articles/${article.slug}`,
    author: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    articleSection: article.categoryTitle,
    keywords: article.tags?.join(", "),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; href: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteConfig.url}${item.href}`,
    })),
  };
}

export function collectionPageJsonLd(categorySlug: string) {
  const category = getCategory(categorySlug);

  if (!category) {
    return undefined;
  }

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.title} | ${siteConfig.name}`,
    description: category.description,
    url: `${siteConfig.url}/categories/${category.slug}`,
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };
}
