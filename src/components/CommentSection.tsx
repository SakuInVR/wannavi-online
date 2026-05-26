"use client";

import { useState, useEffect, useCallback } from "react";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface Comment {
  id: string;
  author_name: string | null;
  body: string;
  is_anonymous: boolean;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* CommentSection                                                     */
/* ------------------------------------------------------------------ */

export function CommentSection({ articleId }: { articleId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form state
  const [commentBody, setCommentBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?article_id=${encodeURIComponent(articleId)}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    Promise.resolve().then(() => fetchComments());
  }, [fetchComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) {
      setMessage({ type: "error", text: "コメントを入力してください" });
      return;
    }
    if (commentBody.length > 2000) {
      setMessage({ type: "error", text: "コメントは2000文字以内で入力してください" });
      return;
    }
    if (!isAnonymous && !authorName.trim()) {
      setMessage({ type: "error", text: "名前を入力するか、匿名を選択してください" });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article_id: articleId,
          body: commentBody.trim(),
          author_name: isAnonymous ? undefined : authorName.trim(),
          is_anonymous: isAnonymous,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: json.message ?? "コメントを投稿しました！" });
        setCommentBody("");
        setAuthorName("");
        // 投稿後すぐにコメント一覧を再取得
        fetchComments();
      } else {
        setMessage({ type: "error", text: json.error ?? "送信に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "ネットワークエラーが発生しました" });
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <section className="mt-16 border-t border-slate-200 pt-10">
      <h2 className="text-xl font-bold text-slate-900">💬 コメント</h2>
      <p className="mt-1 text-sm text-slate-500">
        質問や感想がありましたらお気軽にどうぞ。匿名でも投稿できます。
      </p>

      {/* Existing comments */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="text-sm text-slate-400">読み込み中...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-slate-400">
            まだコメントはありません。最初のコメントを投稿してみませんか？
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">
                  {comment.is_anonymous ? "匿名" : comment.author_name ?? "名無し"}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDate(comment.created_at)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {comment.body}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">コメントを投稿する</h3>

        {/* Anonymous toggle */}
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <span className="text-sm text-slate-600">匿名で投稿する</span>
        </label>

        {/* Name input (shown when not anonymous) */}
        {!isAnonymous && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              お名前（未入力の場合は「名無し」と表示されます）
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="例：山田"
              maxLength={30}
              className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        )}

        {/* Comment body */}
        <div>
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            rows={4}
            placeholder="コメントを入力してください（2000文字以内）"
            maxLength={2000}
            className="w-full max-w-lg rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <div className="mt-1 text-right text-xs text-slate-400">
            {commentBody.length}/2000
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
        >
          {submitting ? "送信中..." : "コメントを送信する"}
        </button>

        {/* Message */}
        {message && (
          <div
            className={`rounded-md px-4 py-3 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}
      </form>
    </section>
  );
}
