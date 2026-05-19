import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const articlesDirectory = path.join(root, "content", "articles");

const requiredFiles = [
  "src/app/page.tsx",
  "src/app/articles/page.tsx",
  "src/app/categories/page.tsx",
  "src/app/tags/page.tsx",
  "src/app/tags/[tag]/page.tsx",
  "src/app/categories/[slug]/page.tsx",
  "src/app/articles/[slug]/page.tsx",
  "src/app/sitemap.ts",
  "src/app/robots.ts",
  "src/app/feed.xml/route.ts",
  "src/app/ads.txt/route.ts",
  "src/components/AffiliateCTA.tsx",
  "src/components/ToolRecommendation.tsx",
  "src/components/RelatedArticles.tsx",
  "src/components/TableOfContents.tsx",
  "src/components/AdSlot.tsx",
  "src/components/AdSenseScript.tsx",
  "src/components/AnalyticsScript.tsx",
  "src/components/DisclosureNote.tsx",
  "src/components/MonetizationPanel.tsx",
  "src/lib/monetization.ts",
  "src/lib/outbound-links.ts",
  "src/lib/structured-data.ts",
  "src/lib/analytics.ts",
  "src/app/go/[id]/route.ts",
  "src/app/about/page.tsx",
  "src/app/privacy/page.tsx",
  "src/app/contact/page.tsx",
  "src/app/disclosure/page.tsx",
  "scripts/smoke-site.mjs",
  "scripts/check-production.mjs",
  "scripts/report-content.mjs",
  "scripts/publish-article.mjs",
  "scripts/unpublish-article.mjs",
  "scripts/touch-article.mjs",
  ".env.example",
  "vercel.json",
  ".github/workflows/ci.yml",
  "LAUNCH_CHECKLIST.md",
  "CONTENT_GUIDE.md",
  "PROJECT_STATUS.md",
];

function getCategorySlugs() {
  const site = read("src/lib/site.ts");
  return [...site.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1]);
}

const categories = getCategorySlugs();
const minimumArticlesPerCategory = 4;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

const failures = [];

for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(root, file)), `Missing required file: ${file}`, failures);
}

const articleFiles = fs
  .readdirSync(articlesDirectory)
  .filter((filename) => filename.endsWith(".mdx"));

const counts = Object.fromEntries(categories.map((category) => [category, 0]));
const highIntentCounts = Object.fromEntries(categories.map((category) => [category, 0]));

for (const filename of articleFiles) {
  const source = fs.readFileSync(path.join(articlesDirectory, filename), "utf8");
  const { data } = matter(source);

  if (data.draft) {
    continue;
  }

  if (data.category in counts) {
    counts[data.category] += 1;
  }

  if (data.category in highIntentCounts && data.affiliateIntent === "high") {
    highIntentCounts[data.category] += 1;
  }
}

for (const category of categories) {
  assert(
    counts[category] >= minimumArticlesPerCategory,
    `Category ${category} has ${counts[category]} article(s); expected at least ${minimumArticlesPerCategory}`,
    failures,
  );
  assert(
    highIntentCounts[category] >= 1,
    `Category ${category} has no high affiliateIntent article`,
    failures,
  );
}

const layout = read("src/app/layout.tsx");
assert(layout.includes("AdSenseScript"), "Root layout does not include AdSenseScript", failures);
assert(layout.includes("AnalyticsScript"), "Root layout does not include AnalyticsScript", failures);
assert(layout.includes("application/rss+xml"), "Root metadata does not advertise RSS", failures);

const robots = read("src/app/robots.ts");
assert(robots.includes("/go/"), "robots.ts does not disallow outbound redirect routes", failures);

const articlePage = read("src/app/articles/[slug]/page.tsx");
assert(articlePage.includes("DisclosureNote"), "Article page does not auto-render disclosure", failures);
assert(articlePage.includes("TableOfContents"), "Article page does not auto-render table of contents", failures);
assert(articlePage.includes("MonetizationPanel"), "Article page does not auto-render monetization panel", failures);
assert(articlePage.includes("AdSlot"), "Article page does not auto-render ad slot", failures);
assert(articlePage.includes("articleJsonLd"), "Article page does not render Article JSON-LD", failures);
assert(articlePage.includes("breadcrumbJsonLd"), "Article page does not render breadcrumb JSON-LD", failures);
assert(articlePage.includes("/tags/"), "Article page does not link article tags to tag pages", failures);
assert(articlePage.includes("dynamicParams = false"), "Article page may allow non-generated draft routes", failures);
assert(articlePage.includes("article.draft"), "Article page does not block direct draft access", failures);

const articleCard = read("src/components/ArticleCard.tsx");
assert(articleCard.includes("/tags/"), "Article cards do not link tags to tag pages", failures);

const monetization = read("src/lib/monetization.ts");
assert(monetization.includes("outboundHref"), "Monetization offers do not use centralized outbound links", failures);

const outboundLinks = read("src/lib/outbound-links.ts");
assert(outboundLinks.includes("ai-tools"), "Outbound link registry is missing AI offer", failures);
assert(outboundLinks.includes("dtm-starter-kit"), "Outbound link registry is missing DTM offer", failures);
assert(outboundLinks.includes("vr-creator-kit"), "Outbound link registry is missing VR offer", failures);
assert(
  outboundLinks.includes("instrument-starter-kit"),
  "Outbound link registry is missing instrument player offer",
  failures,
);

const envExample = read(".env.example");
assert(envExample.includes("NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT"), ".env.example is missing AdSense variable", failures);
assert(envExample.includes("NEXT_PUBLIC_GA_MEASUREMENT_ID"), ".env.example is missing GA variable", failures);
assert(
  envExample.includes("NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION"),
  ".env.example is missing Search Console variable",
  failures,
);

const ci = read(".github/workflows/ci.yml");
const ciUsesPreflight = ci.includes("npm run preflight");
assert(
  ciUsesPreflight || ci.includes("npm run validate:content"),
  "CI does not validate content",
  failures,
);
assert(ciUsesPreflight || ci.includes("npm run lint"), "CI does not lint", failures);
assert(ciUsesPreflight || ci.includes("npm run build"), "CI does not build", failures);

if (failures.length > 0) {
  console.error("Site audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Site audit passed.");
console.log(`Articles: ${articleFiles.length}`);
for (const category of categories) {
  console.log(`${category}: ${counts[category]} article(s), ${highIntentCounts[category]} high-intent`);
}
