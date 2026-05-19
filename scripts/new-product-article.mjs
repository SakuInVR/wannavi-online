import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const articlesDirectory = path.join(root, "content", "articles");
const productsPath = path.join(root, "content", "affiliate-products.json");

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

const [, , productId, rawTitle, rawSlug] = process.argv;

if (!productId || !rawTitle) {
  console.error('Usage: npm run new:product-article -- product-id "記事タイトル" optional-slug');
  process.exit(1);
}

if (!fs.existsSync(productsPath)) {
  console.error("content/affiliate-products.json does not exist");
  process.exit(1);
}

const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));
const product = products.find((item) => item.id === productId);

if (!product) {
  console.error(`Unknown affiliate product id: ${productId}`);
  console.error("Add it to content/affiliate-products.json first.");
  process.exit(1);
}

const slug = rawSlug ? toSlug(rawSlug) : toSlug(rawTitle) || `${productId}-${today()}`;
const filePath = path.join(articlesDirectory, `${slug}.mdx`);

if (fs.existsSync(filePath)) {
  console.error(`Article already exists: ${path.relative(root, filePath)}`);
  process.exit(1);
}

const escapedTitle = rawTitle.replaceAll('"', '\\"');
const escapedLabel = product.label.replaceAll('"', '\\"');
const productMemo = product.memo ? String(product.memo).replaceAll('"', '\\"') : "";

const content = `---
title: "${escapedTitle}"
description: "${escapedLabel}を検討している人向けに、向いている人、買う前の確認点、代替案を整理します。"
category: "${product.category}"
publishedAt: "${today()}"
tags:
  - "レビュー"
  - "選び方"
affiliateIntent: "high"
draft: true
sourceVideos:
  - "https://www.youtube.com/watch?v=REPLACE_ME_1"
  - "https://www.youtube.com/watch?v=REPLACE_ME_2"
  - "https://www.youtube.com/watch?v=REPLACE_ME_3"
---

${escapedLabel}は、ただ「おすすめです」で押すより、どんな人に合うのかをはっきり分けて紹介したほうが読者に届きます。
この記事では、最初に結論を出し、そのあと失敗しやすい確認点、代替案、買う前に見るべきポイントまで整理します。

${productMemo ? `メモ: ${productMemo}\n` : ""}
## 結論

${escapedLabel}は、次の条件に当てはまる人なら候補に入ります。

- ここに向いている人を書く
- ここに向いていない人を書く
- 似た商品やサービスとの違いを書く

<ToolRecommendation
  name="${escapedLabel}"
  reason="この商品の強みを、読者の悩みとつなげて1文で書く。"
  priceHint="価格と条件を確認"
  href="/go/${product.id}"
/>

## 買う前に確認すること

スペックや価格だけで決めると、使い始めてから「自分の環境では合わなかった」となりやすいです。
最低限、次の項目を確認します。

| 確認点 | 見る理由 |
| --- | --- |
| 対応環境 | PC、スマホ、OS、設置場所などで使えない失敗を避ける |
| 継続コスト | 本体価格だけでなく、月額費用や追加アクセサリも見る |
| 初心者向け機能 | 最初の1ヶ月で使う機能が揃っているかを見る |
| 返品・サポート | 失敗したときに戻れるかを見る |

## 向いている人

ここには、読者の状況を具体的に書きます。
たとえば「毎日15分だけ練習したい」「部屋が狭い」「独学で始めたい」など、商品名ではなく読者の生活から判断します。

## 向いていない人

無理に売らないための章です。
読者が買って後悔しそうな条件を先に書くと、記事全体の信頼感が上がります。

## 代替案

同じ悩みを解決できる別ルートを書きます。
無料で試す、安い商品から始める、スクールやレンタルを使うなど、読者が選べる状態にします。

<AffiliateCTA
  title="${escapedLabel}の条件を確認する"
  description="価格、対応環境、キャンペーンの有無を確認して、自分の始め方に合うか見てみましょう。"
  label="条件を見る"
  href="/go/${product.id}"
/>

## 今日やること

まずは公式ページや販売ページで、価格、対応環境、返品条件を確認します。
そのうえで、今の自分に必要な機能だけをメモしてから判断すると、勢いだけの購入を避けられます。

## 参考にした視点

- [動画1タイトル](https://www.youtube.com/watch?v=REPLACE_ME_1): 実際の使用感やつまずきポイント
- [動画2タイトル](https://www.youtube.com/watch?v=REPLACE_ME_2): 初心者が確認すべき条件
- [動画3タイトル](https://www.youtube.com/watch?v=REPLACE_ME_3): 代替案や比較観点
`;

fs.mkdirSync(articlesDirectory, { recursive: true });
fs.writeFileSync(filePath, content, "utf8");
console.log(`Created ${path.relative(root, filePath)}`);
