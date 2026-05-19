# Deployment Runbook

Wanna NaviはGitHubへpushするとVercelが本番デプロイします。

## いま分かっている注意点

GitHubのDeployment履歴では、同じコミットに対して次の2つのVercel環境が動いています。

```text
Production - wannavi_online
Production - wannavi-online
```

この状態だと、1回のpushでVercelのビルドを2回消費します。無料枠ではデプロイ制限に早く到達しやすくなります。

## 本命プロジェクトを確認する手順

Vercelで次を確認します。

1. VercelのProjectsを開く
2. `wannavi_online` と `wannavi-online` の両方があるか確認する
3. それぞれのProject Settingsを開く
4. Domainsに `www.wannavi.online` または `wannavi.online` がある方を探す
5. ドメインが付いている方を「本命プロジェクト」として扱う
6. もう片方はGitHub連携を止めるか、Project自体を削除候補にする

`www.wannavi.online` が付いていないプロジェクトがデプロイ成功しても、本番には反映されません。

## 重複プロジェクトを止める手順

使っていない方のVercelプロジェクトで次を確認します。

1. Project Settingsを開く
2. Gitを開く
3. Connected Git Repositoryを確認する
4. Disconnect、またはAuto Deployを止める
5. Domainsに本番ドメインが付いていないことを再確認する

安全にやるなら、先にGit連携だけ止めます。ドメインが本命側で動いていることを確認してから、不要プロジェクトを削除します。

## Rate limitedになったとき

GitHub commit statusに次の表示が出ます。

```text
Deployment rate limited - retry in 24 hours.
```

この場合、コードや記事の問題ではありません。Vercel側の制限が原因です。

対応は次のどれかです。

1. 24時間後にVercelでRetry Deployする
2. 使っていない重複プロジェクトのGit連携を止める
3. 必要ならVercelプランを上げる

まずは2を推奨します。

## 状況確認コマンド

最新コミットのVercel statusを確認します。

```bash
npm run deployment:check
```

特定コミットを確認する場合:

```bash
npm run deployment:check -- SakuInVR/wannavi-online 1b2da05cfdddb18a7d287c3d423504b223773cb5
```

本番が最新コミットを返しているか確認します。

```bash
npm run production:version
```

`/build-info` が404の場合、本番はまだこの診断エンドポイントを含むビルドまで進んでいません。

本番に記事が反映されたか確認します。

```bash
npm run production:content
```

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
