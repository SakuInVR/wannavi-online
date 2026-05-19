import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const articlesDirectory = path.join(root, "content", "articles");
const productsPath = path.join(root, "content", "affiliate-products.json");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function getCategorySlugs() {
  const site = read("src/lib/site.ts");
  return [...site.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1]);
}

function getArticles() {
  return fs
    .readdirSync(articlesDirectory)
    .filter((filename) => filename.endsWith(".mdx"))
    .map((filename) => {
      const source = fs.readFileSync(path.join(articlesDirectory, filename), "utf8");
      const { data } = matter(source);

      return {
        slug: filename.replace(/\.mdx$/, ""),
        title: data.title,
        category: data.category,
        intent: data.affiliateIntent ?? "medium",
        draft: data.draft === true,
      };
    });
}

function getProducts() {
  if (!fs.existsSync(productsPath)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(productsPath, "utf8"));
}

const categories = getCategorySlugs();
const articles = getArticles();
const published = articles.filter((article) => !article.draft);
const products = getProducts();
const productSlugs = new Set(
  products.flatMap((product) => product.articleSlugs ?? []),
);

console.log("Next action report");
console.log("==================");
console.log("");

for (const category of categories) {
  const categoryArticles = published.filter((article) => article.category === category);
  const highIntent = categoryArticles.filter((article) => article.intent === "high");
  const productBacked = categoryArticles.filter((article) =>
    productSlugs.has(article.slug),
  );

  console.log(`${category}`);
  console.log(`  published: ${categoryArticles.length}`);
  console.log(`  high-intent: ${highIntent.length}`);
  console.log(`  product-backed: ${productBacked.length}`);

  if (categoryArticles.length < 6) {
    console.log("  next: add 2+ supporting articles to make the category feel deeper.");
  } else if (productBacked.length === 0) {
    console.log("  next: find one ASP product and map it to the highest-intent article.");
  } else if (productBacked.length < Math.min(3, highIntent.length)) {
    console.log("  next: add product-specific links for more high-intent articles.");
  } else {
    console.log("  next: rewrite titles/descriptions based on Search Console data.");
  }

  const unmappedHighIntent = highIntent.filter((article) => !productSlugs.has(article.slug));
  if (unmappedHighIntent.length > 0) {
    console.log("  product link candidates:");
    for (const article of unmappedHighIntent.slice(0, 3)) {
      console.log(`    - ${article.slug}: ${article.title}`);
    }
  }

  console.log("");
}

if (products.length === 0) {
  console.log("No affiliate products are registered yet.");
} else {
  console.log("Registered affiliate products");
  for (const product of products) {
    console.log(
      `- ${product.id} (${product.asp ?? "other"}): ${(product.articleSlugs ?? []).length} article(s)`,
    );
  }
}
