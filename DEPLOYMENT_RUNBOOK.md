# Deployment Runbook

Wanna NaviはGitHubへpushするとVercelが本番デプロイします。

## いま分かっている注意点

GitHubのDeployment履歴を見ると、同じコミットに対して次の2つのVercel環境が動いています。

```text
Production - wannavi_online
Production - wannavi-online
```

この状態だと、1回のpushでVercelのビルドを2回消費します。無料枠ではデプロイ制限に早く到達しやすくなります。

## Rate limitedになったとき

GitHub commit statusに次の表示が出ます。

```text
Deployment rate limited - retry in 24 hours.
```

この場合、コードや記事の問題ではありません。Vercel側の制限が原因です。

対応は次のどちらかです。

1. 24時間後にVercelでRetry Deployする
2. Vercel側で使っていない重複プロジェクトのGit連携を止める
3. 必要ならVercelプランを上げる

まずは2を推奨します。`wannavi_online` と `wannavi-online` のどちらが現在 `www.wannavi.online` に紐づいているかをVercelのDomains画面で確認し、使っていない方のGitHub自動デプロイを止めます。

## 状況確認コマンド

最新コミットのVercel statusを確認します。

```bash
npm run deployment:check
```

特定コミットを確認する場合:

```bash
npm run deployment:check -- SakuInVR/wannavi-online 1b2da05cfdddb18a7d287c3d423504b223773cb5
```

本番に記事が反映されたか確認します。

```bash
npm run production:content
```

本番が最新コミットを返しているか確認します。

```bash
npm run production:version
```

`/build-info` が404の場合、本番はまだこの診断エンドポイントを含むビルドまで進んでいません。

## 記事追加時の運用

Vercelの無料枠を守るため、記事はできるだけまとめてpushします。

推奨:

```text
1. ローカルで複数記事を作る
2. npm run preflight
3. まとめて1回commit
4. まとめて1回push
5. npm run deployment:check
6. npm run production:version
7. npm run production:content
```

記事を1本ずつ何度もpushすると、Vercelのビルド回数を消費しやすくなります。
