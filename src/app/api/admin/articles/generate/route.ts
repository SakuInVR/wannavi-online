import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { callDeepSeek, buildArticleSystemPrompt, buildArticleUserPrompt } from "@/lib/deepseek";
import type { AspMaterialForPrompt } from "@/lib/deepseek";
import { buildFeedbackInjection, fetchCategoryFeedback } from "@/lib/feedback";

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await request.json();
  const { title, category, asp_material_ids, extra_instructions } = body;

  if (!title || !category) {
    return NextResponse.json(
      { error: "title and category are required" },
      { status: 400 }
    );
  }

  const materialIds: string[] = asp_material_ids ?? [];

  // 1. Fetch ASP materials with full metadata
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

  // 2. Fetch past feedback for this category
  const feedbackEntries = await fetchCategoryFeedback(category);
  const feedbackSuffix = buildFeedbackInjection(feedbackEntries);

  // 3. Build prompts
  const systemPrompt = buildArticleSystemPrompt({
    feedbackSuffix,
    aspMaterials,
    extraInstructions: extra_instructions ?? undefined,
  });

  const userPrompt = buildArticleUserPrompt({ title, category });

  // 4. Create generation job record
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
      asp_material_ids: materialIds,
      extra_instructions: extra_instructions ?? null,
      status: "running",
    })
    .select("id")
    .single();

  if (jobError) {
    console.error("[generate] job insert error:", jobError);
    return NextResponse.json({ error: jobError.message }, { status: 500 });
  }

  // 5. Call DeepSeek
  try {
    const result = await callDeepSeek([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    // 6. Insert article as pending
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

    // 7. Link ASP materials to article
    if (materialIds.length > 0 && article) {
      const rows = materialIds.map((mid) => ({
        article_id: article.id,
        asp_material_id: mid,
      }));
      await supabase.from("article_asp_materials").insert(rows);
    }

    // 8. Update job as completed
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

    // 9. Discord notification (fire-and-forget)
    const webhookUrl = process.env.DISCORD_REVIEW_WEBHOOK_URL;
    if (webhookUrl && article) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `📝 **新着記事の生成完了**\nレビューURL: http://localhost:3000/admin/review/${article.id}\nタイトル: ${title}\nカテゴリ: ${category}`,
        }),
      }).catch((e) => console.error("[generate] Discord notify error:", e));
    }

    return NextResponse.json({
      success: true,
      article_id: article?.id,
      job_id: job.id,
      tokens_used: result.tokensUsed,
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
