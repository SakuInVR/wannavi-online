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
  materialType: string;
  bannerWidth: number | null;
  bannerHeight: number | null;
  imageUrl: string | null;
  textContent: string | null;
  linkNormal: string | null;
  linkAmp: string | null;
  linkNojs: string | null;
  disclosureInfo: string | null;
}

/**
 * Generate per-material insertion instructions based on usage_type and display_style.
 */
function buildMaterialInstruction(m: AspMaterialForPrompt, index: number): string {
  const priceStr = m.priceNote ? `（価格: ${m.priceNote}）` : "";
  const descStr = m.description ? ` - ${m.description}` : "";
  const ctxStr = m.placementContext ? `\n   推奨挿入箇所: ${m.placementContext}` : "";

  const displayHints: Record<string, string> = {
    product_card:
      `【表示形式：商品カード (JSXコンポーネント)】\n   必ず以下のJSXコンポーネントをそのまま（前後に空行を挟んで単独で）本文に記述してください。属性値は変えないでください。\n   <ToolRecommendation\n     name="${m.name}"\n     reason="[ここにこの商品を選ぶべき具体的な理由や読者へのメリットを、記事の文脈に合わせて2〜3文で記述してください。主観ではなく読者目線で書くこと。必ず具体的な日本語の文章を入れてください。]"\n     priceHint="${m.priceNote ?? "まずは無料または低予算から"}"\n     href="${m.affiliateUrl ?? "#"}"\n   />`,
    cta_banner:
      `【表示形式：CTAバナー (JSXコンポーネント)】\n   必ず以下のJSXコンポーネントをそのまま（前後に空行を挟んで単独で）本文に記述してください。属性値は変えないでください。\n   <AffiliateCTA\n     title="${m.name}"\n     description="[ここにこの案件・サービスを選ぶべき理由やメリットを、押し売り感なく、読者目線で2〜3文で記述してください。必ず具体的な日本語の文章を入れてください。]"\n     label="詳細をチェック"\n     href="${m.affiliateUrl ?? "#"}"\n   />`,
    inline_link:
      `【表示形式：文中リンク (Markdown)】\n   文脈に合わせて、Markdownリンク \`[${m.name}](${m.affiliateUrl ?? "#"})\` または \`[自然な紹介テキスト](${m.affiliateUrl ?? "#"})\` を自然に文中へ挿入してください。`,
    comparison_row:
      `【表示形式：比較表の行 (Markdown)】\n   比較表の1つの行としてこの商品を掲載し、リンクを \`[詳細](${m.affiliateUrl ?? "#"})\` または \`[${m.name}](${m.affiliateUrl ?? "#"})\` のように記述してください。`,
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
    `   表示指示: ${hint}${ctxStr}`,
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
    "【アフィリエイト・リンク記述の重要ルール】",
    "・表示指示が『商品カード（JSXコンポーネント）』または『CTAバナー（JSXコンポーネント）』に指定されている場合、Markdownリンクではなく、指定されたJSXタグ（`<ToolRecommendation ... />` または `<AffiliateCTA ... />`）を正確に出力してください。",
    "  - `<ToolRecommendation>` は記事生成後に自動で `<ProductRecommendation>` に変換され、Amazon と 楽天の両方の購入ボタンが表示されます。",
    "  - JSXタグの前後には必ず空行を入れてください。",
    "  - props（name, title, reason, description, href, priceHint など）の二重引用符（\"）や中括弧（{}）の対応を絶対に崩さないでください。閉じタグも忘れずに記述してください。",
    "・表示指示が『文中リンク』や『比較表の行』として指定されている場合は、Markdownの `[リンクテキスト](URL)` 形式で記述してください。",
    "・同じ商品のリンク/コンポーネントは、記事全体で1〜2回までに抑えてください。",
    "・押し売り感を避け、読者が納得して次の一歩を踏み出せる有益な情報・文脈を添えてください。",
    "",
    "【太字の使い分けルール】",
    "・**太字** は強調したい箇所に自由に使ってください（商品名以外の概念・考え方・注意点などにもOK）。",
    "・商品名や機材名を **太字** にする場合は、機材比較表・おすすめセクション・必要なものセクションなど「商品紹介」の文脈でのみ太字にしてください。",
    "・練習方法・考え方・手順の説明など、商品紹介でないセクションの太字はアフィリエイトリンクに変換されません。",
    "・「○○のスキルに必要なのは **モニターヘッドホン** ！」のような商品紹介文脈では積極的に太字を使ってください。",
    "",
    "【タグ出力ルール】",
    "・記事本文の最後に必ず以下の形式で5〜8個のタグ（日本語キーワード）を出力してください。",
    "・タグは記事の主要トピックを表すキーワードで、カンマ区切り、各タグは1〜10文字程度。",
    "・形式: `<!-- TAGS: タグ1, タグ2, タグ3, ... -->`",
    "・この行は必ず記事本文の一番最後に単独行で出力してください。",
    "・例: `<!-- TAGS: ピアノ練習, 初心者, 電子ピアノ, 楽譜, 毎日の練習, 大人の習い事 -->`"
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

/* ------------------------------------------------------------------ */
/* 3-Video Synthesis Mode                                             */
/* ------------------------------------------------------------------ */

export interface VideoAnalysis {
  url: string;
  analysis: string;
}

export interface ThreeVideoArticleInput {
  title: string;
  category: string;
  videoA: VideoAnalysis;
  videoB: VideoAnalysis;
  videoC: VideoAnalysis;
  aspMaterials: AspMaterialForPrompt[];
  extraInstructions?: string;
  feedbackSuffix: string;
}

/**
 * Build system prompt for the 3-video synthesis article mode.
 * Uses the exact structure requested:
 *   導入 → 3つの視点の統合 → ロードマップ → 機材比較表 → まとめ
 */
export function buildThreeVideoSystemPrompt(params: ThreeVideoArticleInput): string {
  const parts: string[] = [
    "あなたは「〇〇になりたい！」という読者の夢を応援する特化型ブログ「Wannavi」のプロフェッショナルライター兼メンターです。",
    "",
    `今回は「${params.title}」という読者に向けて記事を書きます。`,
    "",
    "【ミッション】",
    "提供される3つの動画分析情報を統合・比較し、読者が「今日から何をすべきか」「どの機材を買うべきか」が明確にわかるロードマップ記事をMarkdown形式で作成してください。",
    "",
    "【記事構成と執筆ルール】",
    "1. 導入：読者の「なりたい！」という熱量を肯定し、この記事で何が解決するかを提示する。",
    "2. 3つの視点の統合：動画A, B, Cの共通点と、意見が分かれている部分を独自の視点で比較・考察する。単なる動画の要約は絶対に禁止。",
    "3. ロードマップ：初心者が毎日継続して上達するための具体的なステップを示す。",
    "4. 機材比較表（最重要）：動画Cを参考に、「初期費用を抑えたい人向け」と「本気で環境を整えたい人向け」の機材比較表をMarkdownで作成する。",
    "   ※機材名（例: YAMAHA P-125）は **太字** で記載すること。機材・商品を扱うセクション内の太字のみ、後続のシステムが自動でAmazonアフィリエイトリンクに変換します。",
    "5. まとめ：読者の背中を押すポジティブな言葉で締める。",
    "",
    "【文体・フォーマット】",
    "・読者に寄り添う、熱量のある「です・ます」調。",
    "・見出し（##, ###）、箇条書き、太字を適切に使用し、スマートフォンでも読みやすく構造化すること。",
    "・機材比較表はMarkdownテーブルで作成すること。",
    "・文字数は2500〜3500文字程度。",
  ];

  // ASP material instructions
  if (params.aspMaterials.length > 0) {
    const instructions = params.aspMaterials.map((m, i) =>
      buildMaterialInstruction(m, i)
    );
    parts.push(
      "",
      "【必ず含めるアフィリエイト素材と挿入方法】",
      "以下の商品/サービスを必ず記事内で紹介してください。特に機材比較表に該当する機材があれば、正確な商品名で掲載してください。",
      ...instructions
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

  // Affiliate link rules
  parts.push(
    "",
    "【アフィリエイト・リンク記述の重要ルール】",
    "・表示指示が『商品カード（JSXコンポーネント）』または『CTAバナー（JSXコンポーネント）』に指定されている場合、Markdownリンクではなく、指定されたJSXタグ（`<ToolRecommendation ... />` または `<AffiliateCTA ... />`）を正確に出力してください。",
    "  - `<ToolRecommendation>` は記事生成後に自動で `<ProductRecommendation>` に変換され、Amazon と 楽天の両方の購入ボタンが表示されます。",
    "  - JSXタグの前後には必ず空行を入れてください。",
    "  - props（name, title, reason, description, href, priceHint など）の二重引用符（\"）や中括弧（{}）の対応を絶対に崩さないでください。閉じタグも忘れずに記述してください。",
    "・表示指示が『文中リンク』や『比較表の行』として指定されている場合は、Markdownの `[リンクテキスト](URL)` 形式で記述してください。",
    "・同じ商品のリンク/コンポーネントは、記事全体で1〜2回までに抑えてください。",
    "・押し売り感を避け、読者が納得して次の一歩を踏み出せる有益な情報・文脈を添えてください。",
    "",
    "【太字の使い分けルール】",
    "・**太字** は強調したい箇所に自由に使ってください（商品名以外の概念・考え方・注意点などにもOK）。",
    "・商品名や機材名を **太字** にする場合は、機材比較表・おすすめセクション・必要なものセクションなど「商品紹介」の文脈でのみ太字にしてください。",
    "・練習方法・考え方・手順の説明など、商品紹介でないセクションの太字はアフィリエイトリンクに変換されません。",
    "・「○○のスキルに必要なのは **モニターヘッドホン** ！」のような商品紹介文脈では積極的に太字を使ってください。",
    "",
    "【タグ出力ルール】",
    "・記事本文の最後に必ず以下の形式で5〜8個のタグ（日本語キーワード）を出力してください。",
    "・タグは記事の主要トピックを表すキーワードで、カンマ区切り、各タグは1〜10文字程度。",
    "・形式: `<!-- TAGS: タグ1, タグ2, タグ3, ... -->`",
    "・この行は必ず記事本文の一番最後に単独行で出力してください。",
    "・例: `<!-- TAGS: ピアノ練習, 初心者, 電子ピアノ, 楽譜, 毎日の練習, 大人の習い事 -->`"
  );

  return parts.join("\n");
}

/**
 * Build user prompt containing the 3 video analyses.
 */
export function buildThreeVideoUserPrompt(params: ThreeVideoArticleInput): string {
  return [
    `以下の3つの動画分析を読み込み、記事を生成してください。`,
    "",
    `--- 動画A（初心者がぶつかる壁）---`,
    `URL: ${params.videoA.url}`,
    params.videoA.analysis,
    "",
    `--- 動画B（上級者の練習ロジック）---`,
    `URL: ${params.videoB.url}`,
    params.videoB.analysis,
    "",
    `--- 動画C（機材・デバイスのレビュー）---`,
    `URL: ${params.videoC.url}`,
    params.videoC.analysis,
    "",
    "以上の3つの動画分析に基づき、記事構成ルールに従ってMarkdown記事を生成してください。",
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* Tag extraction                                                     */
/* ------------------------------------------------------------------ */

/**
 * Extract tags from article body (format: <!-- TAGS: tag1, tag2, ... -->).
 * Returns { cleanBody, tags } where cleanBody has the tag comment removed.
 */
export function extractTags(body: string): { cleanBody: string; tags: string[] } {
  const tagRegex = /<!--\s*TAGS:\s*(.+?)\s*-->/i;
  const match = body.match(tagRegex);

  if (!match || !match[1]) {
    return { cleanBody: body, tags: [] };
  }

  const tags = match[1]
    .split(/[,、]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= 30);

  const cleanBody = body.replace(tagRegex, "").trim();

  return { cleanBody, tags };
}

/* ------------------------------------------------------------------ */
/* Roadmap Generation Mode                                            */
/* ------------------------------------------------------------------ */

export interface RoadmapArticleInput {
  goal: string;
  category: string;
  currentSkill: string;
  availableTime: string;
  budget: string;
  extraInstructions?: string;
}

/**
 * Build system prompt for user personalized roadmap generation (Freemium Model)
 */
export function buildRoadmapSystemPrompt(params: RoadmapArticleInput): string {
  return [
    "あなたはユーザーの「〇〇になりたい！」という目標を全力でサポートする、親身でプロフェッショナルなメンター兼ライターAIです。",
    "",
    "【ミッション】",
    `ユーザーが掲げる目標「${params.goal}」の達成に向けた、具体的で実践的な「100日間上達ロードマップ」をMarkdown形式で作成してください。`,
    "一般論にとどまらず、ユーザーの現在のレベルや予算、学習時間にしっかりと寄り添ったパーソナライズされた内容にしてください。",
    "",
    "【必須の構成ルールと内容】",
    "1. **導入（目標の肯定と期待感）**",
    "   - ユーザーの目標を温かく肯定し、モチベーションを高めます。",
    "   - このロードマップでどのようなスキルが身につき、どう目標に近づくのか概要を提示します。",
    "2. **現在のレベルと目標のギャップ分析**",
    "   - 入力された「現在のレベル・スキル」を客観的に分析し、目標との差を埋めるために必要なキーポイントを示します。",
    "3. **準備・初期セットアップ（予算に応じた環境作り）**",
    "   - 入力された「予算」の範囲内で、最初に準備すべき最低限の道具や環境（無料ツール、PC、書籍など）を提示します。",
    "4. **前半戦ロードマップ（1日目〜50日目）**",
    "   - 基礎スキルを身につけるための具体的な学習計画。1日あたり何をするか、何を目指すかを分かりやすく記述します。",
    "   - ユーザーの「1日の学習時間」を考慮した無理のない計画にします。",
    "   - 基礎学習において、参考にするべき「信頼できるソース（公式チュートリアル、無料の学習サイト、評価の高い定番本など）」を具体的に紹介してください（アフィリエイト用リンクは出力せず、名前や参照URLをそのまま記述してください）。",
    "5. **【最重要】プレミアムデリミタの挿入**",
    "   - 前半戦ロードマップ（50日目）の記述が終わった直後に、必ず次のデリミタを**単独行で**出力してください：",
    "     `<!-- PREMIUM_SECTION -->`",
    "   - このデリミタは、後半のプレミアム有料エリアを区切るためのシステム用タグです。前後に空行を置いてください。",
    "6. **後半戦ロードマップ（51日目〜100日目）**",
    "   - 基礎から応用、そして実践レベルへと進むための後半の学習計画。",
    "   - 「100日やりきったら絶対に目標に近づいている」と確信できる、具体的かつハードルの高い実践的な課題（例: 小さな作品を作る、模擬案件をやってみる等）を含めます。",
    "   - 応用に役立つ信頼性の高い詳細リソース（ドキュメント、オープンソースプロジェクト、中級者向け書籍など）を紹介します。",
    "7. **挫折を防ぐための罠と対策（メンター視点）**",
    "   - 多くの人がこの目標に挑む際に挫折しやすい「罠（つまずきポイント）」と、その具体的な乗り越え方を説明します。",
    "8. **目標達成への最終アクションとまとめ**",
    "   - 100日を走りきった後に、次に踏み出すべきステップと、励ましのメッセージで締めます。",
    "",
    "【アフィリエイト・広告挿入の完全排除】",
    "・アフィリエイト目的のJSXコンポーネント（`<ToolRecommendation>` や `<AffiliateCTA>` など）は、絶対に本文に挿入しないでください。純粋なテキストとマークダウンのマークアップのみで構成してください。",
    "・商品名や書籍名を強調したい場合は、通常の `**太字**` を使用してください。",
    "",
    "【タグ出力ルール】",
    "・記事本文の最後に必ず以下の形式で5〜8個 of タグ（日本語キーワード）を出力してください。",
    "・タグには必ず「ロードマップ」と「ユーザー投稿」を含め、残りはトピックを表すキーワードにしてください。",
    "・形式: `<!-- TAGS: タグ1, タグ2, タグ3, ... -->`",
    "・この行は必ず記事本文の一番最後に単独行で出力してください。",
    "・例: `<!-- TAGS: ユーザー投稿, ロードマップ, ピアノ練習, 初心者, 独学, 大人の趣味 -->`"
  ].join("\n");
}

/**
 * Build user prompt for user personalized roadmap generation
 */
export function buildRoadmapUserPrompt(params: RoadmapArticleInput): string {
  const extraStr = params.extraInstructions ? `\n- AIへの追加の要望: ${params.extraInstructions}` : "";
  return [
    "以下のアンケート情報に基づいて、100日間のロードマップ記事をMarkdown形式で作成してください。",
    "",
    `- 目標（なりたい姿）: ${params.goal}`,
    `- 現在のスキル・レベル: ${params.currentSkill}`,
    `- 1日の学習可能時間: ${params.availableTime}`,
    `- 予算: ${params.budget}`,
    extraStr,
    "",
    "【出力条件】",
    "- 2500文字〜3500文字程度で、非常に具体的で実践的な内容にしてください。",
    "- 各フェーズで、学習に使える信頼できるソース（書籍、ドキュメントなど）を具体的に挙げてください。",
    "- ロードマップの50日目が終わった後に、必ず `<!-- PREMIUM_SECTION -->` 単独行を挿入してください。",
  ].join("\n");
}

