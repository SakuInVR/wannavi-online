import fs from "node:fs";
import path from "node:path";

const categories = new Set(["ai-engineer", "dtm", "vr-creator", "instrument-player"]);

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
description: "この記事で解決する悩みを80文字前後で具体的に書く。"
category: "${rawCategory}"
publishedAt: "${today()}"
tags:
  - "初心者"
  - "ロードマップ"
affiliateIntent: "medium"
draft: true
sourceVideos:
  - "https://www.youtube.com/watch?v=REPLACE_ME_1"
  - "https://www.youtube.com/watch?v=REPLACE_ME_2"
  - "https://www.youtube.com/watch?v=REPLACE_ME_3"
---

この記事は動画リサーチ前提の下書きです。公開前に必ず次を完了してください。

- タイトルに合うYouTube動画3本を選ぶ
- \`npm run analyze:youtube\` で分析する
- \`research/youtube/\` に分析JSONを残す
- 本文末尾の \`## 参考にした視点\` を実URLで埋める
- 一般論ではなく、動画から見えた具体例を本文に入れる

## この記事のゴール

- 読者ができるようになること
- 最初にそろえるもの
- 今日やる1ステップ

## 動画から見えた具体例

3本の動画に共通していた具体例、作業画面、練習手順、失敗談をここに整理する。

## 初心者がつまずくポイント

読者が止まりやすい場面と、その場での判断基準を書く。

## 最初に必要なもの

<ToolRecommendation
  name="おすすめ道具名"
  reason="なぜ必要か。初心者にどう効くか。"
  priceHint="無料枠からでOK"
/>

## 買わなくていいもの、急がなくていいもの

読者が不安で買いすぎないように、後回しにできるものも書く。

<AffiliateCTA
  title="関連する教材・機材・サービス"
  description="押し売りではなく、次の一歩に必要な選択肢として紹介する。"
  label="候補を見る"
/>

## 今日やること

読者が今日できる具体的な1ステップを書く。

## 参考にした視点

- [動画1タイトル](https://www.youtube.com/watch?v=REPLACE_ME_1): 何を参考にしたか。
- [動画2タイトル](https://www.youtube.com/watch?v=REPLACE_ME_2): 何を参考にしたか。
- [動画3タイトル](https://www.youtube.com/watch?v=REPLACE_ME_3): 何を参考にしたか。
`;

fs.mkdirSync(articlesDirectory, { recursive: true });
fs.writeFileSync(filePath, content, "utf8");
console.log(`Created ${path.relative(process.cwd(), filePath)}`);
