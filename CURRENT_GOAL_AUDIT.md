# Current Goal Audit

Objective: 記事を書いてアップするだけで、あとは自動で収益導線が動く仕組みを作る。

## Success Criteria

| Requirement | Evidence | Status |
| --- | --- | --- |
| Next.jsサイトが本番ドメインで公開されている | `https://www.wannavi.online` は既存ビルドで公開済み | Partial |
| 記事をMDXで追加できる | `content/articles/*.mdx`, `npm run new:article` | Done |
| トップページ、カテゴリページ、記事ページがある | `src/app`, `npm run build` routes | Done |
| MDX記事管理ができる | `src/lib/articles.ts`, `content/articles` | Done |
| SEO設定がある | metadata, sitemap, robots, feed, Open Graph | Done |
| アフィリエイトCTAがある | `AffiliateCTA`, `/go/[id]`, `src/lib/monetization.ts` | Done |
| おすすめ道具コンポーネントがある | `ToolRecommendation` | Done |
| 関連記事コンポーネントがある | article page related links | Done |
| 記事制作が動画リサーチ前提になっている | `VIDEO_RESEARCH_WORKFLOW.md`, `scripts/check-video-research.mjs` | Done |
| YouTube 3本をGemini分析して記事化できる | `scripts/analyze-youtube.mjs`, `research/youtube/*.json` | Done |
| 公開記事が動画分析JSONと紐づく | `npm run validate:video-research` passed for 29 articles | Done |
| 高収益意図の記事が各カテゴリにある | `npm run report:content` shows high-intent articles | Done |
| AdSense meta/script/ads.txtがある | `src/app/layout.tsx`, `AdSenseScript`, `ads.txt` | Done |
| AdSense広告スロットを本番設定できる | `NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT`, `AdSlot` | Ready, external setup needed |
| アフィリエイトURLを本番設定できる | `AFFILIATE_*_URL`, `/go/[id]` | Ready, external setup needed |
| 本番が最新GitHubコミットを配信している | `npm run production:version` currently 404 for `/build-info` | Blocked |
| 最新記事が本番に反映されている | `npm run production:content` currently fails for `instrument-guitar-first-month` | Blocked |
| Vercelデプロイが安定している | `npm run deployment:check` detects duplicate projects and rate limit | Blocked |
| 実際に収益が発生しうる状態 | AdSense approval, ad slot ID, affiliate real URLs are not verified | Not done |

## Current Blocking Issues

1. Vercel has two projects or environments deploying the same repository:
   - `Vercel - wannavi_online`
   - `Vercel - wannavi-online`

2. Latest commits are rate limited:

```text
Deployment rate limited - retry in 24 hours.
```

3. Production `https://www.wannavi.online` is still serving an older build:

```text
npm run production:version
=> build-info: expected 200, got 404
```

4. The latest article exists in GitHub and passes local checks, but is not on production yet:

```text
instrument-guitar-first-month: expected 200, got 404
```

## User-Side Required Actions

Vercel:

1. Open Vercel Projects.
2. Check both `wannavi_online` and `wannavi-online`.
3. Find which project has `www.wannavi.online` in Domains.
4. Keep that one as the main project.
5. Disable GitHub auto deploy or disconnect Git on the other project.
6. After the build limit resets, retry deploy on the main project.
7. Run:

```bash
npm run deployment:check
npm run production:version
npm run production:content
```

AdSense:

1. Complete AdSense review.
2. Create an ad unit.
3. Set Vercel Production env:

```bash
NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT=...
```

Affiliate:

Set real affiliate URLs in Vercel Production env:

```bash
AFFILIATE_AI_TOOLS_URL=...
AFFILIATE_DTM_STARTER_KIT_URL=...
AFFILIATE_VR_CREATOR_KIT_URL=...
AFFILIATE_INSTRUMENT_STARTER_KIT_URL=...
```

Then run:

```bash
npm run affiliate:check
```

## Completion Decision

Do not mark the goal complete yet.

The content engine, article workflow, SEO, CTA, and tracking foundations are implemented. The remaining gap is external production activation: Vercel duplicate project cleanup, successful production deployment, AdSense approval/slot setup, and real affiliate URLs.
