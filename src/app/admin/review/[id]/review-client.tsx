"use client";

import { useState, useMemo } from "react";
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

interface PastFeedback {
  feedback_comment: string;
  rejected_at: string;
}

export function ReviewClient({
  article,
  linkedAsps,
  pastFeedback,
}: {
  article: Article;
  linkedAsps: LinkedAsp[];
  pastFeedback: PastFeedback[];
}) {
  const router = useRouter();
  const [editedBody, setEditedBody] = useState(article.body ?? "");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Link injector
  const [injectProduct, setInjectProduct] = useState("");
  const [injectUrl, setInjectUrl] = useState("");

  // Detect product names in article body (## headings + bold text)
  const detectedProducts = useMemo(() => {
    if (!article.body) return [];
    const names = new Set<string>();
    // Match ## headings
    for (const m of article.body.matchAll(/^##\s+(.+)$/gm)) {
      names.add(m[1].trim());
    }
    // Match **bold** items that look like product names
    for (const m of article.body.matchAll(/\*\*(.{2,40}?)\*\*/g)) {
      const t = m[1].trim();
      if (t.length >= 3 && !t.includes("http")) names.add(t);
    }
    return Array.from(names).slice(0, 20);
  }, [article.body]);

  function injectLink(product: string, url: string) {
    if (!product || !url) return;
    const escaped = product.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(\\*\\*)?(${escaped})(\\*\\*)?`, "g");
    const replacement = `[$2](${url})`;
    const newBody = editedBody.replace(regex, replacement);
    if (newBody !== editedBody) {
      setEditedBody(newBody);
      setMessage({ type: "success", text: `「${product}」にリンクを注入しました` });
      setTimeout(() => setMessage(null), 2000);
    } else {
      setMessage({ type: "error", text: `「${product}」が本文に見つかりませんでした` });
      setTimeout(() => setMessage(null), 2000);
    }
  }

  async function handleApprove() {
    setSubmitting("approve");
    setMessage(null);
    try {
      const res = await fetch(`/admin/review/${article.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editedBody }),
      });
      const json = await res.json();
      if (!res.ok) { setMessage({ type: "error", text: json.error ?? "承認失敗" }); return; }
      setMessage({ type: "success", text: "✅ 承認しました（本文を保存）" });
      setTimeout(() => router.refresh(), 800);
    } catch { setMessage({ type: "error", text: "ネットワークエラー" }); }
    finally { setSubmitting(null); }
  }

  async function handleReject() {
    if (!feedback.trim()) { setMessage({ type: "error", text: "ダメ出しコメントを入力" }); return; }
    setSubmitting("reject"); setMessage(null);
    try {
      const res = await fetch(`/admin/review/${article.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback_comment: feedback.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setMessage({ type: "error", text: json.error ?? "却下失敗" }); return; }
      setMessage({ type: "success", text: "❌ 却下しました" });
      setTimeout(() => router.refresh(), 800);
    } catch { setMessage({ type: "error", text: "ネットワークエラー" }); }
    finally { setSubmitting(null); }
  }

  const statusLabel: Record<string, string> = {
    pending: "⏳ レビュー待ち", approved: "✅ 承認済み", rejected: "❌ 却下",
  };
  const isPending = article.review_status === "pending";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <a href="/admin" className="text-sm text-blue-600 underline hover:text-blue-800">← 管理画面トップ</a>
          <h1 className="mt-2 text-xl font-bold text-gray-900 sm:text-2xl">記事レビュー</h1>
        </div>

        {/* Article info card */}
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">{article.category}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${article.review_status === "pending" ? "bg-yellow-100 text-yellow-800" : article.review_status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {statusLabel[article.review_status] ?? article.review_status}
            </span>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">{article.title}</h2>
          <p className="mb-3 text-sm leading-relaxed text-gray-600">{article.description}</p>
          <p className="text-xs text-gray-400">作成日: {new Date(article.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</p>
        </div>

        {/* Linked ASP materials */}
        {linkedAsps.length > 0 && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-blue-900">🔗 含めるASP素材</h3>
            <ul className="space-y-1">
              {linkedAsps.map((asp, i) => (
                <li key={i} className="text-sm text-blue-800">
                  <span className="font-medium">{asp.name}</span>
                  <span className="ml-1 text-xs text-blue-500">[{asp.asp_name}]</span>
                  {asp.affiliate_url && (
                    <a href={asp.affiliate_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-blue-500 underline">URL</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Past feedback history (learning loop) */}
        {pastFeedback.length > 0 && (
          <details className="mb-4 rounded-lg border border-purple-200 bg-purple-50">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-purple-900">
              📋 このカテゴリの過去ダメ出し履歴（{pastFeedback.length}件） — 次回生成時に自動注入されます
            </summary>
            <div className="border-t border-purple-200 px-4 py-3">
              <ul className="space-y-2">
                {pastFeedback.map((fb, i) => (
                  <li key={i} className="rounded bg-white p-2 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-purple-700 font-medium">
                          #{i + 1}
                        </span>
                        <span className="text-gray-400">
                        {new Date(fb.rejected_at).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                    <p className="text-gray-600">{fb.feedback_comment}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-purple-600">
                💡 これらの指摘は次回の記事生成時に「【過去の不合格事例と改善指示】」としてDeepSeekのプロンプトに自動注入され、同じミスを繰り返さないように学習します。
              </p>
            </div>
          </details>
        )}

        {/* Link injector (quick Amazon link insertion) */}
        {isPending && article.body && (
          <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-orange-900">🔧 アフィリエイトリンク注入</h3>
            <p className="mb-2 text-xs text-orange-700">
              検出された商品名をクリックするか、手動で商品名とURLを入力して本文にリンクを注入できます。
            </p>

            {/* Detected products */}
            {detectedProducts.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1">
                {detectedProducts.map((p) => (
                  <button key={p} onClick={() => setInjectProduct(p)}
                    className="rounded bg-white px-2 py-0.5 text-xs text-gray-700 border border-gray-300 hover:border-orange-400 hover:bg-orange-100">
                    {p}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input type="text" value={injectProduct} onChange={(e) => setInjectProduct(e.target.value)}
                placeholder="商品名" className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-xs" />
              <input type="url" value={injectUrl} onChange={(e) => setInjectUrl(e.target.value)}
                placeholder="アフィリエイトURL (Amazon等)" className="flex-[2] rounded-md border border-gray-300 px-2 py-1.5 text-xs" />
              <button onClick={() => { injectLink(injectProduct, injectUrl); setInjectProduct(""); setInjectUrl(""); }}
                className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 shrink-0">
                注入
              </button>
            </div>
          </div>
        )}

        {/* Article body editor */}
        {isPending && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
              <h3 className="text-sm font-semibold text-gray-700">📄 記事本文（編集可能）</h3>
              <span className="text-xs text-gray-400">{editedBody.length}文字</span>
            </div>
            <textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              rows={24}
              className="w-full resize-y border-0 px-4 py-3 font-mono text-sm text-gray-700 focus:outline-none focus:ring-0"
            />
          </div>
        )}

        {/* Read-only body for already-reviewed articles */}
        {!isPending && article.body && (
          <details className="mb-4 rounded-lg border border-gray-200 bg-white">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">📄 記事本文を表示</summary>
            <div className="border-t border-gray-200 px-4 py-4">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-gray-700">{article.body}</div>
            </div>
          </details>
        )}

        {/* Message */}
        {message && (
          <div className={`mb-4 rounded-md px-4 py-3 text-sm font-medium ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            {message.text}
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <button onClick={handleApprove} disabled={submitting !== null}
              className="w-full rounded-md bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50 sm:text-base">
              {submitting === "approve" ? "処理中..." : "✅ 承認する（本文を保存）"}
            </button>

            <hr className="my-5 border-gray-200" />

            <label className="mb-2 block text-sm font-medium text-gray-700">ダメ出しコメント（修正指示）</label>
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)}
              rows={4} placeholder="例：導入文が抽象的すぎる。読者の具体的な悩みから始めてください。"
              className="mb-3 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
            <button onClick={handleReject} disabled={submitting !== null}
              className="w-full rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 sm:text-base">
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
