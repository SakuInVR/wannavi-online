# ASP Ad Creative Workflow

Wanna Naviでは、記事内の収益導線を「説明ボックス」ではなく、画像広告クリエイティブ中心で運用する。

## 基本方針

1. 記事テーマを決める。
2. ASPで記事に合う案件を探す。
3. 提携状態と広告素材を確認する。
4. 画像バナー素材を `content/ad-creatives.json` に登録する。
5. 記事内に `<ProductAd id="..." />` を置く。
6. `npm run ready:publish` で検証して公開する。

## ASPで見る項目

広告案件を見るときは、最低限この項目を確認する。

| 項目 | 見る理由 |
| --- | --- |
| 商品名/サービス名 | 記事テーマとズレていないか確認する |
| ASP | A8、もしも、ValueCommerceなど管理元を記録する |
| 提携状態 | 未申請、申請中、承認済み、否認を分ける |
| 報酬条件 | 無料登録、購入、資料請求など成果地点を確認する |
| 画像素材 | バナー画像URL、サイズ、altに使う説明を確認する |
| 掲載先記事 | どの記事に自然に入るか決める |

## 提携操作の扱い

ASPで「提携申請」「広告作成」「広告リンク取得」などを行う場合、外部アカウントの状態が変わる。

Codexがブラウザで候補を探すところまでは進めてよい。  
ただし、提携申請ボタンや保存ボタンを押す直前には、ユーザー確認を取る。

## `content/ad-creatives.json` の状態

| status | 意味 |
| --- | --- |
| `candidate` | 候補として見つけたが、まだ提携/素材取得が済んでいない |
| `applied` | 提携申請中 |
| `approved` | 掲載可能。`imageUrl` と `imageAlt` が必須 |
| `rejected` | 否認または掲載しない |

## MDXでの使い方

承認済みの広告素材を登録したら、記事内にこれを置く。

```mdx
<ProductAd id="video-editor-training-main-banner" />
```

`status` が `approved` で、`imageUrl` が入っている素材だけ表示される。未承認の候補は本番に出ない。

## 検証コマンド

```bash
npm run ads:report
npm run ready:publish
```

`ads:report` は候補、申請中、承認済みの広告素材を一覧する。  
`ready:publish` は記事、動画リサーチ、ASP商品、広告素材、サイト監査、lint、build、ローカルASP URL設定をまとめて確認する。
