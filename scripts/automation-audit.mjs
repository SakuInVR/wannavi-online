import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const articlesDirectory = path.join(root, "content", "articles");
const researchDirectory = path.join(root, "research", "youtube");
const affiliateProductsPath = path.join(root, "content", "affiliate-products.json");
const adCreativesPath = path.join(root, "content", "ad-creatives.json");

const mojibakePattern =
  /(?:縺|繧|譁|螟|髫|蜊|蛻|謗|蟆|鬆|荳|豁ｩ|逕|陦|隱|邱|霑|驕|繝|�)/;
const readerScenarioPattern =
  /(最初|はじめ|始め|買う前|選ぶ|迷|今日|1日目|一歩|失敗|チェック|判断|比較|予算|向いて)/;
const internalLeakPattern =
  /(収益導線\s*:|affiliateIntent|reviewStatus|system note|internal note)/i;
const videoMetaPhrasePattern =
  /(動画を見たところ|参照した動画|YouTubeで見た|YouTubeで確認した|動画を分析した)/;

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(filePath, label, blockers) {
  if (!fs.existsSync(filePath)) {
    blockers.push(`${label}: file is missing`);
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    blockers.push(`${label}: invalid JSON (${error.message})`);
    return [];
  }
}

function getCategorySlugs() {
  const site = readText("src/lib/site.ts");
  return [...site.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1]);
}

function hasMojibake(value) {
  return typeof value === "string" && mojibakePattern.test(value);
}

function textLength(content) {
  return content.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length;
}

function hasDecisionAsset(content) {
  return (
    /^\|.+\|$/m.test(content) ||
    /^-\s+\[[ x]\]/m.test(content) ||
    /<ToolRecommendation\b/.test(content) ||
    /<ProductAd\b/.test(content)
  );
}

function collectResearchKeys() {
  if (!fs.existsSync(researchDirectory)) {
    return [];
  }

  return fs
    .readdirSync(researchDirectory)
    .filter((filename) => filename.endsWith(".json"))
    .map((filename) => {
      const filePath = path.join(researchDirectory, filename);
      try {
        const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
        return {
          filename,
          urls: new Set((payload.videos ?? []).map((video) => String(video.url).trim())),
        };
      } catch {
        return { filename, urls: new Set(), invalid: true };
      }
    });
}

function hasMatchingResearch(sourceVideos, researchEntries) {
  if (!Array.isArray(sourceVideos) || sourceVideos.length === 0) {
    return false;
  }

  const urls = sourceVideos.map((url) => String(url).trim());
  return researchEntries.some((entry) => urls.every((url) => entry.urls.has(url)));
}

function auditPublicText(blockers) {
  const files = [
    "src/lib/site.ts",
    "src/app/page.tsx",
    "src/app/about/page.tsx",
    "src/app/privacy/page.tsx",
    "src/app/contact/page.tsx",
    "src/app/disclosure/page.tsx",
  ];

  for (const relativePath of files) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const source = fs.readFileSync(absolutePath, "utf8");
    if (hasMojibake(source)) {
      blockers.push(`${relativePath}: public-facing text contains mojibake`);
    }
  }
}

