/**
 * 知見自動注入スクリプト (Article Generation with Feedback Injection)
 *
 * 新しい記事をDeepSeek APIで生成する際、過去のダメ出しを
 * システムプロンプトに動的注入して、同じミスを繰り返さないようにする。
 *
 * 使用方法:
 *   node scripts/generate-article.mjs --category=instrument-player --title="大人のピアノ練習法"
 *
 * 必要な環境変数:
 *   DEEPSEEK_API_KEY         - DeepSeek API キー
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase プロジェクト URL
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase サービスロールキー
 *   DISCORD_REVIEW_WEBHOOK_URL - Discord Webhook URL (通知用)
 */

import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function envRequired(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------

function getSupabaseAdmin() {
  return createClient(
    envRequired("NEXT_PUBLIC_SUPABASE_URL"),
    envRequired("SUPABASE_SERVICE_ROLE_KEY")
  );
}

// ---------------------------------------------------------------------------
// Feedback injection (same logic as src/lib/feedback.ts, duplicated for
// standalone Node.js execution)
// ---------------------------------------------------------------------------

/**
 * @param {ReturnType<getSupabaseAdmin>} supabase
 * @param {string} category
 * @param {number} limit
 * @returns {Promise<Array<{feedback_comment: string, rejected_at: string}>>}
 */
async function fetchCategoryFeedback(supabase, category, limit = 3) {
  const { data, error } = await supabase
    .from("article_feedbacks")
    .select("feedback_comment, rejected_at")
    .eq("category", category)
    .order("rejected_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[feedback] fetch error:", error);
    return [];
  }
  return data ?? [];
}

/**
 * @param {Array<{feedback_comment: string, rejected_at: string}>} entries
 * @returns {string}
 */
function buildFeedbackInjection(entries) {
  if (entries.length === 0) return "";

  const lines = entries.map(
    (entry, i) =>
      `${i + 1}. ${entry.feedback_comment}（却下日: ${entry.rejected_at.slice(0, 10)}）`
  );

  return [
    "",
    "【過去の不合格事例と改善指示】",
    "過去に以下の点で修正を指示されました。これらのミスを絶対に繰り返さないでください：",
    ...lines,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// DeepSeek API
// ---------------------------------------------------------------------------

/**
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<string>}
 */
async function callDeepSeek(systemPrompt, userPrompt) {
  const apiKey = envRequired("DEEPSEEK_API_KEY");

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`DeepSeek API error (${response.status}): ${errBody}`);
  }

  const json = await response.json();
  return json.choices?.[0]?.message?.content ?? "";
}

// ---------------------------------------------------------------------------
// Discord notification
// ---------------------------------------------------------------------------

/**
 * @param {string} articleId
 */
async function notifyDiscord(articleId) {
  const webhookUrl = process.env.DISCORD_REVIEW_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[notify] DISCORD_REVIEW_WEBHOOK_URL not set – skipping");
    return;
  }

  const reviewUrl = `http://localhost:3000/admin/review/${articleId}`;
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `📝 **新着記事の生成完了**\nレビューURL: ${reviewUrl}`,
    }),
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const {
    values: { category, title },
  } = parseArgs({
    options: {
      category: { type: "string" },
      title: { type: "string" },
    },
  });

  if (!category || !title) {
    console.error(
      "Usage: node scripts/generate-article.mjs --category=instrument-player --title=\"記事タイトル\""
    );
    process.exit(1);
  }

  const supabase = getSupabaseAdmin();

  // 1. 過去のダメ出しを取得
  console.log(`[generate] Fetching feedback for category: ${category}`);
  const feedbackEntries = await fetchCategoryFeedback(supabase, category);
  console.log(
    `[generate] Found ${feedbackEntries.length} past rejection(s)`
  );

  // 2. システムプロンプトを構築
  const baseSystemPrompt = [
    "あなたはSEOに強い日本語のブログ記事を書くプロのライターです。",
    "読者が「今日から始められる」と感じる、具体的で実践的な記事を書いてください。",
    "一般論ではなく、具体的な手順・数字・判断基準を盛り込んでください。",
  ].join("\n");

  const feedbackSuffix = buildFeedbackInjection(feedbackEntries);
  const systemPrompt = baseSystemPrompt + feedbackSuffix;

  // 3. DeepSeekで記事生成
  const userPrompt = `以下のタイトルでブログ記事をMarkdown形式で生成してください。

タイトル: ${title}
カテゴリ: ${category}

条件:
- 見出しは##を使用
- 読者が今日できる具体的なアクションを必ず1つ含める
- 初心者がつまずくポイントとその解決策を書く
- 2000〜3000文字程度`;

  console.log(`[generate] Calling DeepSeek API...`);
  const articleBody = await callDeepSeek(systemPrompt, userPrompt);

  if (!articleBody) {
    console.error("[generate] Empty response from DeepSeek");
    process.exit(1);
  }

  // 4. Supabase に pending で保存
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

  const description = articleBody.slice(0, 160).replace(/\n/g, " ");

  const { data: article, error: insertError } = await supabase
    .from("articles")
    .insert({
      slug,
      title,
      description,
      category,
      review_status: "pending",
      pipeline_state: "drafted",
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[generate] Failed to insert article:", insertError);
    process.exit(1);
  }

  console.log(`[generate] Article saved: ${article.id}`);
  console.log(`[generate] Body length: ${articleBody.length} chars`);
  console.log(`[generate] System prompt (last 300 chars): ...${systemPrompt.slice(-300)}`);

  // 5. Discord通知
  await notifyDiscord(article.id);
  console.log("[generate] Discord notification sent (or skipped)");

  // 6. 結果表示
  console.log("\n--- GENERATED ARTICLE ---");
  console.log(articleBody);
  console.log("--- END ---");

  console.log(`\nReview URL: http://localhost:3000/admin/review/${article.id}`);
}

main().catch((err) => {
  console.error("[generate] Fatal error:", err);
  process.exit(1);
});
