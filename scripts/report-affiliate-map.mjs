import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const articlesDirectory = path.join(root, "content", "articles");

const categoryMap = {
  "ai-engineer": {
    goPath: "/go/ai-tools",
    envKey: "AFFILIATE_AI_TOOLS_URL",
    aspHint: "AI school, programming course, AI tool, cloud learning service",
  },
  dtm: {
    goPath: "/go/dtm-starter-kit",
    envKey: "AFFILIATE_DTM_STARTER_KIT_URL",
    aspHint: "DTM gear, audio interface, MIDI keyboard, headphone, music lesson",
  },
  "vr-creator": {
    goPath: "/go/vr-creator-kit",
    envKey: "AFFILIATE_VR_CREATOR_KIT_URL",
    aspHint: "VR headset, gaming PC, avatar creation tool, Unity learning service",
  },
  "instrument-player": {
    goPath: "/go/instrument-starter-kit",
    envKey: "AFFILIATE_INSTRUMENT_STARTER_KIT_URL",
    aspHint: "instrument starter set, music lesson, tuner, stand, score app",
  },
};

const buckets = Object.fromEntries(
  Object.entries(categoryMap).map(([category, config]) => [
    category,
    {
      ...config,
      total: 0,
      high: 0,
      medium: 0,
      low: 0,
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
  const filePath = path.join(articlesDirectory, filename);
  const source = fs.readFileSync(filePath, "utf8");
  const { data } = matter(source);
  const category = data.category;
  const bucket = buckets[category];

  if (!bucket) {
    continue;
  }

  const intent = data.draft === true ? "draft" : data.affiliateIntent ?? "medium";
  bucket.total += 1;
  bucket[intent] += 1;
  bucket.articles.push({
    slug: filename.replace(/\.mdx$/, ""),
    title: data.title,
    intent,
  });
}

console.log("Affiliate article map");
console.log("=====================");
console.log("");
console.log("Set these Vercel Production environment variables with ASP URLs.");
console.log("Use high-intent articles first when choosing the strongest program.");

for (const [category, bucket] of Object.entries(buckets)) {
  console.log("");
  console.log(`${category}`);
  console.log("-".repeat(category.length));
  console.log(`go path: ${bucket.goPath}`);
  console.log(`env key: ${bucket.envKey}`);
  console.log(`ASP search hint: ${bucket.aspHint}`);
  console.log(
    `articles: ${bucket.total} total / ${bucket.high} high / ${bucket.medium} medium / ${bucket.low} low / ${bucket.draft} draft`,
  );

  for (const article of bucket.articles) {
    console.log(`  - [${article.intent}] ${article.slug}: ${article.title}`);
  }
}
