import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const articlesDirectory = path.join(process.cwd(), "content", "articles");
const allowedAffiliateIntents = new Set(["low", "medium", "high"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function getCategorySlugs() {
  const site = read("src/lib/site.ts");
  return [...site.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1]);
}

const allowedCategories = new Set(getCategorySlugs());

function fail(message) {
  console.error(`- ${message}`);
  return 1;
}

function validateArticle(filename) {
  const filePath = path.join(articlesDirectory, filename);
  const source = fs.readFileSync(filePath, "utf8");
  const { content, data } = matter(source);
  let failures = 0;

  if (!data.title || typeof data.title !== "string") {
    failures += fail(`${filename}: missing title`);
  }

  if (!data.description || typeof data.description !== "string") {
    failures += fail(`${filename}: missing description`);
  } else if (data.description.length > 140) {
    failures += fail(`${filename}: description should be 140 characters or less`);
  }

  if (!allowedCategories.has(data.category)) {
    failures += fail(`${filename}: unknown category "${data.category}"`);
  }

  if (!data.publishedAt || !datePattern.test(String(data.publishedAt))) {
    failures += fail(`${filename}: publishedAt must be YYYY-MM-DD`);
  }

  if (
    data.affiliateIntent &&
    !allowedAffiliateIntents.has(data.affiliateIntent)
  ) {
    failures += fail(`${filename}: affiliateIntent must be low, medium, or high`);
  }

  if (data.draft && data.affiliateIntent === "high") {
    failures += fail(`${filename}: draft articles should not use affiliateIntent high`);
  }

  if (!Array.isArray(data.tags) || data.tags.length === 0) {
    failures += fail(`${filename}: tags must include at least one tag`);
  }

  const bodyText = content
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, "");
  const h2Count = Array.from(content.matchAll(/^##\s+.+$/gm)).length;

  if (!data.draft && bodyText.length < 220) {
    failures += fail(`${filename}: body is too short for an indexable article`);
  }

  if (!data.draft && h2Count < 2) {
    failures += fail(`${filename}: published articles should include at least two h2 sections`);
  }

  return failures;
}

if (!fs.existsSync(articlesDirectory)) {
  console.error("content/articles does not exist");
  process.exit(1);
}

const filenames = fs
  .readdirSync(articlesDirectory)
  .filter((filename) => filename.endsWith(".mdx"));

if (filenames.length === 0) {
  console.error("No MDX articles found");
  process.exit(1);
}

const failureCount = filenames.reduce(
  (count, filename) => count + validateArticle(filename),
  0,
);

if (failureCount > 0) {
  console.error(`Content validation failed with ${failureCount} issue(s).`);
  process.exit(1);
}

console.log(`Content validation passed for ${filenames.length} article(s).`);
