import fs from "node:fs";
import path from "node:path";

const [, , title, ...urls] = process.argv;
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

if (!title || urls.length < 3) {
  console.error(
    'Usage: npm run analyze:youtube -- "記事タイトル" <youtube-url-1> <youtube-url-2> <youtube-url-3>',
  );
  process.exit(1);
}

if (!apiKey) {
  console.error("GEMINI_API_KEY is required.");
  process.exit(1);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getVideoId(url) {
  return (
    url.match(/[?&]v=([A-Za-z0-9_-]{11})/)?.[1] ??
    url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)?.[1] ??
    url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/)?.[1] ??
    ""
  );
}

function getOutputSlug(title, urls) {
  const titleSlug = slugify(title);

  if (titleSlug) {
    return titleSlug;
  }

  const videoSlug = urls
    .map(getVideoId)
    .filter(Boolean)
    .join("-");

  return videoSlug || `youtube-research-${new Date().toISOString().slice(0, 10)}`;
}

async function analyzeVideo(url, index) {
  const prompt = `
あなたはWanna Naviの記事リサーチ担当です。
このYouTube動画を、記事「${title}」を書くための経験例として分析してください。

出力条件:
- 日本語
- 動画の内容をそのまま長く引用しない
- 実体験として使える具体例を抽出する
- 初心者がつまずく場面、判断基準、練習や作業の順番を重視する
- タイムスタンプが分かる場合は短く添える
- 記事に使うときの注意点も書く

出力フォーマット:
## 動画${index}の要約
## 具体的な経験例
## 初心者のつまずき
## 記事に入れるべき視点
## 注意点
`.trim();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                file_data: {
                  file_uri: url,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    },
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      `Gemini request failed for ${url}: ${response.status} ${JSON.stringify(payload)}`,
    );
  }

  const text =
    payload.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text)
      .filter(Boolean)
      .join("\n") ?? "";

  if (!text.trim()) {
    throw new Error(`Gemini returned an empty analysis for ${url}`);
  }

  return {
    url,
    analysis: text.trim(),
  };
}

const outputDir = path.join(process.cwd(), "research", "youtube");
fs.mkdirSync(outputDir, { recursive: true });

const result = {
  title,
  model,
  generatedAt: new Date().toISOString(),
  videos: [],
};

for (const [index, url] of urls.slice(0, 3).entries()) {
  console.error(`Analyzing video ${index + 1}/3: ${url}`);
  result.videos.push(await analyzeVideo(url, index + 1));
}

const outputPath = path.join(outputDir, `${getOutputSlug(title, urls)}.json`);
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);

console.log(outputPath);
