import adCreatives from "../../content/ad-creatives.json";
import { outboundHref } from "@/lib/outbound-links";

export type AdCreativeStatus = "candidate" | "applied" | "approved" | "rejected";

export type AdCreative = {
  id: string;
  productId: string;
  title: string;
  description: string;
  asp: "a8" | "moshimo" | "valuecommerce" | "other";
  status: AdCreativeStatus;
  imageUrl?: string;
  imageAlt?: string;
  width?: number;
  height?: number;
  articleSlugs: string[];
  memo?: string;
};

export function getAdCreatives() {
  return adCreatives as AdCreative[];
}

export function getAdCreative(id: string) {
  return getAdCreatives().find((creative) => creative.id === id);
}

export function getAdCreativesForArticle(slug: string) {
  return getAdCreatives().filter((creative) =>
    creative.articleSlugs.includes(slug),
  );
}

export function getAdCreativeHref(creative: AdCreative) {
  return outboundHref(creative.productId);
}
