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
    <aside className="my-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          {disclosure}
        </p>
        <h3 className="mt-2 text-xl font-bold text-slate-950">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="border-t border-slate-100 px-5 py-4">
        <a
          href={href}
          className="inline-flex rounded-full bg-slate-950 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
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
          {label}
        </a>
      </div>
    </aside>
  );
}
