# Wanna Navi Monetization Setup

記事を書いて公開するだけで収益導線が回る状態に近づけるための、外部サービス側の設定メモです。

## 現在の仕組み

本文中の `AffiliateCTA`、`ToolRecommendation`、記事下のカテゴリCTAは、カテゴリごとの `/go/...` に自動接続されます。

```text
AIエンジニア -> /go/ai-tools
DTM -> /go/dtm-starter-kit
VRクリエイター -> /go/vr-creator-kit
楽器演奏者 -> /go/instrument-starter-kit
```

`/go/...` の実リンクは、Vercel Environment Variablesで差し替えます。コードへASPやAmazonの実URLを直接書き込みません。

## Vercelに入れる環境変数

```bash
AFFILIATE_AI_TOOLS_URL=
AFFILIATE_DTM_STARTER_KIT_URL=
AFFILIATE_VR_CREATOR_KIT_URL=
AFFILIATE_INSTRUMENT_STARTER_KIT_URL=
```

ASP別のリンク作成手順とカテゴリ対応は [ASP_LINKING_RUNBOOK.md](./ASP_LINKING_RUNBOOK.md) にまとめています。

設定後はProductionを再デプロイします。

## アフィリエイト確認コマンド

Vercelのデプロイ状態確認:

```bash
npm run deployment:check
```

本番向けの未設定確認:

```bash
npm run affiliate:check
```

公開URLの主要ページ確認:

```powershell
$env:SMOKE_BASE_URL='https://www.wannavi.online'; npm run smoke:site
```

## 手動確認URL

環境変数を設定したら、次のURLがASPや商品ページへリダイレクトされることを確認します。

```text
https://www.wannavi.online/go/ai-tools
https://www.wannavi.online/go/dtm-starter-kit
https://www.wannavi.online/go/vr-creator-kit
https://www.wannavi.online/go/instrument-starter-kit
```

未設定の場合は `/disclosure` に戻ります。

## AdSense

サイト側には以下を実装済みです。

```text
google-adsense-account meta
AdSense script
ads.txt
記事下広告枠
プライバシーポリシー
お問い合わせ
運営者情報
PR表記
```

AdSense審査後、広告ユニットのスロットIDが発行されたら、Vercelに次を設定します。

```bash
NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT=
```

`NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT` は `src/lib/site.ts` にも既定値がありますが、Vercel側にも入れておくと運用が分かりやすいです。

```bash
NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT=ca-pub-9852760004523512
```

広告スロットIDを設定してProductionを再デプロイすると、記事下の `AdSlot` が実広告タグになります。
