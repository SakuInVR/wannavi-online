# Wanna Navi Launch Checklist

記事を追加するだけで収益導線が回る状態にするための、公開前チェックリストです。

## 1. GitHub

- [x] GitHubにリポジトリを作成する
- [x] このプロジェクトをpushする
- [ ] GitHub ActionsのCIが通ることを確認する

CIで確認されるもの:

```bash
npm run preflight
```

内訳:

```bash
npm run validate:content
npm run validate:video-research
npm run audit:site
npm run lint
npm run build
```

`affiliateIntent` や監査条件の意味は `CONTENT_GUIDE.md` を確認します。

## 2. Vercel

- [x] VercelでGitHubリポジトリをImportする
- [x] Framework PresetがNext.jsになっていることを確認する
- [x] Build Commandが `npm run build` であることを確認する
- [x] 初回デプロイが成功することを確認する
- [ ] 重複プロジェクト `wannavi-online` のGit連携を切る、または削除する

## 3. Environment Variables

VercelのEnvironment Variablesに設定します。

```bash
NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT=1234567890
```

設定後は再デプロイします。

本番用の値を入れたあと、必要なら以下で未設定を確認します。

```bash
npm run production:check
```

## 4. Domain

- [x] VercelのDomainsに `wannavi.online` を追加する
- [x] DNSにVercel指定のレコードを設定する
- [x] `https://wannavi.online` が表示されることを確認する
- [x] `https://www.wannavi.online` を正規URLとして使う

## 5. Public URL Checks

公開後、以下のURLを確認します。

```text
https://wannavi.online/
https://www.wannavi.online/sitemap.xml
https://www.wannavi.online/robots.txt
https://www.wannavi.online/feed.xml
https://www.wannavi.online/ads.txt
https://www.wannavi.online/about
https://www.wannavi.online/privacy
https://www.wannavi.online/contact
https://www.wannavi.online/disclosure
```

公開URLに対して自動確認する場合:

```bash
SMOKE_BASE_URL=https://www.wannavi.online npm run smoke:site
```

## 6. Search Console

- [x] Search Consoleに `wannavi.online` を追加する
- [x] HTMLファイルで所有権確認する
- [x] `https://www.wannavi.online/sitemap.xml` を送信する
- [ ] インデックス登録リクエストをトップページと主要記事に行う

## 7. Google Analytics

- [x] GA4プロパティを作成する
- [x] `G-GKHT28VF83` が本番に出ていることを確認する
- [ ] リアルタイムレポートでアクセスが計測されることを確認する
- [ ] `affiliate_cta_click` が送信されることを確認する
- [ ] `tool_recommendation_click` が送信されることを確認する

## 8. AdSense

- [x] AdSense publisher meta tagを設定する
- [x] `https://www.wannavi.online/ads.txt` に `pub-9852760004523512` が出ることを確認する
- [x] 審査に出す前に、最低限の独自記事と固定ページを確認する
- [ ] AdSenseにサイトを追加し審査を通す
- [ ] 承認後、広告スロットIDを `AdSlot` に設定する

## 9. Affiliate

- [ ] Amazonアソシエイトに申請する
- [x] もしもアフィリエイトの楽天市場リンクを準備する
- [x] A8の動画教材エディター養成コースリンクを準備する
- [x] ASPに登録する
- [x] Vercel Environment Variablesに `AFFILIATE_AI_TOOLS_URL` を設定する
- [x] Vercel Environment Variablesに `AFFILIATE_DTM_STARTER_KIT_URL` を設定する
- [x] Vercel Environment Variablesに `AFFILIATE_VR_CREATOR_KIT_URL` を設定する
- [x] Vercel Environment Variablesに `AFFILIATE_INSTRUMENT_STARTER_KIT_URL` を設定する
- [x] Vercel Environment Variablesに `AFFILIATE_RAKUTEN_MARKETPLACE_URL` を設定する
- [x] Vercel Environment Variablesに `AFFILIATE_VIDEO_EDITOR_TRAINING_URL` を設定する
- [x] 設定後にVercelで再デプロイする
- [x] `/go/*` が実リンクへリダイレクトされることを `npm run affiliate:check` で確認する
- [x] PR表記が表示されることを確認する
- [ ] 記事クラスタごとに商品別ASPリンクを増やす

コード側のCTAは、記事カテゴリに応じて `/go/...` に自動接続されます。
実リンクはコードへ直書きせず、VercelのEnvironment Variablesで差し替えます。

## 10. First Content Goal

AdSense審査前の最低ライン:

- [ ] AIエンジニアカテゴリ: 4記事
- [ ] DTMカテゴリ: 4記事
- [ ] VRクリエイターカテゴリ: 4記事
- [ ] 楽器演奏者カテゴリ: 4記事
- [x] 動画クリエイターカテゴリ: 4記事
- [x] 収益記事: 各カテゴリ1記事以上。frontmatterの `affiliateIntent: "high"` で管理する
- [x] 運営者情報、プライバシー、お問い合わせ、広告PR表記が埋まっている
- [x] `npm run adsense:check` が本番で通る

## 11. Routine

記事を追加するたびに実行:

```bash
npm run ready:publish
```

内訳:

```bash
npm run validate:content
npm run validate:video-research
npm run audit:site
npm run lint
npm run build
npm run affiliate:env
```

ローカルまたは公開URLの主要ページ確認:

```bash
npm run smoke:site
```

本番公開直前:

```bash
npm run production:check
```

push後の本番確認:

```bash
npm run production:verify
```

記事公開後に見るもの:

- Search Consoleの検索クエリ
- GA4の閲覧数
- `affiliate_cta_click`
- `tool_recommendation_click`
- 表示回数があるのにクリックが少ない記事
- クリックされるが収益につながらない記事
