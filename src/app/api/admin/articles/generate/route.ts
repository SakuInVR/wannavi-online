import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  callDeepSeek,
  buildThreeVideoSystemPrompt,
  buildThreeVideoUserPrompt,
} from "@/lib/deepseek";
import type { AspMaterialForPrompt, VideoAnalysis } from "@/lib/deepseek";
import { buildFeedbackInjection, fetchCategoryFeedback } from "@/lib/feedback";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash";

/* ------------------------------------------------------------------ */
/* Step 1: Auto video research with Gemini                            */
/* ------------------------------------------------------------------ */

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
    // User provided specific URLs - analyze each with Gemini
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
    // No URLs - Gemini generates topic research from its knowledge
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
実際のYouTube動画の分析をシミュレートする形で、記事執筆者がそのまま使える「素材」として整理してください。
日本語で回答してください。`;

      try {
        const analysis = await analyzeWithGemini(prompt);
        sources.push({ url: `auto-research-${i + 1}`, analysis });
      } catch (err) {
        console.error(`[research] Gemini failed for role ${i}:`, err);
        sources.push({ url: `auto-research-${i + 1}`, analysis: `[分析失敗]` });
      }
    }
  }

  return sources;
}

/* ------------------------------------------------------------------ */
/* POST                                                               */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await request.json();
  const {
    title,
    category,
    asp_material_ids,
    extra_instructions,
    youtube_urls,
  } = body;

  if (!title || !category) {
    return NextResponse.json(
      { error: "title and category are required" },
      { status: 400 }
    );
  }

  const materialIds: string[] = asp_material_ids ?? [];
  const urls: string[] = youtube_urls ?? [];

  // ── Step 1: Auto video research with Gemini ──
  let videoSources: VideoSource[] = [];
  try {
    videoSources = await researchVideos(title, category, urls);
  } catch (err) {
    console.error("[generate] Research failed:", err);
    // Continue with empty sources - DeepSeek can still generate
    videoSources = [
      { url: "research-failed", analysis: "動画リサーチに失敗しました。一般知識で記事を生成します。" },
      { url: "research-failed", analysis: "" },
      { url: "research-failed", analysis: "" },
    ];
  }

  const videoA: VideoAnalysis = videoSources[0] ?? { url: "", analysis: "" };
  const videoB: VideoAnalysis = videoSources[1] ?? videoSources[0] ?? { url: "", analysis: "" };
  const videoC: VideoAnalysis = videoSources[2] ?? videoSources[0] ?? { url: "", analysis: "" };

  // ── Step 2: Fetch ASP materials (auto-match by category) ──
  let aspMaterials: AspMaterialForPrompt[] = [];

  // If user selected specific ASPs, use those
  if (materialIds.length > 0) {
    const { data: materials } = await supabase
      .from("asp_materials")
      .select("*")
      .in("id", materialIds);

    aspMaterials =
      materials?.map((m) => ({
        name: m.name,
        description: m.description,
        affiliateUrl: m.affiliate_url,
        priceNote: m.price_note,
        usageType: m.usage_type ?? "recommendation",
        displayStyle: m.display_style ?? "product_card",
        placementContext: m.placement_context,
        variationLabel: m.variation_label,
        materialType: m.material_type ?? "banner",
        bannerWidth: m.banner_width,
        bannerHeight: m.banner_height,
        imageUrl: m.image_url,
        textContent: m.text_content,
        linkNormal: m.link_normal,
        linkAmp: m.link_amp,
        linkNojs: m.link_nojs,
        disclosureInfo: m.disclosure_info,
      })) ?? [];
  } else {
    // Auto-select: fetch active ASP materials, pick up to 5 that match category or are generic
    const { data: allMaterials } = await supabase
      .from("asp_materials")
      .select("*")
      .eq("status", "active")
      .is("parent_id", null) // only parent groups
      .order("created_at", { ascending: false })
      .limit(20);

    if (allMaterials && allMaterials.length > 0) {
      const matched = allMaterials.filter(
        (m) => !m.category_hint || m.category_hint === category
      );
      const selected = (matched.length > 0 ? matched : allMaterials).slice(0, 5);

      // Collect their IDs
      materialIds.length = 0;
      for (const m of selected) {
        materialIds.push(m.id);
      }

      aspMaterials = selected.map((m) => ({
        name: m.name,
        description: m.description,
        affiliateUrl: m.affiliate_url,
        priceNote: m.price_note,
        usageType: m.usage_type ?? "recommendation",
        displayStyle: m.display_style ?? "product_card",
        placementContext: m.placement_context,
        variationLabel: m.variation_label,
        materialType: m.material_type ?? "banner",
        bannerWidth: m.banner_width,
        bannerHeight: m.banner_height,
        imageUrl: m.image_url,
        textContent: m.text_content,
        linkNormal: m.link_normal,
        linkAmp: m.link_amp,
        linkNojs: m.link_nojs,
        disclosureInfo: m.disclosure_info,
      }));
    }
  }

  // ── Step 3: Fetch past feedback ──
  const feedbackEntries = await fetchCategoryFeedback(category);
  const feedbackSuffix = buildFeedbackInjection(feedbackEntries);

  // ── Step 4: Build prompts ──
  const systemPrompt = buildThreeVideoSystemPrompt({
    title,
    category,
    videoA,
    videoB,
    videoC,
    aspMaterials,
    extraInstructions: extra_instructions ?? undefined,
    feedbackSuffix,
  });

  const userPrompt = buildThreeVideoUserPrompt({
    title,
    category,
    videoA,
    videoB,
    videoC,
    aspMaterials,
    feedbackSuffix,
  });

  // ── Step 5: Create job record ──
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  const { data: job, error: jobError } = await supabase
    .from("article_generation_jobs")
    .insert({
      title,
      category,
      asp_material_ids: materialIds.filter(id => id && id !== ""),
      extra_instructions: extra_instructions ?? null,
      status: "running",
    })
    .select("id")
    .single();

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 });
  }

  // ── Step 6: Call DeepSeek ──
  try {
    const result = await callDeepSeek([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const description = result.content.slice(0, 200).replace(/\n/g, " ");

    const { data: article, error: articleError } = await supabase
      .from("articles")
      .insert({
        slug,
        title,
        description,
        category,
        body: result.content,
        review_status: "pending",
        pipeline_state: "drafted",
        generation_job_id: job.id,
      })
      .select("id")
      .single();

    if (articleError) {
      await supabase
        .from("article_generation_jobs")
        .update({ status: "failed", error_message: articleError.message })
        .eq("id", job.id);
      return NextResponse.json({ error: articleError.message }, { status: 500 });
    }

    // Link ASP materials (only if we have real UUIDs)
    const validMaterialIds = materialIds.filter(id => id && id !== "");
    if (validMaterialIds.length > 0 && article) {
      const rows = validMaterialIds.map((mid) => ({
        article_id: article.id,
        asp_material_id: mid,
      }));
      await supabase.from("article_asp_materials").insert(rows);
    }

    await supabase
      .from("article_generation_jobs")
      .update({
        status: "completed",
        result_body: result.content,
        deepseek_tokens: result.tokensUsed,
        article_id: article.id,
        finished_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return NextResponse.json({
      success: true,
      article_id: article?.id,
      job_id: job.id,
      tokens_used: result.tokensUsed,
      asp_materials_used: aspMaterials.length,
      research_sources: videoSources.length,
      body_preview: result.content.slice(0, 300),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate] DeepSeek error:", message);

    await supabase
      .from("article_generation_jobs")
      .update({ status: "failed", error_message: message })
      .eq("id", job.id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
