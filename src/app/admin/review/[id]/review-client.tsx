"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

function RetakeSection({
  articleId,
  existingInstructions,
  articleBody,
}: {
  articleId: string;
  existingInstructions: string;
  articleBody?: string | null;
}) {
  const router = useRouter();
  const [instructions, setInstructions] = useState(existingInstructions);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Scroll to retake section on mount
  useEffect(() => {
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  async function handleRetake() {
    if (!instructions.trim()) {
      setMsg({ type: "error", text: "修正指示を入力してください" });
      return;
    }
    setGenerating(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/articles/${articleId}/retake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retake_instructions: instructions.trim(),
          auto_regenerate: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ type: "error", text: json.error ?? "リテイク失敗" });
        return;
      }
      if (json.regenerated) {
        setMsg({ type: "success", text: `✅ リテイク記事を再生成しました (${json.tokens_used ?? "?"} tokens)` });
      } else {
        setMsg({ type: "success", text: `✅ リテイク指示を保存しました${json.warning ? "（" + json.warning + "）" : ""}` });
      }
      setInstructions("");
      setTimeout(() => router.refresh(), 800);
    } catch {
      setMsg({ type: "error", text: "ネットワークエラー" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div ref={sectionRef} className="mt-4 rounded-lg border border-orange-300 bg-orange-50 p-4">
      <h3 className="mb-2 text-sm font-semibold text-orange-900">🔄 リテイク指示（修正依頼）</h3>
      <p className="mb-2 text-xs text-orange-700">
        公開済みの記事に対して修正を指示できます。AIが元の記事をベースに修正します。
      </p>

      {/* Show current article body for reference */}
      {articleBody && (
        <details className="mb-3 rounded border border-orange-200 bg-white">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-orange-700 hover:bg-orange-50">
            📄 現在の記事本文を表示（修正依頼の参考に）
          </summary>
          <div className="max-h-60 overflow-y-auto border-t border-orange-200 px-3 py-2">
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-xs text-gray-700">
              {articleBody.slice(0, 3000)}
              {articleBody.length > 3000 && (
                <p className="mt-1 text-gray-400">...（続きは省略）</p>
              )}
            </div>
          </div>
        </details>
      )}

      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        rows={4}
        placeholder="例：導入文が長すぎるので半分に縮めてください / 機材比較表にYAMAHA P-225を追加してください"
        className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleRetake}
          disabled={generating}
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              AIで再生成中...
            </span>
          ) : (
            "🚀 リテイク記事をAIで再生成"
          )}
        </button>
      </div>
      {msg && (
        <div className={`mt-3 rounded-md px-3 py-2 text-sm ${msg.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}

interface Article {
  id: string;
  title: string;
  description: string;
  category: string;
  review_status: string;
  body: string | null;
  created_at: string;
  retake_instructions?: string | null;
  previous_body?: string | null;
  tags?: string[] | null;
}

interface LinkedAsp {
  name: string;
  asp_name: string;
  affiliate_url: string | null;
  price_note?: string | null;
  usage_type?: string | null;
  description?: string | null;
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

  // Tag editor
  const [tags, setTags] = useState<string[]>(article.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [savingTags, setSavingTags] = useState(false);

  async function saveTags() {
    setSavingTags(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/articles/${article.id}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });
      const json = await res.json();
      if (!res.ok) { setMessage({ type: "error", text: json.error ?? "タグ保存失敗" }); return; }
      setMessage({ type: "success", text: `✅ タグを保存しました（${json.tags?.length ?? tags.length}件）` });
      setTimeout(() => setMessage(null), 2000);
    } catch { setMessage({ type: "error", text: "ネットワークエラー" }); }
    finally { setSavingTags(false); }
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || t.length > 30 || tags.includes(t)) { setTagInput(""); return; }
    setTags([...tags, t]);
    setTagInput("");
  }

  function removeTag(index: number) {
    setTags(tags.filter((_, i) => i !== index));
  }

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

  const usageLabels: Record<string, string> = {
    recommendation: "おすすめ", comparison: "比較用", tool_intro: "道具紹介",
    budget_option: "予算別", step_up: "次のステップ",
  };

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

          {/* Tags display & edit */}
          {(() => {
            const canEditTags = isPending || article.review_status === "approved";
            return (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-medium text-gray-500">🏷️ タグ</span>
                  {canEditTags && (
                    <span className="text-xs text-gray-400">（クリックで削除 / 入力して追加）</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {tags.map((tag, i) => (
                    <span
                      key={i}
                      onClick={() => canEditTags && removeTag(i)}
                      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                        canEditTags
                          ? "cursor-pointer bg-sky-100 text-sky-700 hover:bg-red-100 hover:text-red-700 hover:line-through"
                          : "bg-sky-100 text-sky-700"
                      }`}
                      title={canEditTags ? "クリックで削除" : undefined}
                    >
                      {tag}
                      {canEditTags && <span className="text-xs opacity-50">×</span>}
                    </span>
                  ))}
                  {tags.length === 0 && (
                    <span className="text-xs text-gray-400">タグ未設定</span>
                  )}
                </div>
                {canEditTags && (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                      placeholder="タグを入力（Enterで追加 / 最大30文字）"
                      maxLength={30}
                      className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
                    />
                    <button
                      onClick={addTag}
                      disabled={!tagInput.trim()}
                      className="rounded-md bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-40"
                    >
                      ＋追加
                    </button>
                    <button
                      onClick={saveTags}
                      disabled={savingTags}
                      className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-40"
                    >
                      {savingTags ? "..." : "保存"}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Retake instructions (when retaking an existing article) */}
        {article.retake_instructions && (
          <div className="mb-4 rounded-lg border border-orange-300 bg-orange-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-orange-900">🔄 リテイク指示</h3>
            <div className="rounded bg-white p-3 text-sm text-orange-800 whitespace-pre-wrap">
              {article.retake_instructions}
            </div>
            {article.previous_body && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-orange-600 hover:text-orange-800">
                  📄 修正前の記事本文を表示
                </summary>
                <div className="mt-2 max-h-40 overflow-y-auto rounded bg-white p-3 text-xs text-gray-600 whitespace-pre-wrap">
                  {article.previous_body.slice(0, 2000)}
                  {article.previous_body.length > 2000 && <p className="mt-1 text-gray-400">...（続きは省略）</p>}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Linked ASP materials */}
        {linkedAsps.length > 0 && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-blue-900">🔗 ターゲットアフィリエイト</h3>
            <ul className="space-y-2">
              {linkedAsps.map((asp, i) => (
                <li key={i} className="rounded bg-white p-2 text-sm">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-blue-900">{asp.name}</span>
                    <span className="text-xs text-blue-500">[{asp.asp_name}]</span>
                    {asp.usage_type && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                        {usageLabels[asp.usage_type] ?? asp.usage_type}
                      </span>
                    )}
                    {asp.price_note && (
                      <span className="text-xs font-medium text-green-600">{asp.price_note}</span>
                    )}
                    {asp.affiliate_url && (
                      <a href={asp.affiliate_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline">URL →</a>
                    )}
                  </div>
                  {asp.description && (
                    <p className="mt-1 text-xs text-gray-500">{asp.description}</p>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-blue-600">
              💡 上記のアフィリエイト商品が記事内で紹介されるターゲットです。リンク注入ツールで該当商品名にURLを埋め込んでください。
            </p>
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
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 sm:p-6">
            <p className="text-center">この記事はすでにレビュー済みです。</p>
            {article.review_status === "approved" && (
              <RetakeSection articleId={article.id} existingInstructions={article.retake_instructions ?? ""} articleBody={article.body} />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
