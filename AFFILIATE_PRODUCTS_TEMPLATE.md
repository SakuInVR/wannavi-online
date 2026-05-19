# Affiliate Products Template

ASPで「この商品を記事にしたい」と思ったら、まず `content/affiliate-products.json` に1件追加します。

```json
[
  {
    "id": "example-digital-piano",
    "label": "Example Digital Piano",
    "envKey": "AFFILIATE_EXAMPLE_DIGITAL_PIANO_URL",
    "category": "instrument-player",
    "asp": "valuecommerce",
    "articleSlugs": ["instrument-digital-piano-guide"],
    "memo": "電子ピアノ選びの記事から個別商品へ送る"
  }
]
```

追加したら、Vercel ProductionのEnvironment Variablesに `envKey` と同じ名前でASPリンクを入れます。

記事内では、必要な場所で明示的に商品リンクへ向けられます。

```mdx
<ToolRecommendation
  name="Example Digital Piano"
  reason="夜でも練習しやすく、初心者が最初に置きやすい価格帯。"
  priceHint="予算に合わせて選ぶ"
  href="/go/example-digital-piano"
/>
```

確認コマンド:

```bash
npm run affiliate:products
npm run affiliate:env
npm run affiliate:check
```
