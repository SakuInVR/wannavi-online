import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import {
  callDeepSeek,
  buildThreeVideoSystemPrompt,
  buildThreeVideoUserPrompt,
  buildRoadmapSystemPrompt,
  buildRoadmapUserPrompt,
  extractTags,
} from "@/lib/deepseek";
import type { AspMaterialForPrompt, VideoAnalysis } from "@/lib/deepseek";
import { buildFeedbackInjection, fetchCategoryFeedback } from "@/lib/feedback";
import { enrichArticleWithSearchLinks } from "@/lib/amazon";
import { enrichArticleWithProductSearch } from "@/lib/product-search";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

interface VideoSource {
  url: string;
  analysis: string;
}

async function analyzeWithGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${err}`);
  }

  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function researchVideos(
  title: string,
  category: string,
  youtubeUrls: string[]
): Promise<VideoSource[]> {
  const sources: VideoSource[] = [];

  if (youtubeUrls.length > 0) {
    for (let i = 0; i < Math.min(youtubeUrls.length, 3); i++) {
      const url = youtubeUrls[i];
      const roleLabel = ["初心者がぶつかる壁", "上級者の練習ロジック", "機材・デバイスレビュー"][i];
      const prompt = `あなたはYouTube動画の内容を分析するアシスタントです。

以下のYouTube動画について分析してください：
動画URL: ${url}
分析の視点: 「${roleLabel}」

「${title}」という記事を書くための素材として、具体的なアドバイス、つまずきポイント、機材情報などを抽出してください。
実際の動画を視聴できないため、タイトル・URL・一般知識から推測して分析してください。
日本語で、記事執筆者がそのまま使える「素材」として整理してください。`;
      
      try {
        const analysis = await analyzeWithGemini(prompt);
        sources.push({ url, analysis });
      } catch (err) {
        console.error(`[research] Gemini failed for ${url}:`, err);
        sources.push({ url, analysis: `[分析失敗]` });
      }
    }
  } else {
    const roles = [
      "初心者がぶつかる壁やつまずきポイント",
      "上級者・プロの練習ロジックや効率的な上達法",
      "必要な機材・デバイスのレビューと選び方",
    ];

    for (let i = 0; i < 3; i++) {
      const prompt = `あなたはブログ記事のリサーチャーです。

記事タイトル: 「${title}」
カテゴリ: ${category}

以下の視点で、この記事を書くためのリサーチを行ってください：
「${roles[i]}」

あなたの幅広い知識を活かして、具体的なアドバイス、数値、機材名、価格帯、練習方法、つまずきポイントなどを詳しく列挙してください。
実際のYouTube動画の分析をシミュレートする形で、記事執筆者がそのまま使える「素材」として整理してください。`;

      try {
        const analysis = await analyzeWithGemini(prompt);
        sources.push({
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " " + roles[i].slice(0, 5))}`,
          analysis,
        });
      } catch (err) {
        console.error(`[research] Fallback research failed:`, err);
        sources.push({ url: "", analysis: `[リサーチ失敗]` });
      }
    }
  }

  return sources;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    // Parse request body
    const body = await req.json();
    const { 
      goal, 
      category, 
      currentSkill = "完全初心者", 
      availableTime = "毎日1時間", 
      budget = "できるだけ低予算", 
      youtubeUrls = [], 
      extra_instructions,
      isPrivate = false
    } = body;

    if (!goal || !category) {
      return NextResponse.json({ error: "Goal and Category are required" }, { status: 400 });
    }

    // 2. Video research with Gemini (only if youtubeUrls are provided to save time/cost)
    let videoSources: VideoSource[] = [];
    if (youtubeUrls && youtubeUrls.length > 0) {
      videoSources = await researchVideos(goal, category, youtubeUrls);
    }

    // 3. Prompt building for Personalized Roadmap
    // Note: We bypass all affiliate products logic here since this is a user-centric high-quality roadmap.
    const systemPrompt = buildRoadmapSystemPrompt({
      goal,
      category,
      currentSkill,
      availableTime,
      budget,
      extraInstructions: extra_instructions ?? undefined,
    });

    const userPrompt = buildRoadmapUserPrompt({
      goal,
      category,
      currentSkill,
      availableTime,
      budget,
      extraInstructions: extra_instructions ?? undefined,
    });

    // 4. Generate outline and slug
    let baseSlug = goal
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    // Japanese or fallback slug handling
    if (!baseSlug || baseSlug.length < 3) {
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      baseSlug = `${category}-${randomSuffix}`;
    }

    let slug = baseSlug;
    let suffix = 2;
    while (true) {
      const { data: existing } = await supabase
        .from("articles")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    // Create background job logger
    const { data: job } = await supabase
      .from("article_generation_jobs")
      .insert({
        title: `「${goal}」の達成ロードマップ`,
        category,
        asp_material_ids: [],
        extra_instructions: extra_instructions ?? null,
        status: "running",
      })
      .select("id")
      .single();

    // 5. Call DeepSeek LLM
    const result = await callDeepSeek([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const { cleanBody, tags } = extractTags(result.content);
    const description = cleanBody.slice(0, 200).replace(/\n/g, " ") + "...";

    // Auto tags
    const finalTags = Array.from(new Set([...tags, "ユーザー投稿", "ロードマップ"]));

    // Save article to DB under user_id
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .insert({
        slug,
        title: `「${goal}」の達成ロードマップ`,
        description,
        category,
        body: cleanBody,
        tags: finalTags,
        review_status: "pending", // Draft review required by the user
        pipeline_state: "drafted",
        user_id: user.id, // Sets ownership
        generation_job_id: job?.id || null,
        is_private: !!isPrivate,
        generation_input: {
          goal,
          currentSkill,
          availableTime,
          budget,
          extraInstructions: extra_instructions ?? null
        }
      })
      .select("id, slug")
      .single();

    if (articleError) {
      console.error("Save article failed:", articleError);
      return NextResponse.json({ error: `記事の保存に失敗しました: ${articleError.message}` }, { status: 500 });
    }

    // Link video sources to research_sources (if any)
    if (article && videoSources.length > 0) {
      const sourceRows = videoSources
        .filter((vs) => vs.url && vs.url.startsWith("http"))
        .map((vs) => ({
          article_id: article.id,
          source_type: "youtube",
          url: vs.url,
        }));
      if (sourceRows.length > 0) {
        await supabase.from("research_sources").insert(sourceRows);
      }
    }

    // Update job log status
    if (job) {
      await supabase
        .from("article_generation_jobs")
        .update({
          status: "completed",
          result_body: cleanBody,
          deepseek_tokens: result.tokensUsed,
          article_id: article.id,
          finished_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }

    // Fetch updated credits info to return
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      success: true,
      article_id: article.id,
      slug: article.slug,
      credits_remaining: profile?.credits ?? 0,
    });
  } catch (err: unknown) {
    console.error("Public generate error:", err);
    return NextResponse.json({ error: (err as Error).message || "Internal server error" }, { status: 500 });
  }
}
