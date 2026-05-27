"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

interface UnlockCardProps {
  articleId: string;
  slug: string;
}

export function UnlockCard({ articleId, slug }: UnlockCardProps) {
  const router = useRouter();
  const supabase = getSupabase();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(session.user);

      // 1. Check if already unlocked via Supabase Client (safe with RLS)
      const { data: unlock } = await supabase
        .from("article_unlocks")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("article_id", articleId)
        .maybeSingle();

      if (unlock) {
        setIsUnlocked(true);
        setLoading(false);
        return;
      }

      // 2. Fetch credits
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setCredits(profile.credits);
      }
      setLoading(false);
    };

    checkStatus();
  }, [supabase, articleId]);

  const handleUnlock = async () => {
    if (!supabase || !user) return;
    setActionLoading(true);
    setErrorMsg("");

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
        setIsUnlocked(true);
        // Refresh page so server component re-renders with full content
        router.refresh();
      } else {
        setErrorMsg(data.error || "アンロックに失敗しました。");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("通信エラーが発生しました。時間を置いて再度お試しください。");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-8 rounded-2xl border border-white/5 bg-slate-950 p-8 text-center text-slate-400">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent mb-2" />
        <p className="text-xs">ステータスを確認中...</p>
      </div>
    );
  }

  // If already unlocked, just show a friendly message (the Server Component should ideally refresh,
  // but if client state is lagging behind, we show this)
  if (isUnlocked) {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
        <p className="text-sm font-bold text-emerald-400">🎉 ロードマップ全体がアンロックされました！</p>
        <p className="text-xs text-slate-400 mt-1">ページが完全に表示されない場合は再読み込みしてください。</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {/* Blurred mock preview of premium sections */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/5 bg-slate-950/40 p-6 select-none pointer-events-none opacity-20 filter blur-[3.5px]">
        <h4 className="text-sm font-black text-slate-300 mb-3">## 後半戦ロードマップ（ステップ3〜5）※ロック中</h4>
        <div className="space-y-4 font-sans text-left">
          <div>
            <h5 className="text-xs font-bold text-slate-400">### ステップ3: 応用スキルの実戦演習</h5>
            <p className="text-[10px] text-slate-500 mt-1">
              基礎学習を終えたら、次は実際のユースケースに沿った応用トレーニングを行います。独自のサンプル作成や課題をクリアしていく具体的な手順です。
            </p>
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-400">### ステップ4: 実践プロトタイプ制作と公開</h5>
            <p className="text-[10px] text-slate-500 mt-1">
              実際に作ったものを他者に公開するフェーズです。このステップで多くの人が直面する「フィードバックがない」「モチベーション低下」などの罠と回避策を詳解します。
            </p>
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-400">### ステップ5: 自立学習の仕組み化とゴール到達</h5>
            <p className="text-[10px] text-slate-500 mt-1">
              学習カリキュラムの最終ステップです。自律的に学びを続ける環境の作り方や、メンターなしでゴールを突破するための設計図を示します。
            </p>
          </div>
          <div className="mt-4">
            <h5 className="text-xs font-bold text-slate-400">## 挫折を防ぐための具体的な罠と対策</h5>
            <p className="text-[10px] text-slate-500 mt-1">
              ・罠①：モチベーションの喪失（メカニズムと具体的な回復・予防策）<br />
              ・罠②：環境依存のエラー（解決プロセスの組み立て方とコミュニティ）
            </p>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/80 to-transparent" />
      </div>

      {/* Actual unlock card */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-b from-slate-950 via-slate-950 to-sky-950/20 p-6 md:p-8 shadow-2xl">
        {/* Visual background element */}
        <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-sky-500/5 blur-3xl" />
        <div className="absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-indigo-500/5 blur-3xl" />

        <div className="relative z-10 text-center">
          {/* Lock Icon */}
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10 text-sky-400 mb-4">
            <svg className="h-6 w-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </span>

          <h3 className="text-lg font-black text-white">🔒 ロードマップの後半部分をアンロック</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            缶コーヒー1本分未満の投資（100円相当）で、この目標に向けたプロのアドバイスと実践計画のすべてを解放できます。
          </p>

          {/* Value Checklist */}
          <div className="my-6 max-w-md mx-auto rounded-xl border border-white/5 bg-white/5 p-4 text-left font-sans">
            <p className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-1">
              <span className="text-sky-400">✦</span> アンロックで手に入る特別な価値：
            </p>
            <ul className="space-y-2 text-[11px] text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-sky-400 font-bold">✓</span>
                <span><strong>後半のロードマップ（ステップ3〜5）</strong>: 具体的な応用実践プランと行動手順</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-400 font-bold">✓</span>
                <span><strong>挫折を未然に防ぐ罠と対策</strong>: つまずきやすい箇所と具体的な突破方法</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-400 font-bold">✓</span>
                <span><strong>推奨学習ソースの一覧テーブル</strong>: 書籍、公式チュートリアル等の詳細リファレンス</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>1回分の無料リテイク（修正指示）権利</strong>: 生成プランを自分好みに再調整可能</span>
              </li>
            </ul>
          </div>

          {errorMsg && (
            <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-400">
              {errorMsg}
            </div>
          )}

          <div className="mt-6 flex flex-col items-center justify-center gap-3">
            {!user ? (
              <Link
                href={`/login?redirectTo=/articles/${slug}`}
                className="rounded-lg bg-white text-slate-950 px-8 py-3 text-sm font-black hover:bg-sky-100 transition shadow-lg cursor-pointer"
              >
                ログインしてロードマップをアンロックする
              </Link>
            ) : (
              <>
                {credits !== null && credits > 0 ? (
                  <>
                    <button
                      onClick={handleUnlock}
                      disabled={actionLoading}
                      className="rounded-lg bg-sky-500 hover:bg-sky-600 transition text-white font-black px-8 py-3 text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          アンロック中...
                        </>
                      ) : (
                        "1クレジットで全体をアンロックする (100円分)"
                      )}
                    </button>
                    <p className="text-[10px] text-slate-500">
                      保有クレジット: <span className="font-bold text-sky-400">{credits}</span> クレジット
                    </p>
                  </>
                ) : (
                  <div className="w-full max-w-sm rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
                    <p className="text-xs text-amber-400 font-bold">⚠️ クレジット残高がありません</p>
                    <p className="text-[10px] text-slate-400 mt-1">アンロックするにはクレジットのチャージが必要です。</p>
                    <Link
                      href="/dashboard"
                      className="mt-3 inline-block rounded-lg bg-amber-500 text-slate-950 px-6 py-2 text-xs font-black hover:bg-amber-600 transition cursor-pointer"
                    >
                      ダッシュボードでクレジットを購入する →
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
