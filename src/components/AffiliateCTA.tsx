"use client";

import { trackEvent } from "@/lib/analytics";

type AffiliateCTAProps = {
  title: string;
  description: string;
  href?: string;
  label?: string;
  disclosure?: string;
  trackingLabel?: string;
};

export function AffiliateCTA({
  title,
  description,
  href = "#",
  label = "詳しく見る",
  disclosure = "PR",
  trackingLabel,
}: AffiliateCTAProps) {
  return (
    <aside className="my-8 overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50/70 p-5 md:p-6 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-4">
        {/* Header Badges */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs font-bold text-sky-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            カリキュラム推奨教材
          </span>
          <span className="rounded bg-slate-200/60 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500">
            {disclosure}
          </span>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-lg font-black text-slate-950 leading-snug">{title}</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">{description}</p>
        </div>

        {/* Link Button */}
        <div className="border-t border-slate-200/50 pt-4 flex items-center justify-between">
          <a
            href={href}
            className="inline-flex items-center gap-1 rounded-full bg-slate-950 hover:bg-sky-600 px-5 py-2.5 text-xs font-black text-white transition shadow-sm cursor-pointer"
            rel="nofollow sponsored noopener noreferrer"
            target={href === "#" ? undefined : "_blank"}
            onClick={() =>
              trackEvent({
                action: "affiliate_cta_click",
                category: "monetization",
                label: trackingLabel ?? title,
              })
            }
          >
            教材の詳細を見る
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </aside>
  );
}
