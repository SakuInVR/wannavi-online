# ASP Linking Runbook

Wanna Naviでは、記事内にASPの生リンクを直接書きません。

記事内のCTAはカテゴリに応じて `/go/...` に集約し、VercelのEnvironment Variablesで実際のASPリンクへ差し替えます。

## URLの対応表

| カテゴリ | サイト内URL | Vercel環境変数 | 主なASP候補 |
| --- | --- | --- | --- |
| AIエンジニア | `/go/ai-tools` | `AFFILIATE_AI_TOOLS_URL` | A8、もしも、ValueCommerce |
| DTM | `/go/dtm-starter-kit` | `AFFILIATE_DTM_STARTER_KIT_URL` | もしも、ValueCommerce、A8 |
| VRクリエイター | `/go/vr-creator-kit` | `AFFILIATE_VR_CREATOR_KIT_URL` | もしも、ValueCommerce、A8 |
| 楽器演奏者 | `/go/instrument-starter-kit` | `AFFILIATE_INSTRUMENT_STARTER_KIT_URL` | もしも、ValueCommerce、A8 |

## 基本方針

1. ASP管理画面で広告主と提携する
2. 広告リンクまたは商品リンクを作る
3. 生成されたURLのうち、遷移先として使うASPリンクをコピーする
4. Vercel Production Environment Variablesに入れる
5. Productionを再デプロイする
6. `npm run affiliate:check` で `/go/...` が外部URLへ飛ぶことを確認する

リンクを集めるときは [ASP_LINKS_TEMPLATE.md](./ASP_LINKS_TEMPLATE.md) を使います。

## A8.net

A8は、管理画面で広告リンクコードを生成して使います。公式ヘルプでも、管理画面から出力されたリンクコードを使う説明になっています。

作業:

1. A8.netにログイン
2. プログラム検索で案件を探す
3. 提携申請する
4. 承認済みになった案件を開く
5. 広告リンク、商品リンク、またはテキストリンクを作成する
6. 生成されたHTML内のリンクURLをコピーする
7. 対応する `AFFILIATE_*_URL` に設定する

注意:

- A8で生成された計測パラメータを削らない
- 広告主ごとの禁止事項を確認する
- 記事内の表現が広告主のルールに触れないか確認する

## もしもアフィリエイト

もしもは「どこでもリンク」で好きなURLへのリンクを作れる機能があります。

作業:

1. もしもアフィリエイトにログイン
2. プロモーションを検索する
3. 提携申請する
4. 承認済み案件で広告リンクを作る
5. 商品ページや検索ページへ飛ばしたい場合は、どこでもリンクを使う
6. 生成されたリンクURLをコピーする
7. 対応する `AFFILIATE_*_URL` に設定する

向いている使い方:

- Amazon、楽天、Yahoo系の商品導線
- 楽器、DTM機材、VR機材などの商品比較
- 「スターターセット候補を見る」系CTA

## ValueCommerce

ValueCommerceには、MyLinkやLinkSwitchなどの機能があります。LinkSwitchは、サイト内の直接リンクをアフィリエイトリンクに自動変換する仕組みです。

Wanna Naviではまず `/go/...` 集約方式を優先します。LinkSwitchを導入する場合は、すべての外部リンクが自動変換対象になりうるため、PR表記、nofollow/sponsored、広告主ルールを確認してから導入します。

作業:

1. ValueCommerceにログイン
2. 広告主を検索する
3. 提携申請する
4. MyLink対応案件なら、遷移させたいURLでMyLinkを作る
5. 生成されたリンクURLをコピーする
6. 対応する `AFFILIATE_*_URL` に設定する

## まず設定したい4本

最初はカテゴリごとに1本ずつ、汎用性の高いリンクを置きます。

| 環境変数 | 最初のリンク候補 |
| --- | --- |
| `AFFILIATE_AI_TOOLS_URL` | AIスクール、AI教材、開発講座、クラウド学習サービス |
| `AFFILIATE_DTM_STARTER_KIT_URL` | DTM機材検索ページ、MIDIキーボード、オーディオインターフェース、ヘッドホン |
| `AFFILIATE_VR_CREATOR_KIT_URL` | VRゴーグル、ゲーミングPC、VRChat関連機材 |
| `AFFILIATE_INSTRUMENT_STARTER_KIT_URL` | 電子ピアノ、ギター初心者セット、楽器教室、練習教材 |

## Vercel設定後の確認

ローカルの `.env.local` に仮入力した段階では、URL形式だけを確認できます。

```bash
npm run affiliate:map
```

カテゴリごとの `/go/...`、Vercelに入れる環境変数名、そのリンクを使う記事一覧を表示します。ASP案件を選ぶ前にこれを見て、収益意図が高い記事群から強い案件を当てます。

商品を先に見つけてから記事を書く場合は、[AFFILIATE_PRODUCTS_TEMPLATE.md](./AFFILIATE_PRODUCTS_TEMPLATE.md) の形で `content/affiliate-products.json` に商品を追加します。これで `/go/product-id` の商品別リンクを記事から使えます。

```bash
npm run affiliate:products
```

商品IDから記事ドラフトも作れます。

```bash
npm run new:product-article -- product-id "記事タイトル"
```

```bash
npm run affiliate:env
```

ASPリンクを `.env.affiliate.local` にまとめてからVercel Productionへ入れる場合:

```bash
copy .env.affiliate.example .env.affiliate.local
npm run affiliate:sync
npm run affiliate:sync -- --apply
```

`affiliate:sync` はまずdry-runします。`--apply` を付けたときだけ、未登録の `AFFILIATE_*_URL` をVercel Productionへ追加します。

Vercel Productionへ設定して再デプロイしたあと、本番の `/go/...` を確認します。

```bash
npm run affiliate:check
```

期待する状態:

```text
/go/ai-tools -> external ASP URL
/go/dtm-starter-kit -> external ASP URL
/go/vr-creator-kit -> external ASP URL
/go/instrument-starter-kit -> external ASP URL
```

`/disclosure` に戻る場合は、VercelのEnvironment Variableが未設定です。

## Codexで手伝える範囲

できること:

- ASPリンクの貼り先カテゴリを決める
- Vercel環境変数名に対応させる
- 記事内CTA文言を自然にする
- `/go/...` の動作確認スクリプトを走らせる
- ASPリンク一覧を整理する

ユーザー操作が必要なこと:

- ASP管理画面へのログイン
- 2FA、メール認証、本人確認
- 広告主への提携申請
- ASPの管理画面から広告リンクをコピーする操作

ログイン情報や2FAが必要な画面操作は、ユーザーの確認を挟んで進めます。
