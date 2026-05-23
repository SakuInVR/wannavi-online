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
    bgColor: "bg-amber-50 border-amber-200 hover:bg-amber-100",
    hoverColor: "hover:border-amber-400",
  },
  rakuten: {
    label: "楽天で見る",
    emoji: "🔴",
    bgColor: "bg-red-50 border-red-200 hover:bg-red-100",
    hoverColor: "hover:border-red-400",
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
    <div className="my-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
          おすすめ
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h3 className="text-xl font-bold text-slate-950">{name}</h3>
          <span className="shrink-0 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
            {priceHint}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{reason}</p>
      </div>

      {/* Shop buttons */}
      {hasAny && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
          <p className="mb-3 text-center text-xs font-medium text-slate-500">
            購入先を選んでください
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
