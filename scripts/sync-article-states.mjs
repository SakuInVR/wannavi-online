import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const articlesDirectory = path.join(root, "content", "articles");
const researchDirectory = path.join(root, "research", "youtube");
const productsPath = path.join(root, "content", "affiliate-products.json");
const creativesPath = path.join(root, "content", "ad-creatives.json");
const outputPath = path.join(root, "content", "article-states.json");

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getResearchEntries() {
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
  if (!Array.isArray(sourceVideos)) {
    return false;
  }

  const urls = sourceVideos.map((url) => String(url).trim());
  return researchEntries.some((entry) => urls.every((url) => entry.urls.has(url)));
}

function bodyTextLength(content) {
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

function classifyArticle(article, context) {
  const blockers = [];
  const warnings = [];
  const nextActions = [];
  const { slug, data, content } = article;
  const intent = data.affiliateIntent ?? "medium";
  const usesVideoWorkflow = Array.isArray(data.sourceVideos);

  if (data.draft === true) {
    nextActions.push("Complete editorial review before monetization.");
    return { pipelineState: "drafted", blockers, warnings, nextActions };
  }

  if (usesVideoWorkflow) {
    if (data.sourceVideos.length !== 3) {
      blockers.push("Video workflow does not have exactly three source URLs.");
    }

    if (!hasMatchingResearch(data.sourceVideos, context.researchEntries)) {
      blockers.push("Source videos have no matching research/youtube JSON record.");
    }
  }

  if (blockers.length > 0) {
    nextActions.push("Repair research records before editorial review.");
    return { pipelineState: "drafted", blockers, warnings, nextActions };
  }

  if (bodyTextLength(content) < 1800) {
    warnings.push("Body is thin for evergreen search traffic.");
  }

  if (!hasDecisionAsset(content)) {
    warnings.push("Missing decision asset such as a table, checklist, recommendation, or product ad.");
  }

  if (warnings.length > 0) {
    nextActions.push("Strengthen editorial depth and decision support.");
    return { pipelineState: "researched", blockers, warnings, nextActions };
  }

  if (intent === "high" && !context.productArticleSlugs.has(slug)) {
    blockers.push("High-intent article has no affiliate product mapping.");
    nextActions.push("Find a matching ASP program and add a product mapping.");
    return { pipelineState: "reviewed", blockers, warnings, nextActions };
  }

  if (intent === "high" && !context.approvedCreativeArticleSlugs.has(slug)) {
    warnings.push("High-intent article has no approved image ad creative.");
    nextActions.push("Acquire approved image ad creative and place ProductAd.");
    return { pipelineState: "monetized", blockers, warnings, nextActions };
  }

  nextActions.push("Verify deployment and collect post-publish performance data.");
  return { pipelineState: "published", blockers, warnings, nextActions };
}

const products = readJson(productsPath);
const creatives = readJson(creativesPath);
const context = {
  researchEntries: getResearchEntries(),
  productArticleSlugs: new Set(products.flatMap((product) => product.articleSlugs ?? [])),
  approvedCreativeArticleSlugs: new Set(
    creatives
      .filter((creative) => creative.status === "approved")
      .flatMap((creative) => creative.articleSlugs ?? []),
  ),
};

const states = fs
  .readdirSync(articlesDirectory)
  .filter((filename) => filename.endsWith(".mdx"))
  .sort()
  .map((filename) => {
    const slug = filename.replace(/\.mdx$/, "");
    const source = fs.readFileSync(path.join(articlesDirectory, filename), "utf8");
    const { content, data } = matter(source);
    const classification = classifyArticle({ slug, data, content }, context);

    return {
      slug,
      title: data.title ?? slug,
      category: data.category ?? "unknown",
      affiliateIntent: data.affiliateIntent ?? "medium",
      mdxPath: `content/articles/${filename}`,
      sourceVideoCount: Array.isArray(data.sourceVideos) ? data.sourceVideos.length : 0,
      ...classification,
    };
  });

const payload = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source: "scripts/sync-article-states.mjs",
  states,
};

fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, outputPath)} with ${states.length} article state(s).`);
