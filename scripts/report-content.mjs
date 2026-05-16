import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const articlesDirectory = path.join(process.cwd(), "content", "articles");
const categories = ["ai-engineer", "dtm", "vr-creator"];

const report = Object.fromEntries(
  categories.map((category) => [
    category,
    {
      total: 0,
      low: 0,
      medium: 0,
      high: 0,
      draft: 0,
      articles: [],
    },
  ]),
);

const files = fs
  .readdirSync(articlesDirectory)
  .filter((filename) => filename.endsWith(".mdx"))
  .sort();

for (const filename of files) {
  const source = fs.readFileSync(path.join(articlesDirectory, filename), "utf8");
  const { data } = matter(source);
  const category = data.category;
  const intent = data.affiliateIntent ?? "medium";
  const isDraft = data.draft === true;

  if (!report[category]) {
    continue;
  }

  report[category].total += 1;
  if (isDraft) {
    report[category].draft += 1;
  } else {
    report[category][intent] += 1;
  }
  report[category].articles.push({
    slug: filename.replace(/\.mdx$/, ""),
    title: data.title,
    intent: isDraft ? "draft" : intent,
  });
}

console.log("Content report");
console.log("==============");

for (const category of categories) {
  const section = report[category];
  console.log("");
  console.log(`${category}: ${section.total} article(s)`);
  console.log(`  low: ${section.low}`);
  console.log(`  medium: ${section.medium}`);
  console.log(`  high: ${section.high}`);
  console.log(`  draft: ${section.draft}`);

  for (const article of section.articles) {
    console.log(`  - [${article.intent}] ${article.slug}: ${article.title}`);
  }
}
