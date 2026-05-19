import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const productPath = path.join(root, "content/affiliate-products.json");
const allowedCategories = new Set([
  "ai-engineer",
  "dtm",
  "vr-creator",
  "instrument-player",
  "video-creator",
  "general",
]);
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const envPattern = /^AFFILIATE_[A-Z0-9_]+_URL$/;

function fail(message) {
  console.error(`- ${message}`);
  return 1;
}

if (!fs.existsSync(productPath)) {
  console.error("content/affiliate-products.json does not exist");
  process.exit(1);
}

let products;

try {
  products = JSON.parse(fs.readFileSync(productPath, "utf8"));
} catch (error) {
  console.error(`content/affiliate-products.json is not valid JSON: ${error.message}`);
  process.exit(1);
}

if (!Array.isArray(products)) {
  console.error("content/affiliate-products.json must be an array");
  process.exit(1);
}

let failures = 0;
const ids = new Set();

for (const [index, product] of products.entries()) {
  const label = `product[${index}]`;

  if (!product || typeof product !== "object") {
    failures += fail(`${label}: must be an object`);
    continue;
  }

  if (!product.id || typeof product.id !== "string" || !idPattern.test(product.id)) {
    failures += fail(`${label}: id must be kebab-case ASCII`);
  } else if (ids.has(product.id)) {
    failures += fail(`${label}: duplicate id "${product.id}"`);
  } else {
    ids.add(product.id);
  }

  if (!product.label || typeof product.label !== "string") {
    failures += fail(`${label}: missing label`);
  }

  if (!product.envKey || typeof product.envKey !== "string" || !envPattern.test(product.envKey)) {
    failures += fail(`${label}: envKey must look like AFFILIATE_EXAMPLE_URL`);
  } else {
    // Multiple product cards may intentionally share one category-level ASP URL
    // until a product-specific campaign URL is available.
  }

  if (!allowedCategories.has(product.category)) {
    failures += fail(`${label}: unknown category "${product.category}"`);
  }

  if (product.asp && !["a8", "moshimo", "valuecommerce", "other"].includes(product.asp)) {
    failures += fail(`${label}: asp must be a8, moshimo, valuecommerce, or other`);
  }

  if (product.articleSlugs && !Array.isArray(product.articleSlugs)) {
    failures += fail(`${label}: articleSlugs must be an array when present`);
  }
}

if (failures > 0) {
  console.error(`Affiliate product validation failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log(`Affiliate product validation passed for ${products.length} product(s).`);
