# Video-Backed Rewrite Queue

既存記事は、構成優先で作成したため具体的な経験例が薄いものがあります。
今後は、YouTube動画3本をGemini APIまたはユーザー指定AIで分析してから、動画に基づく具体例を入れてリライトします。

## 優先リライト

### 楽器演奏者

- [x] `instrument-adult-piano-start.mdx`
  - 大人からピアノを始めた人の実演・練習ルーティン動画を参照する
- [x] `instrument-adult-piano-practice-routine.mdx`
  - 社会人の練習時間確保、短時間練習、録音振り返りの動画を参照する
- [x] `instrument-piano-classic-step-up.mdx`
  - 初心者向けクラシック曲、譜読み、分割練習の動画を参照する

### AIエンジニア

- [x] `ai-engineer-ai-editor-guide.mdx`
  - AIエディタ実演、失敗例、初心者の使いすぎ防止の動画を参照する
- `ai-engineer-tools-first.mdx`
  - 開発環境構築の実演動画を参照する
- `ai-engineer-portfolio-ideas.mdx`
  - ポートフォリオ制作例の動画を参照する

### DTM

- `dtm-first-loop.mdx`
  - 4小節ループ制作の実演動画を参照する
- `dtm-first-tools.mdx`
  - 初心者機材紹介と失敗談の動画を参照する
- `dtm-headphones-guide.mdx`
  - モニターヘッドホン比較・初心者向け解説動画を参照する

### VRクリエイター

- `vrchat-quest-avatar.mdx`
  - Quest対応の実作業動画を参照する
- `vrchat-shader-basics.mdx`
  - シェーダー設定の画面解説動画を参照する
- `vrchat-avatar-commission-checklist.mdx`
  - アバター依頼・改変の経験談動画を参照する

## リライト完了条件

- `sourceVideos` に3本のYouTube URLが入っている
- `research/youtube/` にGemini分析結果が保存されている
- 本文に動画由来の具体的な場面が入っている
- 長い引用ではなく、経験例として整理されている
- `npm run preflight` が通る
- 本番URLで表示確認済み
