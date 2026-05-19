import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baseUrl = process.env.ADSENSE_BASE_URL || "https://www.wannavi.online";
const failures = [];
const warnings = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function warn(condition, message) {
  if (!condition) {
    warnings.push(message);
  }
}

function stripFrontmatter(text) {
  return text.replace(/^---[\s\S]*?---\s*/, "");
}

function frontmatterValue(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, "m"));
  return match?.[1]?.trim();
}

function hasMojibake(text) {
  return /縺|繧|繝|譁|蜿|蛟|谺|隕|辟|驕|蟆|荳|蛻|蠎|謗|逶|霑/.test(text);
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: "follow" });
  const text = await response.text();
  return { response, text };
}

const articleDir = path.join(root, "content", "articles");
const articles = fs
  .readdirSync(articleDir)
  .filter((file) => file.endsWith(".mdx"))
  .map((file) => {
    const relativePath = path.join("content", "articles", file);
    const text = read(relativePath);
    const body = stripFrontmatter(text);
    return {
      file,
      text,
      body,
      category: frontmatterValue(text, "category"),
      intent: frontmatterValue(text, "affiliateIntent"),
      draft: frontmatterValue(text, "draft") === "true",
      chars: body.replace(/\s/g, "").length,
      h2: body.match(/^## /gm)?.length ?? 0,
    };
  });

const published = articles.filter((article) => !article.draft);
function getCategorySlugs() {
  const site = read("src/lib/site.ts");
  return [...site.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1]);
}

const categories = getCategorySlugs();

assert(published.length >= 15, `Published article count is ${published.length}; expected at least 15.`);

for (const category of categories) {
  const categoryArticles = published.filter((article) => article.category === category);
  const highIntent = categoryArticles.filter((article) => article.intent === "high");
  assert(categoryArticles.length >= 4, `${category} has ${categoryArticles.length} article(s); expected at least 4.`);
  assert(highIntent.length >= 1, `${category} has no high-intent article.`);
}

for (const article of published) {
  assert(article.chars >= 800, `${article.file} is thin (${article.chars} chars); expected at least 800.`);
  assert(article.h2 >= 3, `${article.file} has ${article.h2} h2 heading(s); expected at least 3.`);
  assert(!hasMojibake(article.text), `${article.file} contains mojibake-looking text.`);
}

const fixedPages = [
  "src/app/about/page.tsx",
  "src/app/privacy/page.tsx",
  "src/app/contact/page.tsx",
  "src/app/disclosure/page.tsx",
];

for (const fixedPage of fixedPages) {
  const text = read(fixedPage);
  assert(!hasMojibake(text), `${fixedPage} contains mojibake-looking text.`);
  assert(text.length >= 600, `${fixedPage} is too short for a trust page.`);
}

const privacy = read("src/app/privacy/page.tsx");
assert(privacy.includes("Google Analytics"), "Privacy page does not mention Google Analytics.");
assert(privacy.includes("Google AdSense"), "Privacy page does not mention Google AdSense.");
assert(privacy.includes("Cookie"), "Privacy page does not mention Cookie usage.");

const disclosure = read("src/app/disclosure/page.tsx");
assert(disclosure.includes("アフィリエイト"), "Disclosure page does not mention affiliate links.");
assert(disclosure.includes("PR"), "Disclosure page does not mention PR labeling.");

assert(
  fs.existsSync(path.join(root, "public", "google2113cf3ce542cca7.html")),
  "Google Search Console verification HTML file is missing.",
);

const outboundLinks = read("src/lib/outbound-links.ts");
warn(
  outboundLinks.includes("envKey:"),
  "Outbound links should be managed by affiliate URL environment variables.",
);

const siteConfig = read("src/lib/site.ts");
assert(
  siteConfig.includes("ca-pub-9852760004523512"),
  "siteConfig.adsenseClient does not contain the current AdSense publisher ID.",
);

const publicChecks = [
  "/",
  "/articles",
  "/about",
  "/privacy",
  "/contact",
  "/disclosure",
  "/sitemap.xml",
  "/robots.txt",
  "/feed.xml",
  "/ads.txt",
  "/google2113cf3ce542cca7.html",
];

for (const route of publicChecks) {
  try {
    const { response, text } = await fetchText(`${baseUrl}${route}`);
    assert(response.ok, `${route} returned HTTP ${response.status}.`);
    assert(!hasMojibake(text), `${route} contains mojibake-looking text.`);
  } catch (error) {
    failures.push(`${route} fetch failed: ${error.message}`);
  }
}

try {
  const { text } = await fetchText(`${baseUrl}/`);
  assert(text.includes("G-GKHT28VF83"), "Production homepage does not include the GA4 measurement ID.");
} catch (error) {
  failures.push(`GA4 production check failed: ${error.message}`);
}

if (warnings.length > 0) {
  console.warn("AdSense readiness warnings:");
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (failures.length > 0) {
  console.error("AdSense readiness check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`AdSense readiness check passed for ${published.length} published article(s).`);
console.log(`Checked production URL: ${baseUrl}`);
