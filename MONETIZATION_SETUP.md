# Wanna Navi Monetization Setup

記事を書いて公開するだけで収益導線が回る状態に近づけるための、外部サービス側の設定メモです。

## 現在の仕組み

本文中の `AffiliateCTA` と記事下のカテゴリCTAは、カテゴリごとの `/go/...` に自動接続されます。

```text
AIエンジニア -> /go/ai-tools
DTM -> /go/dtm-starter-kit
VRクリエイター -> /go/vr-creator-kit
楽器演奏者 -> /go/instrument-starter-kit
```

`/go/...` の実リンクは、Vercel Environment Variablesで差し替えます。
コードへASPやAmazonの実URLを直書きしません。

## Vercelに入れる環境変数

```bash
AFFILIATE_AI_TOOLS_URL=
AFFILIATE_DTM_STARTER_KIT_URL=
AFFILIATE_VR_CREATOR_KIT_URL=
AFFILIATE_INSTRUMENT_STARTER_KIT_URL=
```

設定後はProductionを再デプロイします。

## 確認コマンド

本番向けの未設定確認:

```bash
npm run production:check
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

残作業は、AdSense管理画面側でのサイト審査完了と、承認後に必要な広告スロット設定です。
