import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import {
  callDeepSeek,
  buildThreeVideoSystemPrompt,
  buildThreeVideoUserPrompt,
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

    // 2. Check credit balance
    const { data: profile, error: profileFetchError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    if (profileFetchError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    if ((profile.credits ?? 0) <= 0) {
      return NextResponse.json({ error: "クレジット残高がありません。追加購入してください。" }, { status: 402 });
    }

    // Parse request body
    const body = await req.json();
    const { title, category, youtubeUrls = [], affiliateIntent = "medium", extra_instructions } = body;

    if (!title || !category) {
      return NextResponse.json({ error: "Title and Category are required" }, { status: 400 });
    }

    // 3. Deduct credit transactionally (deduct first to avoid double generation race conditions)
    const newCredits = profile.credits - 1;
    const { error: deductError } = await supabase
      .from("profiles")
      .update({ credits: newCredits, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (deductError) {
      console.error("Credit deduction failed:", deductError);
      return NextResponse.json({ error: "Failed to deduct credit balance" }, { status: 500 });
    }

    // 4. Video research with Gemini
    const videoSources = await researchVideos(title, category, youtubeUrls);
    const videoA: VideoAnalysis = { url: videoSources[0]?.url || "", analysis: videoSources[0]?.analysis || "" };
    const videoB: VideoAnalysis = { url: videoSources[1]?.url || "", analysis: videoSources[1]?.analysis || "" };
    const videoC: VideoAnalysis = { url: videoSources[2]?.url || "", analysis: videoSources[2]?.analysis || "" };

    // 5. ASP materials auto-selection
    let aspMaterials: AspMaterialForPrompt[] = [];
    const materialIds: string[] = [];

    const { data: allMaterials } = await supabase
      .from("asp_materials")
      .select("*")
      .eq("status", "active")
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (allMaterials && allMaterials.length > 0) {
      const matched = allMaterials.filter((m) => m.category_hint === category);
      const fallback = allMaterials.filter((m) => !m.category_hint);
      const selected = (matched.length > 0 ? matched : fallback).slice(0, 5);

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

    // 6. Fetch past feedback learning loop
    const feedbackEntries = await fetchCategoryFeedback(category);
    const feedbackSuffix = buildFeedbackInjection(feedbackEntries);

    // 7. Prompt building
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

    // 8. Generate outline and slug
    let baseSlug = title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

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
        title,
        category,
        asp_material_ids: materialIds.filter((id) => id && id !== ""),
        extra_instructions: extra_instructions ?? null,
        status: "running",
      })
      .select("id")
      .single();

    // 9. Call DeepSeek LLM
    const result = await callDeepSeek([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const { cleanBody: rawBody, tags } = extractTags(result.content);

    // Enrich body text with links
    let cleanBody = enrichArticleWithSearchLinks(rawBody);
    const enriched = await enrichArticleWithProductSearch(cleanBody);
    cleanBody = enriched.body;
    const description = cleanBody.slice(0, 200).replace(/\n/g, " ");

    // Append "ユーザー投稿" automatically to the article tags
    const finalTags = Array.from(new Set([...tags, "ユーザー投稿"]));

    // Save article to DB under user_id
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .insert({
        slug,
        title,
        description,
        category,
        body: cleanBody,
        tags: finalTags,
        review_status: "pending", // Draft review required by the user
        pipeline_state: "drafted",
        user_id: user.id, // Sets ownership
        affiliate_intent: affiliateIntent,
        generation_job_id: job?.id || null,
      })
      .select("id, slug")
      .single();

    if (articleError) {
      console.error("Save article failed:", articleError);
      // Try to refund the user credit if article save fails
      await supabase
        .from("profiles")
        .update({ credits: profile.credits, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      return NextResponse.json({ error: `記事の保存に失敗しました: ${articleError.message}` }, { status: 500 });
    }

    // Link ASP materials to article
    const validMaterialIds = materialIds.filter((id) => id && id !== "");
    if (validMaterialIds.length > 0 && article) {
      const rows = validMaterialIds.map((mid) => ({
        article_id: article.id,
        asp_material_id: mid,
      }));
      await supabase.from("article_asp_materials").insert(rows);
    }

    // Link video sources to research_sources
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

    return NextResponse.json({
      success: true,
      article_id: article.id,
      slug: article.slug,
      credits_remaining: newCredits,
    });
  } catch (err: unknown) {
    console.error("Public generate error:", err);
    return NextResponse.json({ error: (err as Error).message || "Internal server error" }, { status: 500 });
  }
}
