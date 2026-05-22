import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  callDeepSeek,
  buildArticleSystemPrompt,
  buildArticleUserPrompt,
  extractTags,
} from "@/lib/deepseek";
import type { AspMaterialForPrompt } from "@/lib/deepseek";
import { buildFeedbackInjection, fetchCategoryFeedback } from "@/lib/feedback";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await request.json();
  const { retake_instructions, auto_regenerate } = body;

  if (!retake_instructions || typeof retake_instructions !== "string" || !retake_instructions.trim()) {
    return NextResponse.json(
      { error: "retake_instructions は必須です（修正指示を入力してください）" },
      { status: 400 }
    );
  }

  // Fetch current article
  const { data: article, error: fetchError } = await supabase
    .from("articles")
    .select("id, title, description, category, body, review_status, slug")
    .eq("id", id)
    .single();

  if (fetchError || !article) {
    return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
  }

  // Save retake instructions and preserve previous body
  const { error: updateError } = await supabase
    .from("articles")
    .update({
      retake_instructions: retake_instructions.trim(),
      previous_body: article.body,
      review_status: "pending",
      pipeline_state: "improving",
      state_updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // If auto_regenerate is true, trigger DeepSeek generation with retake context
  if (auto_regenerate) {
    try {
      // Fetch linked ASP materials
      const { data: linkedAsps } = await supabase
        .from("article_asp_materials")
        .select("asp_material_id, asp_materials(*)")
        .eq("article_id", id);

      const rawMaterials: AspMaterialForPrompt[] = [];
      if (linkedAsps) {
        for (const row of linkedAsps) {
          const r = row as unknown as {
            asp_material_id: string;
            asp_materials: Record<string, unknown> | null;
          };
          if (!r.asp_materials) continue;
          const m = r.asp_materials;
          rawMaterials.push({
            name: m.name as string,
            description: (m.description as string) ?? null,
            affiliateUrl: (m.affiliate_url as string) ?? null,
            priceNote: (m.price_note as string) ?? null,
            usageType: (m.usage_type as string) ?? "recommendation",
            displayStyle: (m.display_style as string) ?? "product_card",
            placementContext: (m.placement_context as string) ?? null,
            variationLabel: (m.variation_label as string) ?? null,
            materialType: (m.material_type as string) ?? "banner",
            bannerWidth: (m.banner_width as number) ?? null,
            bannerHeight: (m.banner_height as number) ?? null,
            imageUrl: (m.image_url as string) ?? null,
            textContent: (m.text_content as string) ?? null,
            linkNormal: (m.link_normal as string) ?? null,
            linkAmp: (m.link_amp as string) ?? null,
            linkNojs: (m.link_nojs as string) ?? null,
            disclosureInfo: (m.disclosure_info as string) ?? null,
          });
        }
      }
      const aspMaterials: AspMaterialForPrompt[] = rawMaterials;

      // Fetch past feedback
      const feedbackEntries = await fetchCategoryFeedback(article.category);
      const feedbackSuffix = buildFeedbackInjection(feedbackEntries);

      // Build retake-specific system prompt
      const retakeContext = [
        "【リテイク（修正依頼）】",
        "あなたは以前に以下の記事を作成しました。今回は修正指示に従って記事を改善してください。",
        "",
        "【修正前の記事本文】",
        article.body ?? "（本文なし）",
        "",
        "【修正指示】",
        retake_instructions.trim(),
        "",
        "【重要】",
        "- 修正指示の内容を最優先で反映してください",
        "- 元の記事の良い部分は残しつつ、指示された箇所を修正・改善してください",
        "- 記事全体の一貫性を保ってください",
        "- タイトルは「" + article.title + "」のまま変更しないでください",
      ].join("\n");

      const systemPrompt = buildArticleSystemPrompt({
        feedbackSuffix,
        aspMaterials,
        extraInstructions: retakeContext,
        base: `あなたは「〇〇になりたい！」という読者の夢を応援する特化型ブログ「Wannavi」のプロフェッショナルライター兼メンターです。
「${article.title}」という読者に向けて記事を修正・改善します。
修正指示に従って、読者が「今日から何をすべきか」「どの機材を買うべきか」が明確にわかるロードマップ記事を作成してください。
読者に寄り添う、熱量のある「です・ます」調で、見出し・箇条書き・太字を使い、スマホでも読みやすく構造化してください。`,
      });

      const userPrompt = buildArticleUserPrompt({
        title: article.title,
        category: article.category,
      });

      // Create retake generation job
      const { data: job } = await supabase
        .from("article_generation_jobs")
        .insert({
          title: article.title,
          category: article.category,
          extra_instructions: retakeContext,
          status: "running",
          is_retake: true,
          previous_article_id: id,
        })
        .select("id")
        .single();

      // Call DeepSeek
      const result = await callDeepSeek([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      // Update article with new body
      const { cleanBody, tags } = extractTags(result.content);
      const description = cleanBody.slice(0, 200).replace(/\n/g, " ");
      await supabase
        .from("articles")
        .update({
          body: cleanBody,
          description,
          tags,
          generation_job_id: job?.id ?? null,
        })
        .eq("id", id);

      // Update job status
      if (job) {
        await supabase
          .from("article_generation_jobs")
          .update({
            status: "completed",
            result_body: cleanBody,
            deepseek_tokens: result.tokensUsed,
            article_id: id,
            finished_at: new Date().toISOString(),
          })
          .eq("id", job.id);
      }

      return NextResponse.json({
        success: true,
        regenerated: true,
        tokens_used: result.tokensUsed,
        article_id: id,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[retake] DeepSeek error:", message);

      return NextResponse.json({
        success: true,
        regenerated: false,
        warning: "リテイク指示を保存しましたが、記事の再生成に失敗しました（" + message + "）",
        article_id: id,
      });
    }
  }

  return NextResponse.json({
    success: true,
    regenerated: false,
    article_id: id,
  });
}
