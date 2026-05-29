"use client";

import { trackEvent } from "@/lib/analytics";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface ShopProductData {
  shop: "amazon" | "rakuten";
  name: string;
  price?: { amount: number; currency: string; display: string };
  imageUrl?: string;
  url: string;
}

type ProductRecommendationProps = {
  name: string;
  reason: string;
  priceHint?: string;
  amazonProduct?: ShopProductData | null;
  rakutenProduct?: ShopProductData | null;
  trackingLabel?: string;
};

/* ------------------------------------------------------------------ */
/* Shop button                                                        */
/* ------------------------------------------------------------------ */

const SHOP_CONFIG: Record<
  "amazon" | "rakuten",
  { label: string; emoji: string; bgColor: string; hoverColor: string }
> = {
  amazon: {
    label: "Amazonで見る",
    emoji: "🛒",
    bgColor: "bg-amber-50/60 border-amber-200/60 hover:bg-amber-100/80",
    hoverColor: "hover:border-amber-300",
  },
  rakuten: {
    label: "楽天で見る",
    emoji: "🔴",
    bgColor: "bg-rose-50/60 border-rose-200/60 hover:bg-rose-100/80",
    hoverColor: "hover:border-rose-300",
  },
};

function ShopButton({
  product,
  trackingLabel,
  productName,
}: {
  product: ShopProductData;
  trackingLabel?: string;
  productName: string;
}) {
  const config = SHOP_CONFIG[product.shop];

  return (
    <a
      href={product.url}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      onClick={() =>
        trackEvent({
          action: "product_recommendation_click",
          category: "monetization",
          label: `${trackingLabel ?? productName}:${product.shop}`,
        })
      }
      className={`flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${config.bgColor} ${config.hoverColor}`}
    >
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-28 w-28 rounded object-contain"
          loading="lazy"
        />
      ) : (
        <div className="flex h-28 w-28 items-center justify-center rounded bg-white/50 text-3xl">
          {config.emoji}
        </div>
      )}
      {product.price && (
        <span className="text-sm font-bold text-slate-800">
          {product.price.display}
        </span>
      )}
      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
        {config.label}
      </span>
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* ProductRecommendation                                              */
/* ------------------------------------------------------------------ */

export function ProductRecommendation({
  name,
  reason,
  priceHint = "まずは無料または低予算から",
  amazonProduct,
  rakutenProduct,
  trackingLabel,
}: ProductRecommendationProps) {
  const hasAmazon = amazonProduct && amazonProduct.url;
  const hasRakuten = rakutenProduct && rakutenProduct.url;
  const hasAny = hasAmazon || hasRakuten;

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50/70 shadow-sm backdrop-blur-sm">
      {/* Header */}
      <div className="p-5 md:p-6 flex flex-col gap-4">
        {/* Header Badges */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs font-bold text-sky-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            推奨書籍 / カリキュラム教材
          </span>
          <span className="rounded-full bg-sky-100/80 px-2.5 py-0.5 text-[10px] font-black text-sky-800">
            {priceHint}
          </span>
        </div>

        {/* Title & Reason */}
        <div>
          <h3 className="text-lg font-black text-slate-950 leading-snug">{name}</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">{reason}</p>
        </div>
      </div>

      {/* Shop buttons */}
      {hasAny && (
        <div className="border-t border-slate-200/50 bg-slate-100/30 p-5 md:p-6">
          <p className="mb-4 text-center text-xs font-bold text-slate-500">
            信頼できる公式ECプラットフォームから購入先を選ぶ
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {hasAmazon && (
              <ShopButton
                product={amazonProduct!}
                trackingLabel={trackingLabel}
                productName={name}
              />
            )}
            {hasRakuten && (
              <ShopButton
                product={rakutenProduct!}
                trackingLabel={trackingLabel}
                productName={name}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
