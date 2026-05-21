import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  callDeepSeek,
  buildThreeVideoSystemPrompt,
  buildThreeVideoUserPrompt,
} from "@/lib/deepseek";
import type { AspMaterialForPrompt, VideoAnalysis } from "@/lib/deepseek";
import { buildFeedbackInjection, fetchCategoryFeedback } from "@/lib/feedback";

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await request.json();
  const { title, category, research_filename, asp_material_ids, extra_instructions } = body;

  if (!title || !category || !research_filename) {
    return NextResponse.json(
      { error: "title, category, and research_filename are required" },
      { status: 400 }
    );
  }

  // 1. Read research JSON
  const researchPath = path.join(
    process.cwd(),
    "research",
    "youtube",
    research_filename
  );

  if (!fs.existsSync(researchPath)) {
    return NextResponse.json(
      { error: `Research file not found: ${research_filename}` },
      { status: 404 }
    );
  }

  let researchData: { title?: string; videos?: Array<{ url: string; analysis: string }> };
  try {
    researchData = JSON.parse(fs.readFileSync(researchPath, "utf8"));
  } catch {
    return NextResponse.json(
      { error: "Failed to parse research JSON" },
      { status: 400 }
    );
  }

  const videos = researchData.videos ?? [];
  if (videos.length < 1) {
    return NextResponse.json(
      { error: "Research JSON has no video analyses" },
      { status: 400 }
    );
  }

  // Assign videos to A/B/C slots
  const videoA: VideoAnalysis = videos[0] ?? { url: "", analysis: "" };
  const videoB: VideoAnalysis = videos[1] ?? videos[0] ?? { url: "", analysis: "" };
  const videoC: VideoAnalysis = videos[2] ?? videos[0] ?? { url: "", analysis: "" };

  // 2. Fetch ASP materials
  const materialIds: string[] = asp_material_ids ?? [];
  let aspMaterials: AspMaterialForPrompt[] = [];

  if (materialIds.length > 0) {
    const { data: materials } = await supabase
      .from("asp_materials")
      .select(
        "name, description, affiliate_url, price_note, usage_type, display_style, placement_context, variation_label, material_type, banner_width, banner_height, image_url, text_content, link_normal, link_amp, link_nojs, disclosure_info"
      )
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
  }

  // 3. Fetch feedback
  const feedbackEntries = await fetchCategoryFeedback(category);
  const feedbackSuffix = buildFeedbackInjection(feedbackEntries);

  // 4. Build prompts
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

  // 5. Create job record
  const baseSlug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  // 重複slugを避ける
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

  // 6. Call DeepSeek
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

    const validMaterialIds = materialIds.filter(id => id && id !== "");
    if (validMaterialIds.length > 0 && article) {
      const rows = validMaterialIds.map((mid) => ({
        article_id: article.id,
        asp_material_id: mid,
      }));
      await supabase.from("article_asp_materials").insert(rows);
    }

    // Save video sources to research_sources table
    if (article && videos.length > 0) {
      const sourceRows = videos
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
      body_preview: result.content.slice(0, 300),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-from-research] error:", message);

    await supabase
      .from("article_generation_jobs")
      .update({ status: "failed", error_message: message })
      .eq("id", job.id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
