"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { categories } from "@/lib/site";
import type { User } from "@supabase/supabase-js";

export default function GeneratePage() {
  const router = useRouter();
  const supabase = getSupabase();

  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [goal, setGoal] = useState("");
  const [category, setCategory] = useState("dtm");
  const [currentSkill, setCurrentSkill] = useState("");
  const [availableTime, setAvailableTime] = useState("毎日1時間");
  const [budget, setBudget] = useState("できるだけお金をかけずに");
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>(["", "", ""]);
  const [extraInstructions, setExtraInstructions] = useState("");

  // Generation states
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!supabase) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }

    const checkAuthAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?redirectTo=/generate");
        return;
      }
      setUser(session.user);

      // Fetch credits
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

    checkAuthAndProfile();
  }, [supabase, router]);

  const handleYoutubeChange = (index: number, val: string) => {
    const next = [...youtubeUrls];
    next[index] = val;
    setYoutubeUrls(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return;

    setGenerating(true);
    setGenStep(1);
    setErrorMsg("");

    // Simulate step increments (1: research, 2: Deepseek, 3: completed)
    const interval = setInterval(() => {
      setGenStep((prev) => {
        if (prev < 3) return prev + 1;
        return prev;
      });
    }, 10000);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Clean youtubeUrls: filter out empty inputs
      const filteredUrls = youtubeUrls.filter((url) => url.trim().startsWith("http"));

      const res = await fetch("/api/articles/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          goal,
          category,
          currentSkill,
          availableTime,
          budget,
          youtubeUrls: filteredUrls,
          extra_instructions: extraInstructions,
        }),
      });

      const data = await res.json();
      clearInterval(interval);

      if (res.ok && data.success) {
        setGenStep(4);
        setTimeout(() => {
          router.push("/dashboard?generate=success");
        }, 1500);
      } else {
        setErrorMsg(data.error || "ロードマップの自動生成に失敗しました。");
        setGenerating(false);
      }
    } catch (err: unknown) {
      clearInterval(interval);
      setErrorMsg("通信エラーが発生しました。時間を置いて再度お試しください。");
      setGenerating(false);
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-slate-950 text-white">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-400">ロードマップ作成画面をロード中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-20 text-white">
      {/* Step Loader during generation */}
      {generating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 px-6">
          <div className="relative h-24 w-24">
            <span className="absolute inset-0 animate-ping rounded-full bg-sky-500/20" />
            <span className="absolute inset-2 animate-pulse rounded-full bg-sky-500/40" />
            <span className="absolute inset-6 rounded-full bg-sky-500 flex items-center justify-center">
              <svg className="h-6 w-6 text-white animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
              </svg>
            </span>
          </div>

          <h2 className="mt-8 text-2xl font-black text-white">AIロードマップを自動作成中...</h2>
          <p className="mt-2 text-xs text-slate-400">これには約15〜30秒かかります。ページを閉じないでお待ちください。</p>

          {/* Steps Display */}
          <div className="mt-10 w-full max-w-sm space-y-4">
            <div className={`flex items-center gap-3 transition-opacity ${genStep >= 1 ? "opacity-100" : "opacity-30"}`}>
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-black ${genStep > 1 ? "bg-emerald-500 text-white" : "bg-sky-500 text-slate-950"}`}>
                {genStep > 1 ? "✓" : "1"}
              </span>
              <span className="text-sm font-bold">アンケート情報の分析とリサーチ中</span>
            </div>

            <div className={`flex items-center gap-3 transition-opacity ${genStep >= 2 ? "opacity-100" : "opacity-30"}`}>
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-black ${genStep > 2 ? "bg-emerald-500 text-white" : genStep === 2 ? "bg-sky-500 text-slate-950" : "bg-white/10 text-slate-500"}`}>
                {genStep > 2 ? "✓" : "2"}
              </span>
              <span className="text-sm font-bold">DeepSeek LLM によるロードマップ執筆中</span>
            </div>

            <div className={`flex items-center gap-3 transition-opacity ${genStep >= 3 ? "opacity-100" : "opacity-30"}`}>
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-black ${genStep > 3 ? "bg-emerald-500 text-white" : genStep === 3 ? "bg-sky-500 text-slate-950" : "bg-white/10 text-slate-500"}`}>
                {genStep > 3 ? "✓" : "3"}
              </span>
              <span className="text-sm font-bold">プレミアム領域の分割と保存準備中</span>
            </div>

            <div className={`flex items-center gap-3 transition-opacity ${genStep >= 4 ? "opacity-100" : "opacity-30"}`}>
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-black ${genStep === 4 ? "bg-emerald-500 text-white" : "bg-white/10 text-slate-500"}`}>
                4
              </span>
              <span className="text-sm font-bold">下書きデータベース保存完了！</span>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-2xl px-6 mt-12">
        <div className="mb-6 flex items-center gap-2 text-xs font-bold text-slate-400">
          <Link href="/dashboard" className="hover:text-white transition">ダッシュボード</Link>
          <span>/</span>
          <span className="text-slate-200">新規作成</span>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-950 p-8 shadow-xl">
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <svg className="h-6 w-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AIロードマップの作成
          </h1>
          <p className="mt-2 text-xs text-slate-400 leading-normal">
            なりたい姿や現在のレベルを伝えるだけで、あなた専用のスモールステップ学習プランを下書き生成します。生成自体は無料で行え、前半部分はすぐにプレビュー確認できます。
          </p>

          <div className="mt-6 rounded-xl border border-sky-500/20 bg-sky-500/10 p-4 text-xs leading-normal">
            <span className="font-black text-sky-400 block mb-1">💡 クレジットの仕組み</span>
            ロードマップの生成と前半部分のプレビュー確認は**無料（クレジット消費なし）**です。
            後半部分（後半ステップの詳細、挫折防止対策、信頼できるリソース）をアンロックして閲覧・公開するには **1クレジット** を消費します。
            {credits !== null && <span className="block mt-1 font-bold">（現在の保有残高: {credits} クレジット）</span>}
          </div>

          {errorMsg && (
            <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm font-semibold text-red-400">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Goal */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                1. なりたい姿・達成したい目標
              </label>
              <input
                type="text"
                required
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="例：AIエンジニアになりたい、ピアノでショパンを弾けるようになりたい、ゲームで上位1%に入りたい"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                2. ロードマップのジャンル
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white transition text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Skill */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                3. 現在のスキルレベル・保有知識
              </label>
              <textarea
                value={currentSkill}
                required
                onChange={(e) => setCurrentSkill(e.target.value)}
                rows={2}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="例：『プログラミングは完全未経験。PCの基本操作は可能』『楽譜は読めるが、ピアノに触るのは10年ぶり』"
              />
            </div>

            {/* Available Time & Budget */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  4. 1日の学習可能時間
                </label>
                <select
                  value={availableTime}
                  onChange={(e) => setAvailableTime(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white transition text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="毎日30分程度">毎日30分程度</option>
                  <option value="毎日1時間">毎日1時間</option>
                  <option value="毎日2〜3時間">毎日2〜3時間</option>
                  <option value="週末にまとめて5時間以上">週末にまとめて5時間以上</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  5. 学習にあてられる予算
                </label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white transition text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="できるだけお金をかけずに（無料メイン）">できるだけお金をかけずに（無料メイン）</option>
                  <option value="1万円以内（入門書や安価な教材）">1万円以内（入門書や安価な教材）</option>
                  <option value="5万円以内（有料スクールや機材導入も検討）">5万円以内（有料スクールや機材導入も検討）</option>
                  <option value="制限なし（最適な教材・環境を優先）">制限なし（最適な教材・環境を優先）</option>
                </select>
              </div>
            </div>

            {/* YouTube Links (Optional) */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                6. 参考にしてほしいYouTube動画のURL (任意 - 最大3本)
              </label>
              <p className="text-[10px] text-slate-500 -mt-1 leading-normal">
                特定の動画URLを記入すると、その動画の内容やつまずきポイントをロードマップ作成の参考に組み込みます。
              </p>
              {youtubeUrls.map((url, idx) => (
                <input
                  key={idx}
                  type="url"
                  value={url}
                  onChange={(e) => handleYoutubeChange(idx, e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-600 transition text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder={`YouTube動画URL #${idx + 1}`}
                />
              ))}
            </div>

            {/* Extra instructions */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                7. AIへの具体的な追加指示 (任意)
              </label>
              <textarea
                value={extraInstructions}
                onChange={(e) => setExtraInstructions(e.target.value)}
                rows={2}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="例：『独学を前提にしたプランにして』『モチベーション維持のための具体的なアドバイスを多めにして』"
              />
            </div>

            <div className="border-t border-white/5 pt-4 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                プレビュー作成: <span className="font-bold text-sky-400">無料 (0クレジット)</span>
              </div>
              <button
                type="submit"
                disabled={!goal.trim()}
                className="rounded-lg bg-white text-slate-950 px-6 py-3 text-sm font-black hover:bg-sky-100 transition disabled:opacity-50 cursor-pointer"
              >
                ロードマップを自動生成する
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
