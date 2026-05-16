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
  disclosure = "PRを含む場合があります",
  trackingLabel,
}: AffiliateCTAProps) {
  return (
    <aside className="my-8 rounded-lg border border-amber-200 bg-amber-50 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
        {disclosure}
      </p>
      <h3 className="mt-2 text-xl font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
      <a
        href={href}
        className="mt-4 inline-flex rounded-full bg-slate-950 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
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
    </aside>
  );
}
