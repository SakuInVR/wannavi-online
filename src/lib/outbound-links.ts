import affiliateProducts from "../../content/affiliate-products.json";

export type OutboundLink = {
  id: string;
  label: string;
  envKey: string;
  fallbackUrl?: string;
  category:
    | "ai-engineer"
    | "dtm"
    | "vr-creator"
    | "instrument-player"
    | "video-creator"
    | "general";
};

export const outboundLinks: OutboundLink[] = [
  {
    id: "ai-tools",
    label: "AI開発ツール候補",
    envKey: "AFFILIATE_AI_TOOLS_URL",
    category: "ai-engineer",
  },
  {
    id: "dtm-starter-kit",
    label: "DTM初心者向け機材候補",
    envKey: "AFFILIATE_DTM_STARTER_KIT_URL",
    category: "dtm",
  },
  {
    id: "vr-creator-kit",
    label: "VR制作環境候補",
    envKey: "AFFILIATE_VR_CREATOR_KIT_URL",
    category: "vr-creator",
  },
  {
    id: "instrument-starter-kit",
    label: "楽器練習スタート候補",
    envKey: "AFFILIATE_INSTRUMENT_STARTER_KIT_URL",
    category: "instrument-player",
  },
];

type AffiliateProduct = {
  id: string;
  label: string;
  envKey: string;
  category: OutboundLink["category"];
};

const productLinks: OutboundLink[] = (affiliateProducts as AffiliateProduct[]).map(
  (product) => ({
    id: product.id,
    label: product.label,
    envKey: product.envKey,
    category: product.category,
  }),
);

export const allOutboundLinks = [...outboundLinks, ...productLinks];

export function getOutboundLink(id: string) {
  return allOutboundLinks.find((link) => link.id === id);
}

export function getOutboundUrl(link: OutboundLink) {
  return process.env[link.envKey] || link.fallbackUrl || "";
}

export function outboundHref(id: string) {
  return `/go/${id}`;
}
