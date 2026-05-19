"use client";

import { trackEvent } from "@/lib/analytics";

type AdCreativeCardProps = {
  id: string;
  title: string;
  description: string;
  href: string;
  imageUrl: string;
  imageAlt: string;
  impressionUrl?: string;
  ctaLabel?: string;
};

export function AdCreativeCard({
  id,
  title,
  description,
  href,
  imageUrl,
  imageAlt,
  impressionUrl,
  ctaLabel = "公式ページを見る",
}: AdCreativeCardProps) {
  return (
    <aside className="my-10 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <a
        href={href}
        className="group block"
        rel="nofollow sponsored noopener noreferrer"
        target="_blank"
        onClick={() =>
          trackEvent({
            action: "ad_creative_click",
            category: "monetization",
            label: id,
          })
        }
      >
        <div className="relative bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element -- ASP banner URLs can be remote ad assets that should not go through Next image optimization. */}
          <img
            src={imageUrl}
            alt={imageAlt}
            className="aspect-[16/9] w-full object-cover transition duration-300 group-hover:scale-[1.01]"
            loading="lazy"
          />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-slate-700 shadow-sm">
            PR
          </span>
        </div>
        <div className="p-5">
          <h3 className="text-lg font-black leading-snug text-slate-950">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          <span className="mt-4 inline-flex text-sm font-bold text-sky-700 group-hover:text-sky-900">
            {ctaLabel}
          </span>
        </div>
      </a>
      {impressionUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- ASP impression pixels must be requested exactly as provided.
        <img
          src={impressionUrl}
          alt=""
          width="1"
          height="1"
          loading="lazy"
          className="sr-only"
        />
      ) : null}
    </aside>
  );
}
