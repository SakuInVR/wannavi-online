import type { CategorySlug } from "@/lib/site";
import { outboundHref } from "@/lib/outbound-links";

export type MonetizationOffer = {
  title: string;
  description: string;
  label: string;
  href: string;
};

export const monetizationOffers: Record<CategorySlug, MonetizationOffer> = {
  "ai-engineer": {
    title: "AI開発を始めるための道具リスト",
    description:
      "AIエディタ、学習教材、ホスティング、開発PCまわりを、最初の1ヶ月で使う順に整理します。",
    label: "AI開発の候補を見る",
    href: outboundHref("ai-tools"),
  },
  dtm: {
    title: "DTM初心者の最初の機材セット",
    description:
      "DAW、ヘッドホン、MIDIキーボードなど、最初に買うものと後回しでいいものを分けて選べます。",
    label: "DTM機材の候補を見る",
    href: outboundHref("dtm-starter-kit"),
  },
  "vr-creator": {
    title: "VR制作を始めるための基本セット",
    description:
      "VR機器、Unity環境、アバター制作まわりの道具を、つまずきにくい順番で整理します。",
    label: "VR制作の候補を見る",
    href: outboundHref("vr-creator-kit"),
  },
  "instrument-player": {
    title: "楽器練習を続けるための基本セット",
    description:
      "最初の楽器、練習環境、譜面、録音、レッスン候補を、続けやすさから整理します。",
    label: "楽器練習の候補を見る",
    href: outboundHref("instrument-starter-kit"),
  },
};

export function getMonetizationOffer(category: string) {
  if (category in monetizationOffers) {
    return monetizationOffers[category as CategorySlug];
  }

  return undefined;
}
