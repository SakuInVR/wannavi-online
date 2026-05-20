/**
 * Lightweight Discord webhook notification.
 *
 * Call after an article is saved as "pending" to notify reviewers.
 */

const DISCORD_WEBHOOK_URL = process.env.DISCORD_REVIEW_WEBHOOK_URL;

export async function notifyNewPendingArticle(articleId: string): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn("[notify] DISCORD_REVIEW_WEBHOOK_URL not set – skipping");
    return;
  }

  const reviewUrl = `http://localhost:3000/admin/review/${articleId}`;

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `📝 **新着記事の生成完了**\nレビューURL: ${reviewUrl}`,
      }),
    });

    if (!response.ok) {
      console.error(
        `[notify] Discord webhook failed (${response.status}): ${await response.text()}`
      );
    }
  } catch (err) {
    console.error("[notify] Discord webhook error:", err);
  }
}
