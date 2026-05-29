"use client";

import { trackEvent } from "@/lib/analytics";

type ToolRecommendationProps = {
  name: string;
  reason: string;
  priceHint?: string;
  href?: string;
  trackingLabel?: string;
};

export function ToolRecommendation({
  name,
  reason,
  priceHint = "まずは無料または低予算から",
  href = "#",
  trackingLabel,
}: ToolRecommendationProps) {
  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50/70 p-5 md:p-6 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-4">
        {/* Header Tags */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs font-bold text-sky-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            推奨開発ツール / 機材
          </span>
          <span className="rounded-full bg-sky-100/80 px-2.5 py-0.5 text-[10px] font-black text-sky-800">
            {priceHint}
          </span>
        </div>

        {/* Name & Reason */}
        <div>
          <h3 className="text-lg font-black text-slate-950 leading-snug">{name}</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">{reason}</p>
        </div>

        {/* CTA Button */}
        <div className="border-t border-slate-200/50 pt-4">
          <a
            href={href}
            className="inline-flex items-center gap-1 rounded-full bg-slate-950 hover:bg-sky-600 px-5 py-2.5 text-xs font-black text-white transition shadow-sm cursor-pointer"
            rel="nofollow sponsored noopener noreferrer"
            target={href === "#" ? undefined : "_blank"}
            onClick={() =>
              trackEvent({
                action: "tool_recommendation_click",
                category: "monetization",
                label: trackingLabel ?? name,
              })
            }
          >
            ツールの詳細を見る
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
