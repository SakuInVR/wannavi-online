# ASP Links Template

ASP管理画面で作ったリンクをここに一時的に貼り、Vercel Environment Variablesへ転記します。

このファイルには本番の秘密情報ではなく、ASPで生成した公開用アフィリエイトURLだけを置く想定です。ただし、提携IDを含むため、公開したくない場合はこのファイルをコミットせず、手元メモとして使ってください。

## Vercel Production Environment Variables

```bash
AFFILIATE_AI_TOOLS_URL=
AFFILIATE_DTM_STARTER_KIT_URL=
AFFILIATE_VR_CREATOR_KIT_URL=
AFFILIATE_INSTRUMENT_STARTER_KIT_URL=
```

## Link Inventory

| Env Key | ASP | 案件名 | リンク先の意図 | URL |
| --- | --- | --- | --- | --- |
| `AFFILIATE_AI_TOOLS_URL` |  |  | AI教材、AIスクール、開発講座 |  |
| `AFFILIATE_DTM_STARTER_KIT_URL` |  |  | DTM機材、MIDIキーボード、オーディオIF |  |
| `AFFILIATE_VR_CREATOR_KIT_URL` |  |  | VRゴーグル、ゲーミングPC、VRChat機材 |  |
| `AFFILIATE_INSTRUMENT_STARTER_KIT_URL` |  |  | 楽器初心者セット、電子ピアノ、ギター、楽器教室 |  |

## After Setting Vercel

VercelのProduction環境変数に設定して再デプロイ後、次を実行します。

```bash
npm run affiliate:check
```

期待値:

```text
ok /go/ai-tools -> external ASP origin
ok /go/dtm-starter-kit -> external ASP origin
ok /go/vr-creator-kit -> external ASP origin
ok /go/instrument-starter-kit -> external ASP origin
```
