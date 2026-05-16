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
    <div className="my-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
            おすすめ道具
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-950">{name}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{reason}</p>
        </div>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
          {priceHint}
        </span>
      </div>
      <a
        href={href}
        className="mt-4 inline-flex text-sm font-bold text-sky-700 hover:text-sky-900"
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
        候補を見る
      </a>
    </div>
  );
}
