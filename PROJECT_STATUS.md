# Wanna Navi Project Status

最終更新: 2026-05-16

## 目的

記事を書いてアップするだけで、検索流入、内部回遊、広告枠、アフィリエイト導線、計測、RSS、サイトマップが自動で回る収益化メディアの土台を作る。

## 現在できていること

- Next.js App Routerでサイトが動く
- MDX記事を `content/articles` に追加できる
- 記事追加コマンド `npm run new:article` がある
- 日本語タイトルでもslug指定で記事を作れる
- 下書きを公開状態にする `npm run publish:article` がある
- 公開済み記事を下書きに戻す `npm run unpublish:article` がある
- リライト後に更新日だけ上げる `npm run touch:article` がある
- 記事メタデータを `npm run validate:content` で検証できる
- サイト全体の必要部品を `npm run audit:site` で監査できる
- 通常公開前チェックを `npm run preflight` で一括実行できる
- 主要URL確認を `npm run smoke:site` で実行できる
- 本番未設定チェックを `npm run production:check` で実行できる
- 記事在庫を `npm run report:content` で確認できる
- 13本の公開記事がある
- 各カテゴリに4本以上の記事がある
- 各カテゴリに `affiliateIntent: "high"` の記事が1本以上ある
- 新規記事は `draft: true` で作成され、公開面に出ない
- ドラフト記事は直URLでも404になる
- トップ、全記事、カテゴリ一覧、カテゴリ別、タグ一覧、タグ別、記事詳細ページがある
- 記事ページにPR表記、目次、カテゴリ別CTA、広告枠、関連記事、タグリンクが自動で入る
- `sitemap.xml`、`robots.txt`、`feed.xml`、`ads.txt` がある
- `/go/...` で外部リンクを中央管理できる
- `/go/...` は `robots.txt` でクロール対象から外している
- AdSense、GA4、Search Console確認コードを環境変数で差し込める
- GA4がある場合、CTAクリックイベントを送れる
- OG画像を自動生成できる
- GitHub Actions CIが `npm run preflight` を実行する
- Vercel向けの `vercel.json` がある

## 通常チェック

記事追加後はこれを実行する。

```bash
npm run preflight
```

記事在庫の確認:

```bash
npm run report:content
```

公開URLの主要ページ確認:

```bash
SMOKE_BASE_URL=https://wannavi.online npm run smoke:site
```

本番公開直前の未設定確認:

```bash
npm run production:check
```

## 本番公開までに残っている外部作業

- GitHubにリポジトリを作成してpushする
- VercelにImportする
- `wannavi.online` のDNSをVercelへ向ける
- Vercelに環境変数を設定する
  - `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT`
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID`
  - `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
- Search Consoleに登録する
- `https://wannavi.online/sitemap.xml` を送信する
- GA4でリアルタイム計測を確認する
- AdSenseにサイトを追加して審査へ出す
- ASP、Amazon、楽天などのリンクを準備する
- `src/lib/outbound-links.ts` の `url` を実リンクへ差し替える
- `src/lib/site.ts` の `contactEmail` を実運用の連絡先へ変更する
- 運営者情報ページを実運用の内容へ具体化する

## ゴール達成判定

コード側の土台はかなり揃っているが、まだ「勝手に収益が発生する」状態ではない。
理由は、実デプロイ、DNS接続、AdSense審査、ASP登録、実リンク差し替えが未完了だから。

`npm run production:check` が通り、公開URLで `npm run smoke:site` が通り、AdSenseまたはアフィリエイトリンクが実際に有効になった時点で、ゴール達成にかなり近い。
