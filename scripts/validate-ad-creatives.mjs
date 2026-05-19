import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const creativePath = path.join(root, "content", "ad-creatives.json");
const productPath = path.join(root, "content", "affiliate-products.json");
const articleDirectory = path.join(root, "content", "articles");

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const statuses = new Set(["candidate", "applied", "approved", "rejected"]);
const asps = new Set(["a8", "moshimo", "valuecommerce", "other"]);

function fail(message) {
  console.error(`- ${message}`);
  return 1;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

if (!fs.existsSync(creativePath)) {
  console.error("content/ad-creatives.json does not exist");
  process.exit(1);
}

const products = fs.existsSync(productPath) ? readJson(productPath) : [];
const productIds = new Set(products.map((product) => product.id));
const articleSlugs = new Set(
  fs
    .readdirSync(articleDirectory)
    .filter((filename) => filename.endsWith(".mdx"))
    .map((filename) => filename.replace(/\.mdx$/, "")),
);

let creatives;

try {
  creatives = readJson(creativePath);
} catch (error) {
  console.error(`content/ad-creatives.json is not valid JSON: ${error.message}`);
  process.exit(1);
}

if (!Array.isArray(creatives)) {
  console.error("content/ad-creatives.json must be an array");
  process.exit(1);
}

let failures = 0;
const ids = new Set();

for (const [index, creative] of creatives.entries()) {
  const label = `creative[${index}]`;

  if (!creative || typeof creative !== "object") {
    failures += fail(`${label}: must be an object`);
    continue;
  }

  if (!creative.id || typeof creative.id !== "string" || !idPattern.test(creative.id)) {
    failures += fail(`${label}: id must be kebab-case ASCII`);
  } else if (ids.has(creative.id)) {
    failures += fail(`${label}: duplicate id "${creative.id}"`);
  } else {
    ids.add(creative.id);
  }

  if (!productIds.has(creative.productId)) {
    failures += fail(`${label}: unknown productId "${creative.productId}"`);
  }

  if (!creative.title || typeof creative.title !== "string") {
    failures += fail(`${label}: missing title`);
  }

  if (!creative.description || typeof creative.description !== "string") {
    failures += fail(`${label}: missing description`);
  }

  if (!asps.has(creative.asp)) {
    failures += fail(`${label}: asp must be a8, moshimo, valuecommerce, or other`);
  }

  if (!statuses.has(creative.status)) {
    failures += fail(`${label}: status must be candidate, applied, approved, or rejected`);
  }

  if (!Array.isArray(creative.articleSlugs) || creative.articleSlugs.length === 0) {
    failures += fail(`${label}: articleSlugs must be a non-empty array`);
  } else {
    for (const slug of creative.articleSlugs) {
      if (!articleSlugs.has(slug)) {
        failures += fail(`${label}: unknown article slug "${slug}"`);
      }
    }
  }

  if (creative.status === "approved") {
    if (!creative.imageUrl) {
      failures += fail(`${label}: approved creative must have imageUrl`);
    }

    if (!creative.imageAlt) {
      failures += fail(`${label}: approved creative must have imageAlt`);
    }
  }

  if (creative.imageUrl) {
    try {
      const parsed = new URL(creative.imageUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        failures += fail(`${label}: imageUrl must use http or https`);
      }
    } catch {
      failures += fail(`${label}: imageUrl must be a valid URL`);
    }
  }
}

if (failures > 0) {
  console.error(`Ad creative validation failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log(`Ad creative validation passed for ${creatives.length} creative(s).`);