function auditArticles(blockers, warnings) {
  const categorySlugs = new Set(getCategorySlugs());
  const researchEntries = collectResearchKeys();
  const products = readJson(affiliateProductsPath, "content/affiliate-products.json", blockers);
  const creatives = readJson(adCreativesPath, "content/ad-creatives.json", blockers);
  const productArticleSlugs = new Set(
    products.flatMap((product) => product.articleSlugs ?? []),
  );
  const creativeArticleSlugs = new Set(
    creatives
      .filter((creative) => creative.status === "approved")
      .flatMap((creative) => creative.articleSlugs ?? []),
  );

  if (!fs.existsSync(articlesDirectory)) {
    blockers.push("content/articles: directory is missing");
    return { total: 0, published: 0, highIntent: 0 };
  }

  const articleFiles = fs
    .readdirSync(articlesDirectory)
    .filter((filename) => filename.endsWith(".mdx"));

  let published = 0;
  let highIntent = 0;

  for (const filename of articleFiles) {
    const slug = filename.replace(/\.mdx$/, "");
    const source = fs.readFileSync(path.join(articlesDirectory, filename), "utf8");
    const { content, data } = matter(source);
    const isDraft = data.draft === true;

    if (isDraft) {
      continue;
    }

    published += 1;

    if (hasMojibake(source)) {
      blockers.push(`${filename}: published article contains mojibake`);
    }

    if (internalLeakPattern.test(content)) {
      blockers.push(`${filename}: leaks internal monetization or review metadata`);
    }

    if (videoMetaPhrasePattern.test(content)) {
      warnings.push(`${filename}: reader-facing prose mentions video research process`);
    }

    if (!data.title || !data.description || !data.publishedAt) {
      blockers.push(`${filename}: missing required frontmatter`);
    }

    if (!categorySlugs.has(data.category)) {
      blockers.push(`${filename}: unknown category "${data.category}"`);
    }

    if (textLength(content) < 1800) {
      warnings.push(`${filename}: body is thin for an evergreen SEO article`);
    }

    if (!readerScenarioPattern.test(content.slice(0, 900))) {
      warnings.push(`${filename}: opening lacks a concrete reader scenario`);
    }

    if (!hasDecisionAsset(content)) {
      warnings.push(`${filename}: missing table, checklist, tool recommendation, or product ad`);
    }

    if (Array.isArray(data.sourceVideos)) {
      if (data.sourceVideos.length !== 3) {
        blockers.push(`${filename}: sourceVideos must contain exactly three URLs`);
      }

      if (!hasMatchingResearch(data.sourceVideos, researchEntries)) {
        blockers.push(`${filename}: sourceVideos have no matching research/youtube record`);
      }
    }

    if (data.affiliateIntent === "high") {
      highIntent += 1;

      if (!productArticleSlugs.has(slug)) {
        blockers.push(`${filename}: high-intent article has no affiliate product mapping`);
      }

      if (!creativeArticleSlugs.has(slug)) {
        warnings.push(`${filename}: high-intent article has no approved image ad creative`);
      }
    }
  }

  return { total: articleFiles.length, published, highIntent };
}

function auditMonetizationData(blockers, warnings) {
  const products = readJson(affiliateProductsPath, "content/affiliate-products.json", blockers);
  const creatives = readJson(adCreativesPath, "content/ad-creatives.json", blockers);

  for (const product of products) {
    const label = `affiliate product "${product.id ?? "unknown"}"`;

    if (hasMojibake(JSON.stringify(product))) {
      blockers.push(`${label}: contains mojibake`);
    }

    if (!product.id || !product.label || !product.envKey || !product.category) {
      blockers.push(`${label}: missing id, label, envKey, or category`);
    }

    if (!Array.isArray(product.articleSlugs) || product.articleSlugs.length === 0) {
      warnings.push(`${label}: not mapped to any article`);
    }
  }

  for (const creative of creatives) {
    const label = `ad creative "${creative.id ?? "unknown"}"`;

    if (hasMojibake(JSON.stringify(creative))) {
      blockers.push(`${label}: contains mojibake`);
    }

    if (creative.status === "approved") {
      for (const field of ["clickUrl", "imageUrl", "imageAlt"]) {
        if (!creative[field]) {
          blockers.push(`${label}: approved creative missing ${field}`);
        }
      }
    }
  }
}

const blockers = [];
const warnings = [];

auditPublicText(blockers);
const articleSummary = auditArticles(blockers, warnings);
auditMonetizationData(blockers, warnings);

console.log("Automation system audit");
console.log("=======================");
console.log(`Articles: ${articleSummary.published}/${articleSummary.total} published`);
console.log(`High-intent articles: ${articleSummary.highIntent}`);
console.log("");

if (blockers.length > 0) {
  console.log("Blockers");
  for (const blocker of blockers) {
    console.log(`- ${blocker}`);
  }
  console.log("");
}

if (warnings.length > 0) {
  console.log("Warnings");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
  console.log("");
}

if (blockers.length > 0) {
  console.error(`Automation audit failed with ${blockers.length} blocker(s).`);
  process.exit(1);
}

console.log(`Automation audit passed with ${warnings.length} warning(s).`);
