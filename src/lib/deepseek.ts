/**
 * DeepSeek API client for article generation.
 * Supports smart ASP material insertion based on usage_type/display_style.
 */

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE = "https://api.deepseek.com/v1/chat/completions";

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekResult {
  content: string;
  tokensUsed: number;
}

export async function callDeepSeek(
  messages: DeepSeekMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<DeepSeekResult> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not set");
  }

  const response = await fetch(DEEPSEEK_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API error (${response.status}): ${errText}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content ?? "";
  const tokensUsed = json.usage?.total_tokens ?? 0;

  return { content, tokensUsed };
}

export interface AspMaterialForPrompt {
  name: string;
  description: string | null;
  affiliateUrl: string | null;
  priceNote: string | null;
  usageType: string;
  displayStyle: string;
  placementContext: string | null;
  variationLabel: string | null;
}

/**
 * Generate per-material insertion instructions based on usage_type and display_style.
 */
function buildMaterialInstruction(m: AspMaterialForPrompt, index: number): string {
  const priceStr = m.priceNote ? `（価格: ${m.priceNote}）` : "";
  const descStr = m.description ? ` - ${m.description}` : "";
  const urlStr = m.affiliateUrl ? `\n   アフィリエイトリンク: ${m.affiliateUrl}` : "";
  const ctxStr = m.placementContext ? `\n   推奨挿入箇所: ${m.placementContext}` : "";

  const displayHints: Record<string, string> = {
    product_card:
      "商品カード形式で紹介してください。商品名・説明・価格・リンクを含め、読者がクリックしたくなる自然な紹介文を書いてください。",
    inline_link:
      "文中で自然にリンクとして埋め込んでください。押し売り感のない、文脈に沿った紹介にしてください。",
    comparison_row:
      "比較表の1行として掲載してください。他の選択肢と並べて、この商品の強みが際立つように書いてください。",
    cta_banner:
      "記事の結論部分でCTA（コールトゥアクション）として目立つ形で紹介してください。「今すぐチェック」「詳細を見る」などの行動を促す表現を使ってください。",
  };

  const usageHints: Record<string, string> = {
    recommendation:
      "これは読者に最もおすすめしたい商品です。自信を持って推すトーンで紹介してください。",
    comparison:
      "他の選択肢と比較する文脈で紹介し、この商品の差別化ポイントを明確にしてください。",
    tool_intro:
      "必要な道具・機材として自然に導入部分で紹介してください。なぜこれが必要なのか理由を添えてください。",
    budget_option:
      "予算を抑えたい読者向けの選択肢として紹介してください。コストパフォーマンスの良さを強調してください。",
    step_up:
      "「次のステップ」として、基本をマスターした後に検討すべき上位モデルとして紹介してください。",
  };

  const hint = displayHints[m.displayStyle] ?? displayHints.product_card;
  const usage = usageHints[m.usageType] ?? "";

  return [
    `${index + 1}. 【${m.name}】${m.variationLabel ? ` (${m.variationLabel})` : ""}${priceStr}${descStr}`,
    `   用途: ${usage}`,
    `   表示: ${hint}${urlStr}${ctxStr}`,
  ].join("\n");
}

/**
 * Build system prompt with category feedback injection + smart ASP material insertion.
 */
export function buildArticleSystemPrompt(params: {
  base?: string;
  feedbackSuffix: string;
  aspMaterials: AspMaterialForPrompt[];
  extraInstructions?: string;
}): string {
  const parts: string[] = [
    params.base ??
      "あなたはSEOに強い日本語のブログ記事を書くプロのライターです。読者が「今日から始められる」と感じる、具体的で実践的な記事を書いてください。一般論ではなく、具体的な手順・数字・判断基準を盛り込んでください。",
  ];

  // ASP material instructions with smart insertion logic
  if (params.aspMaterials.length > 0) {
    const instructions = params.aspMaterials.map((m, i) =>
      buildMaterialInstruction(m, i)
    );

    // Group by usage_type for structural guidance
    const byUsage = new Map<string, AspMaterialForPrompt[]>();
    for (const m of params.aspMaterials) {
      const key = m.usageType;
      if (!byUsage.has(key)) byUsage.set(key, []);
      byUsage.get(key)!.push(m);
    }

    const structureHints: string[] = [];
    if (byUsage.has("tool_intro")) {
      structureHints.push("・「必要なもの」セクションで道具・機材を紹介");
    }
    if (byUsage.has("comparison")) {
      structureHints.push("・「比較」セクションで複数の選択肢を表形式で比較");
    }
    if (byUsage.has("recommendation")) {
      structureHints.push("・「おすすめ」セクションで最も推す商品を紹介");
    }
    if (byUsage.has("budget_option")) {
      structureHints.push("・「予算別」セクションで価格帯ごとの選択肢を提示");
    }
    if (byUsage.has("step_up")) {
      structureHints.push("・記事後半で「次のステップ」として上位モデルを紹介");
    }

    parts.push(
      "",
      "【必ず含めるアフィリエイト素材と挿入方法】",
      "以下の商品/サービスを必ず記事内で紹介してください。それぞれ用途と表示形式が指定されています。",
      "収益につながる重要な紹介です。読者にとって有益な文脈で自然に組み込んでください。",
      "",
      ...instructions,
    );

    if (structureHints.length > 0) {
      parts.push(
        "",
        "【推奨する記事構成】",
        "以下のセクション構成を参考に、素材を適切な位置に配置してください：",
        ...structureHints
      );
    }
  }

  // Extra instructions
  if (params.extraInstructions) {
    parts.push("", "【追加指示】", params.extraInstructions);
  }

  // Feedback injection
  if (params.feedbackSuffix) {
    parts.push(params.feedbackSuffix);
  }

  parts.push(
    "",
    "【アフィリエイトリンクの書き方ルール】",
    "・リンクテキストは「[商品名]をチェック」「[商品名]の詳細を見る」のように自然に",
    "・URLは Markdown リンク形式 [リンクテキスト](URL) で記述",
    "・同じ商品のリンクは記事内で1〜2回まで",
    "・読者にとって「このリンクを踏むとどうなるか」がわかる表現を添える"
  );

  return parts.join("\n");
}

/**
 * Build user prompt for article generation.
 */
export function buildArticleUserPrompt(params: {
  title: string;
  category: string;
}): string {
  return [
    `以下のタイトルでブログ記事をMarkdown形式で生成してください。`,
    "",
    `タイトル: ${params.title}`,
    `カテゴリ: ${params.category}`,
    "",
    "条件:",
    "- 見出しは##を使用",
    "- 読者が今日できる具体的なアクションを必ず1つ含める",
    "- 初心者がつまずくポイントとその解決策を書く",
    "- 2000〜3000文字程度",
    "- アフィリエイトリンクは本文の流れに自然に溶け込ませる",
    "- 押し売り感のない、読者目線の文章にする",
    "- コードブロックや表は使わず、文章とリスト中心で構成",
    "- 指定された素材は必ず指定された形式で挿入する",
  ].join("\n");
}
