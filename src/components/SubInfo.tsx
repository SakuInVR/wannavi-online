"use client";

import { useState } from "react";

interface SubInfoProps {
  subscriptionStatus: string | null;
  credits: number;
  completedCount: number;
  chatCount: number;
  onSubscribe: () => void;
  loading: boolean;
}

export function SubInfo({
  subscriptionStatus,
  credits,
  completedCount,
  chatCount,
  onSubscribe,
  loading,
}: SubInfoProps) {
  const isPro = subscriptionStatus === "active" || subscriptionStatus === "pro";

  // Define gamified achievements
  const badges = [
    {
      id: "first_step",
      name: "最初の一歩",
      desc: "学習プロジェクトを1つ以上開始する",
      icon: "🎯",
      unlocked: credits >= 0 || isPro, // Automatically unlocked since user is in dashboard
    },
    {
      id: "seeker",
      name: "真理の探求者",
      desc: "AIメンターに5回以上質問する",
      icon: "🔮",
      unlocked: chatCount >= 5,
    },
    {
      id: "master",
      name: "マスター",
      desc: "ロードマッププロジェクトを1つ完了させる",
      icon: "🏆",
      unlocked: completedCount >= 1,
    },
    {
      id: "elite",
      name: "エリート会員",
      desc: "Wannavi Pro サブスクリプションに加入中",
      icon: "💎",
      unlocked: isPro,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Subscription & Plan Status Box */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-950 p-6 shadow-xl">
        {/* Subtle decorative glow */}
        <div className={`absolute -right-16 -top-16 h-36 w-36 rounded-full blur-3xl opacity-20 transition-all ${isPro ? "bg-emerald-500" : "bg-sky-500"}`} />

        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">メンバーシップステータス</h3>

        <div className="mt-4 flex items-baseline gap-2">
          {isPro ? (
            <>
              <span className="text-2xl font-black text-emerald-400">Wanna Navi Pro</span>
              <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                ACTIVE
              </span>
            </>
          ) : (
            <>
              <span className="text-2xl font-black text-slate-200">無料プラン</span>
              <span className="rounded bg-slate-200/10 border border-white/10 px-2 py-0.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                FREE TIER
              </span>
            </>
          )}
        </div>

        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          {isPro
            ? "プロプランが有効です。AIメンターとの対話、ロードマップ生成、学習管理ツールを無制限でお使いいただけます。"
            : "無料プランでは、各ロードマップのプレビューまで可能です。プロジェクト進行管理やAIメンターへの相談はクレジットを都度消費します。"}
        </p>

        {!isPro && (
          <button
            onClick={onSubscribe}
            disabled={loading}
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white py-3 text-xs font-black transition cursor-pointer shadow-lg shadow-sky-500/10 disabled:opacity-50"
          >
            {loading ? "処理中..." : "Pro サブスクを開始する (月額 ¥1,480)"}
          </button>
        )}
      </div>

      {/* 2. Gamified Achievement Badges */}
      <div className="rounded-2xl border border-white/5 bg-slate-950 p-6 shadow-xl">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <span>🏆</span> ラーニング実績バッジ
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`relative rounded-xl border p-3 flex flex-col items-center text-center transition ${
                badge.unlocked
                  ? "border-sky-500/20 bg-sky-500/5 text-slate-200"
                  : "border-white/5 bg-white/5 opacity-40 text-slate-500"
              }`}
            >
              <span className="text-2xl mb-1.5">{badge.icon}</span>
              <span className="text-xs font-black leading-snug">{badge.name}</span>
              <span className="text-[9px] text-slate-400 mt-1 leading-normal max-w-[100px]">
                {badge.desc}
              </span>
              
              {badge.unlocked && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
