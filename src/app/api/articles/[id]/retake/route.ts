import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import {
  callDeepSeek,
  buildArticleSystemPrompt,
  buildArticleUserPrompt,
  extractTags,
} from "@/lib/deepseek";
import type { AspMaterialForPrompt } from "@/lib/deepseek";
import { buildFeedbackInjection, fetchCategoryFeedback } from "@/lib/feedback";
import { enrichArticleWithSearchLinks } from "@/lib/amazon";
import { enrichArticleWithProductSearch } from "@/lib/product-search";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

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

    // 2. Fetch current article and check ownership
    const { data: article, error: fetchError } = await supabase
      .from("articles")
      .select("id, title, description, category, body, user_id, free_retake_used")
      .eq("id", id)
      .single();

    if (fetchError || !article) {
      return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
    }

    if (article.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this article" }, { status: 403 });
    }

    const body = await req.json();
    const { retake_instructions } = body;

    if (!retake_instructions || typeof retake_instructions !== "string" || !retake_instructions.trim()) {
      return NextResponse.json(
        { error: "修正指示（指示内容）を入力してください。" },
        { status: 400 }
      );
    }

    // 3. Billing check (Free vs Credit deduction)
    let creditsRemaining = null;
    const isFreeRetake = !article.free_retake_used;

    if (!isFreeRetake) {
      // Must deduct 1 credit
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

      // Deduct credit
      creditsRemaining = profile.credits - 1;
      const { error: deductError } = await supabase
        .from("profiles")
        .update({ credits: creditsRemaining, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (deductError) {
        console.error("Deduct credit for retake failed:", deductError);
        return NextResponse.json({ error: "Failed to deduct credit balance" }, { status: 500 });
      }
    }

    // 4. Save retake instruction details to the article state
    const { error: updateError } = await supabase
      .from("articles")
      .update({
        retake_instructions: retake_instructions.trim(),
        previous_body: article.body,
        free_retake_used: true, // Mark free retake as used
        review_status: "pending",
        pipeline_state: "improving",
        state_updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Update article retake state failed:", updateError);
      return NextResponse.json({ error: "Failed to update article status" }, { status: 500 });
    }

    // 5. LLM Regeneration Process
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

    // Build retake context prompts
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

    // Create job log record
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

    const { cleanBody: rawBody, tags } = extractTags(result.content);

    // Link enrichments
    let cleanBody = enrichArticleWithSearchLinks(rawBody);
    const enriched = await enrichArticleWithProductSearch(cleanBody);
    cleanBody = enriched.body;
    const description = cleanBody.slice(0, 200).replace(/\n/g, " ");

    // Maintain "ユーザー投稿" tag
    const finalTags = Array.from(new Set([...tags, "ユーザー投稿"]));

    // Save back to DB
    const { error: saveError } = await supabase
      .from("articles")
      .update({
        body: cleanBody,
        description,
        tags: finalTags,
        pipeline_state: "drafted", // Go back to draft so user can review again
        generation_job_id: job?.id ?? null,
        state_updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (saveError) {
      console.error("Save regenerated article failed:", saveError);
      return NextResponse.json({ error: "Failed to save regenerated article" }, { status: 500 });
    }

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
      message: isFreeRetake ? "無料リテイク（再作成）が完了しました！" : "リテイク（再作成）が完了しました！(1クレジット消費しました)",
      article_id: id,
      credits_remaining: creditsRemaining,
    });
  } catch (err: unknown) {
    console.error("Public retake error:", err);
    return NextResponse.json({ error: (err as Error).message || "Internal server error" }, { status: 500 });
  }
}
