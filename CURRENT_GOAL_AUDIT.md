# Current Goal Audit

Objective: 記事を書いてアップするだけで、あとは自動で収益導線が動く仕組みを作る。
Last checked: 2026-05-19 JST

## Current Evidence

| Requirement | Evidence | Status |
| --- | --- | --- |
| 本番ドメインでサイトが公開されている | `https://www.wannavi.online` is connected to the Vercel project `wannavi_online` | Done |
| トップページ、カテゴリページ、記事ページがある | `npm run build` generates `/`, `/categories/[slug]`, `/articles/[slug]` | Done |
| MDXで記事を追加できる | `content/articles/*.mdx`, `npm run new:article` | Done |
| カテゴリ追加に強い | Categories are defined in `src/lib/site.ts`; `scripts/new-article.mjs` reads the same source | Done |
| SEO設定がある | metadata, sitemap, robots, feed, Open Graph, JSON-LD | Done |
| アフィリエイトCTAがある | `AffiliateCTA`, `/go/[id]`, `src/lib/monetization.ts` | Done |
| おすすめ道具コンポーネントがある | `ToolRecommendation` | Done |
| 関連記事コンポーネントがある | Article pages show related links | Done |
| YouTube 3本を参考にして記事を書く工程がある | `VIDEO_RESEARCH_WORKFLOW.md`, `scripts/analyze-youtube.mjs`, `scripts/check-video-research.mjs` | Done |
| 動画リサーチ済み記事だけを公開できる | `npm run validate:video-research` passed for 34 articles | Done |
| 公開記事が十分にある | `npm run ready:publish` passed with 34 articles | Done |
| 各カテゴリに高収益意図の記事がある | `npm run audit:site` passed; all categories have high-intent articles | Done |
| AdSenseの準備がある | `npm run adsense:check` previously passed against production; publisher meta is implemented | Partial |
| ASPリンクが本番で動く | `npm run affiliate:check` previously passed for 6 `/go/*` links | Partial |
| 最新コミットが本番反映される | Latest commit `697251c` is pushed, but Vercel is currently rate limited | Blocked |

## Current Blocking Issues

1. Vercel deployment is rate limited.

   Latest evidence:

   ```text
   npm run production:verify
   => Vercel – wannavi_online: failure (Deployment rate limited — retry in 24 hours.)
   => Vercel – wannavi-online: failure (Deployment rate limited — retry in 24 hours.)
   ```

   Latest pushed commit:

   ```text
   697251c Publish video editing PC guide
   ```

2. Vercel still deploys the same GitHub repository to two projects.

   Correct project:

   ```text
   wannavi_online
   ```

   Duplicate project:

   ```text
   wannavi-online
   ```

   This likely doubles build attempts and makes the rate limit easier to hit. The duplicate should be disconnected from GitHub or deleted after confirming it has no custom domain.

3. AdSense approval and ad unit creation are external Google-side steps.

   The site can include the publisher meta tag and pass readiness checks, but real ad serving still depends on Google review. Once an ad unit exists, set:

   ```text
   NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT
   ```

4. Affiliate coverage is still thin.

   Registered products:

   ```text
   rakuten-marketplace (moshimo): 5 article(s)
   video-editor-training (a8): 1 article(s)
   ```

   Biggest gap from `npm run report:next`:

   ```text
   ai-engineer: 7 published, 5 high-intent, 0 product-backed
   ```

## Recommended Next Actions

1. In Vercel, keep `wannavi_online` and disconnect Git or delete `wannavi-online` after confirming it has no custom domain.
2. Retry `npm run production:verify` after the Vercel rate limit resets.
3. Add one AI engineer affiliate product and map it to high-intent AI articles.
4. Add product-specific links for DTM, VR, instrument, and video creator high-intent articles.
5. Continue publishing video-researched articles with:

   ```bash
   npm run new:article -- "記事タイトル" video-creator article-slug
   npm run analyze:youtube -- "article-slug" "https://www.youtube.com/watch?v=..." "https://www.youtube.com/watch?v=..." "https://www.youtube.com/watch?v=..."
   npm run ready:publish
   git push origin main
   npm run production:verify
   ```

## Completion Decision

Do not mark the goal complete yet.

The site now supports the intended workflow end to end: MDX article creation, video research, validation, SEO, AdSense readiness, and ASP redirects. The remaining gaps are business-side activation and cleanup: Vercel rate limit recovery, duplicate project cleanup, AdSense approval/ad unit slot, and broader affiliate inventory coverage.
