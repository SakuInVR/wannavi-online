# Wanna Navi

「なりたい自分」までのロードマップをMDX記事で増やしていく、収益化メディアの土台です。

現在の実装状況と残作業は [PROJECT_STATUS.md](./PROJECT_STATUS.md) にまとめています。

## 開発

```bash
npm run dev
```

ローカル確認:

```text
http://localhost:3000
```

## 広告設定

AdSense承認後、`.env.local` にクライアントIDを設定します。AnalyticsとSearch Consoleの確認コードも同じ場所で管理します。

```bash
NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=google-site-verification-code
```

記事内の `AdSlot` に広告スロットIDを入れると、広告タグとして出力されます。

```mdx
<AdSlot slotName="article-bottom" adSlotId="1234567890" />
```

## 記事を書く

詳しい記事方針、`affiliateIntent`、監査条件の意味は [CONTENT_GUIDE.md](./CONTENT_GUIDE.md) にまとめています。

1. `ARTICLE_TEMPLATE.mdx` をコピーする
2. `content/articles/new-article-slug.mdx` として保存する
3. frontmatter の `title`, `description`, `category`, `publishedAt` を埋める
4. 本文内に必要なら収益導線コンポーネントを置く

記事ページには、PR表記、カテゴリ別CTA、記事下広告枠が自動で入ります。通常の記事は本文を書くところから始めればOKです。
新規記事は `draft: true` で作られます。公開するときは `draft: false` に変更してください。
公開記事は `validate:content` で本文量と見出し数も確認されます。

記事ファイルはコマンドでも作れます。

```bash
npm run new:article -- "AI Engineer Portfolio Roadmap" ai-engineer
```

日本語タイトルでファイル名を指定したい場合:

```bash
npm run new:article -- "AIエンジニアになりたい人の教材選び" ai-engineer ai-engineer-study-tools
```

下書きを公開状態にする:

```bash
npm run publish:article -- ai-engineer-study-tools
```

公開/取り下げコマンドは `updatedAt` も自動更新します。

公開済み記事を下書きに戻す:

```bash
npm run unpublish:article -- ai-engineer-study-tools
```

リライト後に更新日だけ反映する:

```bash
npm run touch:article -- ai-engineer-study-tools
```

記事在庫を見る:

```bash
npm run report:content
```

アップ前チェック:

```bash
npm run preflight
```

個別に実行する場合:

```bash
npm run validate:content
npm run audit:site
npm run lint
npm run build
```

ローカルサーバー起動後の主要URL確認:

```bash
npm run smoke:site
```

別URLを確認する場合:

```bash
SMOKE_BASE_URL=https://wannavi.online npm run smoke:site
```

`smoke:site` は、トップ、記事、カテゴリ、タグ、固定ページ、SEO系ファイル、未設定時の `/go/...` リダイレクトを確認します。

本番公開前に、環境変数や外部リンクの未設定を厳しめに確認する場合:

```bash
npm run production:check
```

`production:check` は、AdSense / Analytics / Search Console / 外部リンクURL / 運営者情報のプレースホルダーが残っていると失敗します。
シェル環境変数だけでなく、`.env.local` も読み取ります。

GitHubに置く場合は、同じチェックが `.github/workflows/ci.yml` でも走ります。

使えるカテゴリ:

```text
ai-engineer
dtm
vr-creator
```

## MDXで使える収益コンポーネント

```mdx
<ToolRecommendation
  name="おすすめ道具名"
  reason="なぜ必要か"
  priceHint="無料枠からでOK"
/>
```

```mdx
<AffiliateCTA
  title="関連する教材・機材・サービス"
  description="押し売りではなく、次の一歩に必要な選択肢として紹介する。"
  label="候補を見る"
/>
```

## 実装済み

- トップページ
- 全記事ページ
- カテゴリ一覧ページ
- カテゴリページ
- タグ一覧ページ
- タグ別記事ページ
- 記事ページ
- 自動目次
- MDX記事管理
- SEO metadata
- Open Graph image
- `sitemap.xml`
- `robots.txt`
- `feed.xml`
- `ads.txt`
- Google Analytics
- Search Console verification
- Monetization click events
- Centralized outbound link redirects
- Vercel deploy config
- Site audit script
- Site smoke test script
- Production readiness check
- Content report script
- アフィリCTAコンポーネント
- おすすめ道具コンポーネント
- 関連記事コンポーネント
- 広告枠コンポーネント
- PR表記コンポーネント
- 運営者情報ページ
- プライバシーポリシーページ
- お問い合わせページ
- 広告・PR表記ページ

## 公開前に差し替えるもの

- `src/lib/site.ts` の `contactEmail`
- `AffiliateCTA` と `ToolRecommendation` の `href`
- `src/lib/outbound-links.ts` の `url`
- `.env.local` の `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT`
- `.env.local` の `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `.env.local` の `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
- `AdSlot` の `adSlotId`
- 実際の運営者情報

## デプロイ手順の目安

詳細な公開チェックリストは [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) にまとめています。

1. GitHubにリポジトリを作る
2. VercelでこのリポジトリをImportする
3. `wannavi.online` をVercelのDomainsに追加する
4. DNS側でVercel指定のレコードを設定する
5. VercelのEnvironment Variablesに `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` を入れる
6. Search Consoleに `https://wannavi.online/sitemap.xml` を送信する
7. AdSense審査後、`src/lib/monetization.ts` と記事内CTAの `href` を実リンクへ差し替える

`vercel.json` では、`feed.xml` と `ads.txt` のキャッシュ、基本的なセキュリティヘッダーを設定しています。

RSS:

```text
https://wannavi.online/feed.xml
```

AdSense用ads.txt:

```text
https://wannavi.online/ads.txt
```

`NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT=ca-pub-...` を設定してビルドすると、`ads.txt` に `pub-...` が自動で入ります。

## 収益化の基本導線

```text
カテゴリページ
↓
集客記事
↓
自動PR表記 / おすすめ道具 / アフィリCTA / カテゴリ別CTA / 広告枠
↓
収益記事または外部リンク
```

まずは各カテゴリに、集客記事3本、収益記事1本を追加するとサイトの導線が見えやすくなります。

カテゴリ別の自動CTAは `src/lib/monetization.ts` で管理します。ASPやAmazonのリンクが決まったら、各カテゴリの `href` を差し替えます。

外部リンクは `src/lib/outbound-links.ts` に集約しています。ASPやAmazonの実URLが決まったら、まずここの `url` を差し替えます。未設定の `/go/...` は広告PR表記ページへリダイレクトされます。

`/go/...` は外部リンク用の中継URLです。検索に載せたいページではないため、`robots.txt` でクロール対象から外します。

GAを設定している場合、以下のクリックイベントが自動送信されます。

```text
affiliate_cta_click
tool_recommendation_click
```
