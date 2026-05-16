import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const [, , slug] = process.argv;

if (!slug) {
  console.error("Usage: npm run unpublish:article -- article-slug");
  process.exit(1);
}

const filePath = path.join(process.cwd(), "content", "articles", `${slug}.mdx`);

if (!fs.existsSync(filePath)) {
  console.error(`Article not found: ${filePath}`);
  process.exit(1);
}

const source = fs.readFileSync(filePath, "utf8");
const parsed = matter(source);

parsed.data.draft = true;
parsed.data.updatedAt = new Date().toISOString().slice(0, 10);

const updated = matter.stringify(parsed.content.trimStart(), parsed.data, {
  lineWidth: -1,
});

fs.writeFileSync(filePath, updated, "utf8");
console.log(`Unpublished content/articles/${slug}.mdx`);
