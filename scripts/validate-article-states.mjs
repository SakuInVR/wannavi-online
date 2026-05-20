import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const articleStatesPath = path.join(root, "content", "article-states.json");
const articlesDirectory = path.join(root, "content", "articles");

const allowedStates = new Set([
  "idea",
  "researched",
  "drafted",
  "reviewed",
  "monetized",
  "ready",
  "published",
  "verified",
  "improving",
]);

function fail(message) {
  console.error(`- ${message}`);
  return 1;
}

if (!fs.existsSync(articleStatesPath)) {
  console.error("content/article-states.json does not exist. Run npm run pipeline:sync first.");
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(articleStatesPath, "utf8"));
const articleSlugs = new Set(
  fs
    .readdirSync(articlesDirectory)
    .filter((filename) => filename.endsWith(".mdx"))
    .map((filename) => filename.replace(/\.mdx$/, "")),
);

let failures = 0;

if (payload.version !== 1) {
  failures += fail("article-states.json version must be 1");
}

if (!Array.isArray(payload.states)) {
  failures += fail("article-states.json states must be an array");
} else {
  const seen = new Set();

  for (const [index, state] of payload.states.entries()) {
    const label = `states[${index}]`;

    if (!state.slug || typeof state.slug !== "string") {
      failures += fail(`${label}: missing slug`);
      continue;
    }

    if (seen.has(state.slug)) {
      failures += fail(`${label}: duplicate slug "${state.slug}"`);
    }
    seen.add(state.slug);

    if (!articleSlugs.has(state.slug)) {
      failures += fail(`${label}: slug "${state.slug}" has no matching MDX article`);
    }

    if (!allowedStates.has(state.pipelineState)) {
      failures += fail(`${label}: invalid pipelineState "${state.pipelineState}"`);
    }

    if (!Array.isArray(state.blockers) || !Array.isArray(state.warnings)) {
      failures += fail(`${label}: blockers and warnings must be arrays`);
    }

    if (!Array.isArray(state.nextActions) || state.nextActions.length === 0) {
      failures += fail(`${label}: nextActions must be a non-empty array`);
    }

    if (state.pipelineState === "published" && state.blockers?.length > 0) {
      failures += fail(`${label}: published state cannot have blockers`);
    }

    if (state.affiliateIntent === "high" && state.pipelineState === "published") {
      const hasApprovedCreativeWarning = state.warnings?.some((warning) =>
        String(warning).includes("approved image ad creative"),
      );
      if (hasApprovedCreativeWarning) {
        failures += fail(`${label}: published high-intent article still lacks approved creative`);
      }
    }
  }

  for (const slug of articleSlugs) {
    if (!seen.has(slug)) {
      failures += fail(`article "${slug}" missing from article-states.json`);
    }
  }
}

if (failures > 0) {
  console.error(`Article state validation failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log(`Article state validation passed for ${payload.states.length} article state(s).`);
