/**
 * DeepSeek API client for article generation.
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

/**
 * Build system prompt with category feedback injection + ASP material requirements.
 */
export function buildArticleSystemPrompt(params: {
  base?: string;
  feedbackSuffix: string;
  aspMaterials: Array<{ name: string; description: string | null; affiliateUrl: string | null }>;
  extraInstructions?: string;
}): string {
  const parts: string[] = [
    params.base ??
      "あなたはSEOに強い日本語のブログ記事を書くプロのライターです。読者が「今日から始められる」と感じる、具体的で実践的な記事を書いてください。一般論ではなく、具体的な手順・数字・判断基準を盛り込んでください。",
  ];

  // ASP material requirements
  if (params.aspMaterials.length > 0) {
    const aspLines = params.aspMaterials.map(
      (m, i) =>
        `${i + 1}. 【${m.name}】${m.description ?? ""}（アフィリエイトリンク: ${m.affiliateUrl ?? "URL未定"}）`
    );
    parts.push(
      "",
      "【必ず含めるASP素材】",
      "以下のアフィリエイト商品/サービスを必ず記事内で自然に紹介し、リンクを含めてください：",
      ...aspLines,
      "これらは記事の収益源となる重要な紹介です。読者にとって有益な文脈で自然に組み込んでください。"
    );
  }

  // Extra instructions
  if (params.extraInstructions) {
    parts.push("", "【追加指示】", params.extraInstructions);
  }

  // Feedback injection
  if (params.feedbackSuffix) {
    parts.push(params.feedbackSuffix);
  }

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
  ].join("\n");
}
