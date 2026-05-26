import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const siteUrl = "https://www.wannavi.online";
const baseUrl = process.env.PRODUCTION_CONTENT_BASE_URL ?? siteUrl;
const articlesDirectory = path.join(root, "content", "articles");
const failures = [];

const creativesPath = path.join(root, "content", "ad-creatives.json");
const creatives = fs.existsSync(creativesPath) ? JSON.parse(fs.readFileSync(creativesPath, "utf8")) : [];
const articlesWithApprovedCreatives = new Set(
  creatives
    .filter((c) => c.status === "approved")
    .flatMap((c) => c.articleSlugs ?? [])
);

const articles = fs
  .readdirSync(articlesDirectory)
  .filter((filename) => filename.endsWith(".mdx"))
  .map((filename) => {
    const slug = filename.replace(/\.mdx$/, "");
    const source = fs.readFileSync(path.join(articlesDirectory, filename), "utf8");
    const { data, content } = matter(source);

    const hasApprovedCreative = articlesWithApprovedCreatives.has(slug);
    const requiresGoLink = source.includes("/go/") || (content.includes("ProductAd") && hasApprovedCreative);

    return {
      slug,
      title: String(data.title ?? ""),
      draft: Boolean(data.draft),
      requiresGoLink,
    };
  })
  .filter((article) => !article.draft);

if (articles.length === 0) {
  console.error("No published articles found.");
  process.exit(1);
}

async function checkArticle(article) {
  const url = new URL(`/articles/${article.slug}`, baseUrl);
  const response = await fetch(url);
  const body = await response.text();

  if (response.status !== 200) {
    failures.push(`${article.slug}: expected 200, got ${response.status}`);
    return;
  }

  if (!body.includes(article.title)) {
    failures.push(`${article.slug}: production page does not include the article title`);
  }

  if (!body.includes("google-adsense-account")) {
    failures.push(`${article.slug}: missing AdSense account meta on production page`);
  }

  if (article.requiresGoLink && !body.includes("/go/")) {
    failures.push(`${article.slug}: production page does not include a /go/ monetization link`);
  }
}

for (const article of articles) {
  await checkArticle(article);
}

const sitemapResponse = await fetch(new URL("/sitemap.xml", baseUrl));
const sitemap = await sitemapResponse.text();

if (sitemapResponse.status !== 200) {
  failures.push(`sitemap.xml: expected 200, got ${sitemapResponse.status}`);
} else {
  for (const article of articles) {
    const expectedUrl = `${siteUrl}/articles/${article.slug}`;
    if (!sitemap.includes(expectedUrl)) {
      failures.push(`${article.slug}: missing from production sitemap`);
    }
  }
}

if (failures.length > 0) {
  console.error("Production content check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Production content check passed for ${articles.length} published article(s).`);
