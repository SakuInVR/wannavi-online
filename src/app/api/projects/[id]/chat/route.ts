import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { getSupabaseAdmin } from "@/lib/supabase";
import { callDeepSeek, type DeepSeekMessage } from "@/lib/deepseek";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await props.params;
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { stepIndex, message } = await req.json();

    if (stepIndex === undefined || stepIndex < 0 || stepIndex > 4) {
      return NextResponse.json({ error: "Invalid stepIndex (must be 0-4)" }, { status: 400 });
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Missing message content" }, { status: 400 });
    }

    // 1. Verify project ownership and fetch article (roadmap) context
    const { data: project, error: projectError } = await supabase
      .from("user_projects")
      .select(`
        id,
        article_id,
        articles:article_id (
          title,
          body,
          description,
          category
        )
      `)
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
    }

    // 2. Fetch specific step memo and details
    const { data: step, error: stepError } = await supabase
      .from("project_steps")
      .select("memo, status, target_date")
      .eq("project_id", projectId)
      .eq("step_index", stepIndex)
      .maybeSingle();

    if (stepError) throw stepError;

    // 3. Check user profile for subscription status and credits
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_status, credits")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    const isPro = profile?.subscription_status === "active" || profile?.subscription_status === "pro";
    let remainingCredits = profile?.credits ?? 0;

    if (!isPro) {
      if (remainingCredits < 1) {
        return NextResponse.json(
          {
            error: "INSUFFICIENT_CREDITS",
            message: "AIメンターとの相談にはクレジットが必要です。Wannavi Proに加入するか、追加のクレジットをチャージしてください。",
          },
          { status: 403 }
        );
      }
    }

    // 4. Fetch chat history for this specific step (limit to last 10 messages to keep context concise)
    const { data: chatHistory, error: chatError } = await supabase
      .from("project_messages")
      .select("sender, content, created_at")
      .eq("project_id", projectId)
      .eq("step_index", stepIndex)
      .order("created_at", { ascending: true })
      .limit(10);

    if (chatError) throw chatError;

    // 5. Construct Contextual System Prompt
    const articleInfo = (project as any).articles;
    const systemPrompt = [
      "あなたはWannavi（ワナナビ）専属の超一流AIラーニングメンター（パーソナルコーチ）です。",
      `現在、ユーザーはロードマップ『${articleInfo.title}』の「ステップ ${stepIndex + 1}」を進めています。`,
      `ロードマップの説明: ${articleInfo.description}`,
      `分野カテゴリー: ${articleInfo.category}`,
      "",
      "【ロードマップ本文（全体コンテキスト）】",
      "ユーザーが学習している全ロードマップの内容です。回答の文脈作りに活用してください：",
      articleInfo.body,
      "",
      "【ユーザーの現在のステップ状況】",
      `・対象ステップ: ステップ ${stepIndex + 1}`,
      `・進捗ステータス: ${step?.status || "todo"}`,
      `・目標期限: ${step?.target_date ? new Date(step.target_date).toLocaleDateString() : "未設定"}`,
      `・ユーザーの学習メモ（現在考えていること・課題）: ${step?.memo || "未記入"}`,
      "",
      "【メンターとしての振る舞いガイドライン】",
      "1. 読者を温かく励まし、挫折を防ぐモチベーターとして接してください。",
      "2. 質問に対して、一般論ではなく、このロードマップの文脈やユーザーのメモに基づいた『極めて具体的で今すぐ実行できる解決策』を回答してください。",
      "3. プログラミングであれば具体的なコード例やエラーの対処プロセスを、音楽・クリエイティブであれば練習方法や具体的なチェック工程をステップバイステップで親身に伝えてください。",
      "4. 短くシンプルに答えるのではなく、プロフェッショナルとしての権威性と信頼感を感じる、丁寧で中身の濃い記述を心がけてください。",
    ].join("\n");

    // 6. Build Message Array for DeepSeek call
    const deepseekMessages: DeepSeekMessage[] = [
      { role: "system", content: systemPrompt },
    ];

    // Append chat history
    (chatHistory || []).forEach((msg) => {
      deepseekMessages.push({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
      });
    });

    // Append current user message
    deepseekMessages.push({ role: "user", content: message });

    // 7. Call DeepSeek
    const aiResult = await callDeepSeek(deepseekMessages, { temperature: 0.7 });
    const replyContent = aiResult.content;

    // 8. Save user message and AI assistant response to Database
    const { error: saveUserMsgError } = await supabase
      .from("project_messages")
      .insert({
        project_id: projectId,
        step_index: stepIndex,
        sender: "user",
        content: message,
      });

    if (saveUserMsgError) throw saveUserMsgError;

    const { error: saveAiMsgError } = await supabase
      .from("project_messages")
      .insert({
        project_id: projectId,
        step_index: stepIndex,
        sender: "assistant",
        content: replyContent,
      });

    if (saveAiMsgError) throw saveAiMsgError;

    // 9. Consume credit if user is not Pro
    if (!isPro) {
      remainingCredits = remainingCredits - 1;
      const { error: creditError } = await supabase
        .from("profiles")
        .update({ credits: remainingCredits })
        .eq("id", user.id);

      if (creditError) throw creditError;
    }

    return NextResponse.json({
      success: true,
      reply: replyContent,
      remainingCredits,
      isPro,
    });
  } catch (error: any) {
    console.error("AI Mentor Chat error:", error);
    return NextResponse.json({ error: error.message || "Failed to process chat" }, { status: 500 });
  }
}
