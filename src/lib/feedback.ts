/**
 * Feedback injection utilities for AI article generation.
 *
 * Usage:
 *   import { buildFeedbackInjection, fetchCategoryFeedback } from "@/lib/feedback";
 *
 *   const injection = await fetchCategoryFeedback("instrument-player");
 *   const systemPrompt = basePrompt + buildFeedbackInjection(injection);
 */

import { getSupabaseAdmin } from "@/lib/supabase";

export interface FeedbackEntry {
  feedback_comment: string;
  rejected_at: string;
}

/**
 * Fetch up to `limit` past rejection comments for a given category.
 */
export async function fetchCategoryFeedback(
  category: string,
  limit = 3
): Promise<FeedbackEntry[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn("[feedback] Supabase not configured – skipping feedback fetch");
    return [];
  }

  const { data, error } = await supabase
    .from("article_feedbacks")
    .select("feedback_comment, rejected_at")
    .eq("category", category)
    .order("rejected_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[feedback] fetchCategoryFeedback error:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Build the prompt suffix that injects past rejection reasons into the
 * system prompt sent to DeepSeek (or any LLM).
 */
export function buildFeedbackInjection(entries: FeedbackEntry[]): string {
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

/**
 * Convenience: fetch + build in one call.
 */
export async function getFeedbackPromptSuffix(
  category: string,
  limit = 3
): Promise<string> {
  const entries = await fetchCategoryFeedback(category, limit);
  return buildFeedbackInjection(entries);
}
