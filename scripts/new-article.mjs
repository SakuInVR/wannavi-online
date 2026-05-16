import fs from "node:fs";
import path from "node:path";

const categories = new Set(["ai-engineer", "dtm", "vr-creator"]);

function toSlug(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fallbackSlug() {
  return `article-${today()}`;
}

const [, , rawTitle, rawCategory = "ai-engineer", rawSlug] = process.argv;

if (!rawTitle) {
  console.error('Usage: npm run new:article -- "記事タイトル" ai-engineer optional-slug');
  process.exit(1);
}

if (!categories.has(rawCategory)) {
  console.error(`Unknown category: ${rawCategory}`);
  console.error(`Available categories: ${Array.from(categories).join(", ")}`);
  process.exit(1);
}

const slug = rawSlug ? toSlug(rawSlug) : toSlug(rawTitle) || fallbackSlug();

if (!slug) {
  console.error("Could not generate a valid slug.");
  process.exit(1);
}

const articlesDirectory = path.join(process.cwd(), "content", "articles");
const filePath = path.join(articlesDirectory, `${slug}.mdx`);

if (fs.existsSync(filePath)) {
  console.error(`Article already exists: ${filePath}`);
  process.exit(1);
}

const escapedTitle = rawTitle.replaceAll('"', '\\"');
const content = `---
title: "${escapedTitle}"
description: "この記事で解決する悩みを120文字以内で書く。"
category: "${rawCategory}"
publishedAt: "${today()}"
tags:
  - "初心者"
  - "ロードマップ"
affiliateIntent: "medium"
draft: true
---

導入文。読者の「なりたい」と「今つまずいていること」を最初に拾う。

PR表記、カテゴリ別CTA、記事下広告枠は記事ページ側で自動挿入されます。
\`affiliateIntent\` はサイト内の管理ラベルです。迷ったら \`CONTENT_GUIDE.md\` を見てください。

## この記事のゴール

- 読者ができるようになること
- 最初にそろえるもの
- 次に読む記事への導線

## 最初に必要なもの

<ToolRecommendation
  name="おすすめ道具名"
  reason="なぜ必要か。初心者にどう効くか。"
  priceHint="無料枠からでOK"
/>

## よくある挫折ポイント

ここに初心者が止まりやすいところを書く。

<AffiliateCTA
  title="関連する教材・機材・サービス"
  description="押し売りではなく、次の一歩に必要な選択肢として紹介する。"
  label="候補を見る"
/>

## 次にやること

今日やる具体的な1ステップを書く。
`;

fs.mkdirSync(articlesDirectory, { recursive: true });
fs.writeFileSync(filePath, content, "utf8");
console.log(`Created ${path.relative(process.cwd(), filePath)}`);
