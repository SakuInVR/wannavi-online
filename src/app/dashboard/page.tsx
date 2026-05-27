"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface Article {
  id: string;
  title: string;
  category: string;
  review_status: string;
  pipeline_state: string;
  slug: string;
  created_at: string;
  free_retake_used: boolean;
  body?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = getSupabase();

  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Payment states
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [mockLoading, setMockLoading] = useState(false);

  // Review / Preview / Retake states
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [retakeOpen, setRetakeOpen] = useState(false);
  const [retakeInstructions, setRetakeInstructions] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [unlockedArticleIds, setUnlockedArticleIds] = useState<Set<string>>(new Set());

  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (!supabase) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }

    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?redirectTo=/dashboard");
        return;
      }
      setUser(session.user);

      // Fetch profile & credits
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", session.user.id)
        .single();
      
      if (profile) {
        setCredits(profile.credits);
      }

      // Fetch user unlocks
      const { data: unlocks } = await supabase
        .from("article_unlocks")
        .select("article_id")
        .eq("user_id", session.user.id);
      
      if (unlocks) {
        setUnlockedArticleIds(new Set(unlocks.map((u: any) => u.article_id)));
      }

      // Fetch user articles
      const { data: userArticles, error } = await supabase
        .from("articles")
        .select("id, title, category, review_status, pipeline_state, slug, created_at, free_retake_used, body")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!error && userArticles) {
        setArticles(userArticles);
      }

      setLoading(false);
    };

    checkAuthAndFetch();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const fetchUpdatedProfileAndArticles = async (uid: string) => {
    if (!supabase) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", uid)
      .single();
    if (profile) setCredits(profile.credits);

    const { data: unlocks } = await supabase
      .from("article_unlocks")
      .select("article_id")
      .eq("user_id", uid);
    if (unlocks) setUnlockedArticleIds(new Set(unlocks.map((u: any) => u.article_id)));

    const { data: userArticles } = await supabase
      .from("articles")
      .select("id, title, category, review_status, pipeline_state, slug, created_at, free_retake_used, body")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (userArticles) setArticles(userArticles);
  };

  const handleUnlockArticle = async (articleId: string) => {
    if (!supabase || !user) return;
    setActionLoading(true);
    setStatusMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/articles/${articleId}/unlock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage("ロードマップ全体をアンロックしました！");
        await fetchUpdatedProfileAndArticles(user.id);
      } else {
        setStatusMessage(`アンロックエラー: ${data.error || "失敗しました"}`);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("アンロック処理中に通信エラーが発生しました。");
    } finally {
      setActionLoading(false);
    }
  };


  // Checkout Session
  const handlePurchase = async () => {
    if (!supabase || !user) return;
    setPurchaseLoading(true);
    setStatusMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/payments/checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setStatusMessage(`決済エラー: ${data.error || "接続失敗"}`);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("Stripe決済の初期化に失敗しました。");
    } finally {
      setPurchaseLoading(false);
    }
  };

  // Mock Purchase (Dev Only)
  const handleMockPayment = async () => {
    if (!supabase || !user) return;
    setMockLoading(true);
    setStatusMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/payments/mock-success", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage("【デバッグ】10クレジットを即時追加しました！");
        if (user) await fetchUpdatedProfileAndArticles(user.id);
      } else {
        setStatusMessage(`Mock決済エラー: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("Mock決済エラーが発生しました。");
    } finally {
      setMockLoading(false);
    }
  };

  // Publish
  const handlePublish = async (articleId: string) => {
    if (!supabase || !user) return;
    setActionLoading(true);
    setStatusMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/articles/${articleId}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage("記事を本番公開しました！");
        await fetchUpdatedProfileAndArticles(user.id);
        setPreviewOpen(false);
        setSelectedArticle(null);
      } else {
        setStatusMessage(`公開エラー: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("公開処理中にエラーが発生しました。");
    } finally {
      setActionLoading(false);
    }
  };

  // Retake
  const handleRetakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user || !selectedArticle) return;

    setActionLoading(true);
    setStatusMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/articles/${selectedArticle.id}/retake`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          retake_instructions: retakeInstructions,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message || "リテイクが完了しました！");
        setRetakeInstructions("");
        setRetakeOpen(false);
        setPreviewOpen(false);
        setSelectedArticle(null);
        await fetchUpdatedProfileAndArticles(user.id);
      } else {
        setStatusMessage(`リテイクエラー: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("リテイク中に通信エラーが発生しました。");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-slate-950 text-white">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        <p className="mt-4 text-sm font-bold text-slate-400">ダッシュボードを読み込み中...</p>
      </div>
    );
  }

  const drafts = articles.filter(a => a.review_status !== "approved" || a.pipeline_state !== "published");
  const published = articles.filter(a => a.review_status === "approved" && a.pipeline_state === "published");

  return (
    <div className="min-h-screen bg-slate-900 pb-20 text-white">
      {/* Upper Status Banner */}
      <section className="bg-slate-950 px-6 py-12 border-b border-white/5">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight">マイダッシュボード</h1>
            <p className="mt-2 text-sm text-slate-400">
              登録アドレス: <span className="font-semibold text-slate-200">{user?.email}</span>
            </p>
          </div>
          
          <div className="flex flex-wrap items-stretch gap-4">
            {/* Credit Card */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">保有クレジット</p>
                <p className="text-3xl font-black text-sky-400 mt-1">{credits ?? 0} <span className="text-xs text-white">回分</span></p>
              </div>
              <button
                onClick={handlePurchase}
                disabled={purchaseLoading}
                className="rounded-lg bg-sky-500 hover:bg-sky-600 transition text-xs font-black px-4 py-2 flex items-center justify-center gap-1 cursor-pointer self-center text-white disabled:opacity-50"
              >
                {purchaseLoading ? "処理中..." : "10回分購入 (1,000円)"}
              </button>
            </div>

            {isDev && (
              <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-2">
                <div className="text-slate-400 text-xs">
                  <span className="font-bold text-amber-400">開発モード</span>
                  <p className="mt-1">Stripeなしでテスト</p>
                </div>
                <button
                  onClick={handleMockPayment}
                  disabled={mockLoading}
                  className="rounded-lg bg-amber-500 hover:bg-amber-600 transition text-xs font-black px-3 py-2 cursor-pointer text-slate-950 disabled:opacity-50"
                >
                  {mockLoading ? "更新中..." : "+10クレジット"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Contents Area */}
      <main className="mx-auto max-w-6xl px-6 mt-10">
        
        {statusMessage && (
          <div className="mb-6 rounded-lg bg-sky-500/10 border border-sky-500/20 p-4 text-sm text-sky-400 font-semibold flex justify-between items-center">
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage("")} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black">生成ロードマップ一覧</h2>
          <Link
            href="/generate"
            className="rounded-full bg-white text-slate-950 px-5 py-2.5 text-sm font-black hover:bg-sky-100 transition flex items-center gap-1.5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            新しいロードマップを作る
          </Link>
        </div>

        {/* Tabs & Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Drafts */}
          <div className="lg:col-span-6 bg-slate-950 border border-white/5 rounded-2xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-slate-100 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                下書き / 承認待ち ({drafts.length})
              </h3>
              <span className="text-xs text-slate-500">まだ一般公開されていません</span>
            </div>

            {drafts.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                <p className="text-sm text-slate-500 font-bold">下書き中のロードマップはありません。</p>
                <p className="text-xs text-slate-600 mt-2">新しいロードマップを生成するとここに表示されます。</p>
              </div>
            ) : (
              <div className="space-y-4">
                {drafts.map((art) => (
                  <div key={art.id} className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-400">
                          {art.category}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(art.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-black text-slate-200 mt-2 text-sm leading-snug">{art.title}</h4>
                    </div>

                    <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                      <button
                        onClick={() => {
                          setSelectedArticle(art);
                          setPreviewOpen(true);
                        }}
                        className="rounded bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-black text-white cursor-pointer transition"
                      >
                        {unlockedArticleIds.has(art.id) ? "プレビュー・公開" : "前半プレビューを確認"}
                      </button>
                      
                      {unlockedArticleIds.has(art.id) ? (
                        <button
                          onClick={() => {
                            setSelectedArticle(art);
                            setRetakeInstructions("");
                            setRetakeOpen(true);
                          }}
                          className="rounded bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 px-3 py-1.5 text-xs font-black text-sky-400 cursor-pointer transition"
                        >
                          リテイク ({art.free_retake_used ? "有料" : "無料残1"})
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnlockArticle(art.id)}
                          disabled={actionLoading}
                          className="rounded bg-sky-500 hover:bg-sky-600 px-3 py-1.5 text-xs font-black text-white cursor-pointer transition flex items-center gap-1 disabled:opacity-50"
                        >
                          🔓 アンロック (1C)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Published */}
          <div className="lg:col-span-6 bg-slate-950 border border-white/5 rounded-2xl p-6 shadow-xl">
            <h3 className="font-black text-slate-100 flex items-center gap-2 mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              本番公開済み ({published.length})
            </h3>

            {published.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                <p className="text-sm text-slate-500 font-bold">一般公開中のロードマップはありません。</p>
                <p className="text-xs text-slate-600 mt-2">下書きを確認後、「公開する」を押すとここに掲載されます。</p>
              </div>
            ) : (
              <div className="space-y-4">
                {published.map((art) => (
                  <div key={art.id} className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-400">
                          {art.category}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(art.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-black text-slate-200 mt-2 text-sm leading-snug">{art.title}</h4>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-white/5">
                      <Link
                        href={`/articles/${art.slug}`}
                        target="_blank"
                        className="rounded bg-emerald-500 hover:bg-emerald-600 px-4 py-1.5 text-xs font-black text-white transition flex items-center gap-1"
                      >
                        記事を読む ↗
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Preview Modal ── */}
      {previewOpen && selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl border border-white/10 bg-slate-950 p-6 md:p-8 shadow-2xl flex flex-col max-h-[90vh]">
            <button
              onClick={() => {
                setPreviewOpen(false);
                setSelectedArticle(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-white text-lg font-black cursor-pointer"
            >
              ✕
            </button>

            <div className="border-b border-white/5 pb-4 mb-4">
              <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs font-black text-amber-400">
                {selectedArticle.category} (承認待ち下書き)
              </span>
              <h3 className="text-xl md:text-2xl font-black text-white mt-3 leading-snug">{selectedArticle.title}</h3>
            </div>

            {/* Article Content Viewer */}
            <div className="flex-1 overflow-y-auto bg-slate-900 border border-white/5 rounded-xl p-4 md:p-6 text-sm text-slate-300 leading-relaxed font-sans prose prose-invert max-w-none">
              {(() => {
                const isUnlocked = unlockedArticleIds.has(selectedArticle.id);
                const hasDelimiter = selectedArticle.body?.includes("<!-- PREMIUM_SECTION -->");
                let displayBody = selectedArticle.body || "";

                if (hasDelimiter && !isUnlocked) {
                  displayBody = displayBody.split("<!-- PREMIUM_SECTION -->")[0] + "\n\n*(後半の計画はロックされています。以下からアンロックできます)*";
                } else if (hasDelimiter) {
                  displayBody = displayBody.replace("<!-- PREMIUM_SECTION -->", "\n\n--- [ここからプレミアム領域] ---\n\n");
                }

                return (
                  <>
                    <div className="mb-6 rounded-lg border border-sky-500/20 bg-sky-500/5 p-4 text-xs font-bold text-sky-300">
                      ※ ロードマップの下書きプレビューを表示しています。
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-sm">{displayBody || "（本文が空です）"}</pre>
                    
                    {hasDelimiter && !isUnlocked && (
                      <div className="mt-8 border-t border-white/10 pt-6 text-center">
                        <p className="text-sm font-bold text-slate-300 mb-3">🔒 残りの50日間の詳細計画と対策はロックされています</p>
                        <button
                          onClick={async () => {
                            await handleUnlockArticle(selectedArticle.id);
                            // Refresh current modal content
                            if (supabase) {
                              const { data: updatedArt } = await supabase
                                .from("articles")
                                .select("body")
                                .eq("id", selectedArticle.id)
                                .single();
                              if (updatedArt) {
                                setSelectedArticle({ ...selectedArticle, body: updatedArt.body });
                              }
                            }
                          }}
                          disabled={actionLoading}
                          className="rounded-lg bg-sky-500 hover:bg-sky-600 px-6 py-2.5 text-xs font-black text-white transition flex items-center justify-center gap-1.5 mx-auto disabled:opacity-50"
                        >
                          {actionLoading ? "処理中..." : "🔓 1クレジットで全体をアンロックする"}
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4 mt-4">
              <div className="text-xs text-slate-500">
                作成日: {new Date(selectedArticle.created_at).toLocaleString()}
              </div>

              <div className="flex gap-3">
                {unlockedArticleIds.has(selectedArticle.id) && (
                  <button
                    onClick={() => {
                      setRetakeInstructions("");
                      setRetakeOpen(true);
                    }}
                    className="rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold px-4 py-2 text-sm cursor-pointer hover:bg-sky-500/20 transition"
                  >
                    リテイク (修正指示を送る)
                  </button>
                )}
                <button
                  onClick={() => handlePublish(selectedArticle.id)}
                  disabled={actionLoading || !unlockedArticleIds.has(selectedArticle.id)}
                  className="rounded-lg bg-emerald-500 text-white font-black px-6 py-2 text-sm cursor-pointer hover:bg-emerald-600 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    "本番公開する (GO)"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Retake Dialog Modal ── */}
      {retakeOpen && selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <button
              onClick={() => setRetakeOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white font-black cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <svg className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
              </svg>
              記事の修正（リテイク）
            </h3>

            <p className="mt-2 text-xs text-slate-400 leading-normal">
              記事の内容をもっと良くするために修正の指示を出してください。LLMが元の記事をベースに自動で再執筆を行います。
            </p>

            <form onSubmit={handleRetakeSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  指示内容（プロンプト）
                </label>
                <textarea
                  required
                  value={retakeInstructions}
                  onChange={(e) => setRetakeInstructions(e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="例：『初心者向けの文章にして』『おすすめアフィリエイトデバイスをもっと手頃な価格のものに変更して』『もっと具体的な手順を追加して』"
                />
              </div>

              <div className="rounded-lg bg-sky-500/5 border border-sky-500/10 p-3 text-xs leading-normal">
                {selectedArticle.free_retake_used ? (
                  <span className="text-amber-400 font-bold">⚠️ 有料リテイク: 1クレジット消費します。</span>
                ) : (
                  <span className="text-sky-400 font-bold">🎉 無料枠利用可能: クレジットを消費せずに1回修正できます。</span>
                )}
              </div>

              <button
                type="submit"
                disabled={actionLoading || !retakeInstructions.trim()}
                className="w-full rounded-lg bg-sky-500 text-white py-3 text-sm font-black transition hover:bg-sky-600 disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer"
              >
                {actionLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    記事を再生成中 (約30秒)...
                  </>
                ) : (
                  "修正を実行する"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
