# Wanna Navi Project Status

最終更新: 2026-05-19

## 目的

記事を書いてアップするだけで、検索流入、内部回遊、広告枠、アフィリエイト導線、計測、RSS、サイトマップが自動で回る収益化メディアの土台を作る。

## 現在できていること

- 本番URL `https://www.wannavi.online` で公開済み
- GitHubとVercelの自動デプロイが動作済み
- Search ConsoleのHTMLファイル確認済み
- Search Consoleにサイトマップ送信済み
- GA4測定ID `G-GKHT28VF83` をサイトへ組み込み済み
- AdSenseメタタグ `google-adsense-account` を全ページのheadへ組み込み済み
- `ads.txt` が `pub-9852760004523512` を返す
- Next.js App Routerでサイトが動く
- MDX記事を `content/articles` に追加できる
- 記事追加コマンド `npm run new:article` がある
- 下書き公開、非公開、更新日の反映コマンドがある
- 記事メタデータを `npm run validate:content` で検証できる
- サイト全体の必要部品を `npm run audit:site` で監査できる
- 通常公開前チェックを `npm run preflight` で一括実行できる
- 動画分析型記事の根拠を `npm run validate:video-research` で検証できる
- 主要URL確認を `npm run smoke:site` で実行できる
- AdSense申請前チェックを `npm run adsense:check` で実行できる
- 本番未設定チェックを `npm run production:check` で実行できる
- 記事在庫を `npm run report:content` で確認できる
- 24本の公開記事がある
- 4カテゴリがある
  - AIエンジニア
  - DTM
  - VRクリエイター
  - 楽器演奏者
- 各カテゴリに4本以上の記事がある
- 各カテゴリに `affiliateIntent: "high"` の記事が1本以上ある
- 新規カテゴリ追加時、監査・記事レポート・AdSense申請前チェックがカテゴリ一覧に追従する
- トップ、全記事、カテゴリ一覧、カテゴリ別、タグ一覧、タグ別、記事詳細ページがある
- 記事ページにPR表記、目次、カテゴリ別CTA、広告枠、関連記事、タグリンクが自動で入る
- MDX本文内の `AffiliateCTA` もカテゴリ別の `/go/...` に自動接続される
- `sitemap.xml`、`robots.txt`、`feed.xml`、`ads.txt` がある
- `/go/...` で外部リンクを中央管理できる
- `/go/...` の遷移先をVercel Environment Variablesの `AFFILIATE_*_URL` で差し替えられる
- `/go/...` は `robots.txt` でクロール対象から外している
- GA4がある場合、CTAクリックイベントを送れる
- OG画像を自動生成できる
- GitHub Actions CIが `npm run preflight` を実行する
- Vercel向けの `vercel.json` がある
- YouTube動画3本をGemini APIで分析し、具体例を反映した動画分析型リライトが12本ある

## 通常チェック

記事追加後はこれを実行する。

```bash
npm run preflight
```

動画分析型記事だけ確認:

```bash
npm run validate:video-research
```

記事在庫の確認:

```bash
npm run report:content
```

公開URLの主要ページ確認:

```powershell
$env:SMOKE_BASE_URL='https://www.wannavi.online'; npm run smoke:site
```

AdSense申請前チェック:

```bash
npm run adsense:check
```

本番公開直前の未設定確認:

```bash
npm run production:check
```

## まだ残っている外部作業

- AdSenseのサイト審査を完了させる
- ASP、Amazon、楽天などのリンクを準備する
- Vercel Environment Variablesの `AFFILIATE_*_URL` に実リンクを設定する
- 設定後に `/go/...` が実リンクへリダイレクトされることを確認する
- AdSense承認後、必要なら広告スロットIDを記事内 `AdSlot` に設定する
- 実運用の問い合わせ先を変える場合は `src/lib/site.ts` の `contactEmail` を変更する

## ゴール達成判定

コード側の土台、本番公開、Search Console、GA4、AdSenseメタタグ、ads.txt、カテゴリ追加に強い記事運用は整っている。

ただし、まだ「勝手に収益が発生する」状態ではない。
理由は、AdSense審査の完了と、ASP/Amazon/楽天などの実リンク差し替えが残っているため。

`npm run production:check` が通り、AdSenseまたはアフィリエイトリンクが実際に有効になった時点で、ゴール達成にかなり近い。
