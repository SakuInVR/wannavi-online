import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-1.5-flash";

interface VideoInput {
  url: string;
  role: "a" | "b" | "c"; // A: beginner struggles, B: advanced logic, C: gear review
}

const ROLE_PROMPTS: Record<string, string> = {
  a: "この動画を視聴し、「初心者がぶつかる壁」「つまずきポイント」「挫折しがちな場面」に焦点を当てて分析してください。初心者目線で、何が難しくてどう乗り越えればいいかを具体的にまとめてください。",
  b: "この動画を視聴し、「上級者の練習ロジック」「効率的な上達法」「継続のコツ」に焦点を当てて分析してください。毎日の練習にどう取り入れるか、具体的なステップを抽出してください。",
  c: "この動画を視聴し、「機材・デバイスのレビュー」「必要な道具」「価格帯別のおすすめ」に焦点を当てて分析してください。特に「初期費用を抑えたい人向け」と「本気で環境を整えたい人向け」の2軸で機材比較ができるように情報を整理してください。",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getVideoId(url: string) {
  return (
    url.match(/[?&]v=([A-Za-z0-9_-]{11})/)?.[1] ??
    url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)?.[1] ??
    url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/)?.[1] ??
    ""
  );
}

async function analyzeVideoWithGemini(
  videoUrl: string,
  role: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const videoId = getVideoId(videoUrl);
  if (!videoId) {
    return `[YouTube URLの解析に失敗: ${videoUrl}]`;
  }

  const rolePrompt = ROLE_PROMPTS[role] ?? ROLE_PROMPTS.a;

  // Gemini can't actually watch YouTube videos via API directly.
  // Instead, we use YouTube's oEmbed + title/description metadata
  // and ask Gemini to analyze based on the video title and context.
  // For full transcript analysis, the user should run `npm run analyze:youtube` locally.

  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;

  let videoTitle = "";
  try {
    const oembedRes = await fetch(oembedUrl);
    if (oembedRes.ok) {
      const oembed = (await oembedRes.json()) as { title?: string };
      videoTitle = oembed.title ?? "";
    }
  } catch {
    // ignore
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `あなたはYouTube動画の内容を分析するアシスタントです。

以下のYouTube動画について、タイトルとURLから推測できる内容を分析してください。

動画URL: ${videoUrl}
動画タイトル: ${videoTitle || "不明"}

${rolePrompt}

注意:
- 実際の動画を視聴できないため、タイトル・URL・一般的な知識から推測してください。
- 記事の素材として使える具体的なアドバイスや比較ポイントを生成してください。
- 日本語で回答してください。
- 動画の要約ではなく、記事執筆者が使える「素材」として整理してください。`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const json = await response.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { title, videos } = body as {
    title: string;
    videos: VideoInput[];
  };

  if (!title || !videos || videos.length === 0) {
    return NextResponse.json(
      { error: "title and videos[] are required" },
      { status: 400 }
    );
  }

  // Analyze each video with Gemini
  const analyses: Array<{ url: string; analysis: string }> = [];

  for (const video of videos) {
    try {
      const analysis = await analyzeVideoWithGemini(video.url, video.role);
      analyses.push({ url: video.url, analysis });
    } catch (err) {
      console.error(`[analyze] Failed for ${video.url}:`, err);
      analyses.push({
        url: video.url,
        analysis: `[分析失敗: ${err instanceof Error ? err.message : "Unknown error"}]`,
      });
    }
  }

  // Save to research/youtube/
  const outputSlug = slugify(title) || `youtube-research-${new Date().toISOString().slice(0, 10)}`;
  const outputDir = path.join(process.cwd(), "research", "youtube");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `${outputSlug}.json`);
  const outputData = {
    title,
    model: GEMINI_MODEL,
    generatedAt: new Date().toISOString(),
    videos: analyses,
  };

  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), "utf8");

  return NextResponse.json({
    success: true,
    filename: `${outputSlug}.json`,
    videoCount: analyses.length,
    title,
  });
}
