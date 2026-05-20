"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Article {
  id: string;
  title: string;
  description: string;
  category: string;
  review_status: string;
  body: string | null;
  created_at: string;
}

interface LinkedAsp {
  name: string;
  asp_name: string;
  affiliate_url: string | null;
}

export function ReviewClient({
  article,
  linkedAsps,
}: {
  article: Article;
  linkedAsps: LinkedAsp[];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleApprove() {
    setSubmitting("approve");
    setMessage(null);
    try {
      const res = await fetch(`/admin/review/${article.id}/approve`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: json.error ?? "承認に失敗しました" });
        return;
      }
      setMessage({ type: "success", text: "✅ 承認しました" });
      setTimeout(() => router.refresh(), 800);
    } catch {
      setMessage({ type: "error", text: "ネットワークエラー" });
    } finally {
      setSubmitting(null);
    }
  }

  async function handleReject() {
    if (!feedback.trim()) {
      setMessage({ type: "error", text: "ダメ出しコメントを入力してください" });
      return;
    }
    setSubmitting("reject");
    setMessage(null);
    try {
      const res = await fetch(`/admin/review/${article.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback_comment: feedback.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: json.error ?? "却下に失敗しました" });
        return;
      }
      setMessage({ type: "success", text: "❌ 却下しました。フィードバックを保存しました。" });
      setTimeout(() => router.refresh(), 800);
    } catch {
      setMessage({ type: "error", text: "ネットワークエラー" });
    } finally {
      setSubmitting(null);
    }
  }

  const statusLabel: Record<string, string> = {
    pending: "⏳ レビュー待ち",
    approved: "✅ 承認済み",
    rejected: "❌ 却下",
  };

  const isPending = article.review_status === "pending";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <a
            href="/admin"
            className="text-sm text-blue-600 underline hover:text-blue-800"
          >
            ← 管理画面トップ
          </a>
          <h1 className="mt-2 text-xl font-bold text-gray-900 sm:text-2xl">
            記事レビュー
          </h1>
        </div>

        {/* Article card */}
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              {article.category}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                article.review_status === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : article.review_status === "approved"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {statusLabel[article.review_status] ?? article.review_status}
            </span>
          </div>

          <h2 className="mb-2 text-lg font-semibold text-gray-900">
            {article.title}
          </h2>

          <p className="mb-3 text-sm leading-relaxed text-gray-600">
            {article.description}
          </p>

          <p className="text-xs text-gray-400">
            作成日:{" "}
            {new Date(article.created_at).toLocaleString("ja-JP", {
              timeZone: "Asia/Tokyo",
            })}
          </p>
        </div>

        {/* Linked ASP materials */}
        {linkedAsps.length > 0 && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-blue-900">
              🔗 この記事に含めるASP素材
            </h3>
            <ul className="space-y-1">
              {linkedAsps.map((asp, i) => (
                <li key={i} className="text-sm text-blue-800">
                  <span className="font-medium">{asp.name}</span>
                  <span className="ml-1 text-xs text-blue-500">[{asp.asp_name}]</span>
                  {asp.affiliate_url && (
                    <a
                      href={asp.affiliate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-xs text-blue-500 underline"
                    >
                      URLを開く
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Article body preview */}
        {article.body && (
          <details className="mb-4 rounded-lg border border-gray-200 bg-white">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              📄 生成された記事本文を表示
            </summary>
            <div className="border-t border-gray-200 px-4 py-4">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-gray-700">
                {article.body}
              </div>
            </div>
          </details>
        )}

        {/* Status message */}
        {message && (
          <div
            className={`mb-4 rounded-md px-4 py-3 text-sm font-medium ${
              message.type === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <button
              onClick={handleApprove}
              disabled={submitting !== null}
              className="w-full rounded-md bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50 sm:text-base"
            >
              {submitting === "approve" ? "処理中..." : "✅ 承認する"}
            </button>

            <hr className="my-5 border-gray-200" />

            <label className="mb-2 block text-sm font-medium text-gray-700">
              ダメ出しコメント（修正指示）
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="例：導入文が抽象的すぎる。読者の具体的な悩みから始めてください。"
              className="mb-3 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <button
              onClick={handleReject}
              disabled={submitting !== null}
              className="w-full rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 sm:text-base"
            >
              {submitting === "reject" ? "処理中..." : "❌ 却下する（要修正）"}
            </button>
          </div>
        )}

        {!isPending && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500 sm:p-6">
            この記事はすでにレビュー済みです。
          </div>
        )}
      </div>
    </main>
  );
}
