# Current Goal Audit

Objective: 記事を書いてアップするだけで、あとは自動で収益導線が動く仕組みを作る。

Last checked: 2026-05-19 JST

## Current Evidence

| Requirement | Evidence | Status |
| --- | --- | --- |
| Next.jsサイトが本番ドメインで公開されている | `npm run production:version` confirmed `https://www.wannavi.online` serves commit `803131b` | Done |
| 記事をMDXで追加できる | `content/articles/*.mdx`, `npm run new:article` | Done |
| トップページ、カテゴリページ、記事ページがある | `npm run build` generated `/`, `/categories/[slug]`, `/articles/[slug]` | Done |
| カテゴリ追加に強い | Categories are read from `src/lib/site.ts`; article generator now reads the same source | Done |
| MDX記事管理ができる | `src/lib/articles.ts`, `content/articles` | Done |
| SEO設定がある | metadata, sitemap, robots, feed, Open Graph, JSON-LD | Done |
| アフィリエイトCTAがある | `AffiliateCTA`, `/go/[id]`, `src/lib/monetization.ts` | Done |
| おすすめ道具コンポーネントがある | `ToolRecommendation` | Done |
| 関連記事コンポーネントがある | article page related links | Done |
| 記事制作が動画リサーチ前提になっている | `VIDEO_RESEARCH_WORKFLOW.md`, `scripts/analyze-youtube.mjs`, `scripts/check-video-research.mjs` | Done |
| YouTube 3本をGemini分析して記事化できる | `research/youtube/*.json`; `npm run validate:video-research` passed for 33 articles | Done |
| 公開記事が十分ある | `npm run production:content` passed for 33 published articles | Done |
| 高収益意図の記事が各カテゴリにある | `npm run adsense:check` passed | Done |
| AdSense meta/script/ads.txtがある | `npm run adsense:check` passed against production | Done |
| アフィリエイトURLが本番で動く | `npm run affiliate:check` passed; 6 `/go/*` links redirect to ASP domains | Done |
| 本番が最新GitHubコミットを配信している | `npm run production:version` passed for commit `803131b` | Done |
| 実際に収益が発生しうる状態 | ASP links are live; AdSense site readiness passes, but AdSense approval/ad unit slot is external | Partial |

## Current Blocking Issues

1. Vercel still deploys the same GitHub repository to two projects:
   - correct/domain project: `wannavi_online`
   - duplicate project: `wannavi-online`

   Evidence:

   ```text
   npm run deployment:check
   => Potential duplicate Vercel projects detected
   ```

2. AdSense approval and ad unit slot creation are external Google-side steps.
   The site includes the publisher meta tag and passes readiness, but real ad serving still depends on Google review and `NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT` once an ad unit exists.

3. Affiliate coverage is basic but not complete.
   Current real links cover Moshimo/Rakuten marketplace-style redirects and one A8 video editor training link. More ASP product mappings should be added per article cluster.

## Recommended Next Actions

1. In Vercel, keep `wannavi_online` and disconnect Git or delete `wannavi-online` after confirming it has no custom domain.
2. When AdSense provides an ad unit slot, set `NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT` in Vercel Production and redeploy.
3. Add more product-specific affiliate inventory under `content/affiliate-products.json`.
4. Continue publishing video-researched articles using:

   ```bash
   npm run new:article -- "記事タイトル" video-creator article-slug
   npm run analyze:youtube -- "article-slug" "https://www.youtube.com/watch?v=..." "https://www.youtube.com/watch?v=..." "https://www.youtube.com/watch?v=..."
   npm run preflight
   git push origin main
   npm run production:version
   npm run production:content
   npm run adsense:check
   npm run affiliate:check
   ```

## Completion Decision

Do not mark the goal complete yet.

The site now supports the intended workflow end to end: MDX article creation, video research, validation, deployment, SEO, AdSense readiness, and ASP redirects. The remaining gap is business-side activation and cleanup: Vercel duplicate project cleanup, AdSense approval/ad unit slot, and broader affiliate inventory coverage.
