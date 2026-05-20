/**
 * 知見の自動注入ロジック（単体テスト/確認用スクリプト）
 *
 * 指定したカテゴリの過去ダメ出しをSupabaseから取得し、
 * システムプロンプトに注入されるテキストをプレビュー表示する。
 *
 * 使用方法:
 *   node scripts/inject-feedback.mjs --category=instrument-player
 *
 * 必要な環境変数:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
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
// Supabase
// ---------------------------------------------------------------------------

function getSupabaseAdmin() {
  return createClient(
    envRequired("NEXT_PUBLIC_SUPABASE_URL"),
    envRequired("SUPABASE_SERVICE_ROLE_KEY")
  );
}

// ---------------------------------------------------------------------------
// Fetch feedback
// ---------------------------------------------------------------------------

/**
 * @param {ReturnType<getSupabaseAdmin>} supabase
 * @param {string} category
 * @param {number} limit
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

// ---------------------------------------------------------------------------
// Build injection text
// ---------------------------------------------------------------------------

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
// Main
// ---------------------------------------------------------------------------

async function main() {
  const {
    values: { category },
  } = parseArgs({
    options: {
      category: { type: "string" },
    },
  });

  if (!category) {
    console.error(
      "Usage: node scripts/inject-feedback.mjs --category=instrument-player"
    );
    process.exit(1);
  }

  const supabase = getSupabaseAdmin();

  console.log(`カテゴリ「${category}」の過去ダメ出しを取得中...\n`);

  const entries = await fetchCategoryFeedback(supabase, category);

  if (entries.length === 0) {
    console.log("✅ 過去のダメ出しはありません。自由に生成してください。");
    return;
  }

  console.log(`📋 ${entries.length}件のダメ出しが見つかりました:\n`);

  for (const [i, entry] of entries.entries()) {
    console.log(`${i + 1}. [${entry.rejected_at.slice(0, 10)}] ${entry.feedback_comment}\n`);
  }

  console.log("--- システムプロンプト末尾に注入されるテキスト ---");
  console.log(buildFeedbackInjection(entries));
}

main().catch((err) => {
  console.error("[inject-feedback] Fatal error:", err);
  process.exit(1);
});
