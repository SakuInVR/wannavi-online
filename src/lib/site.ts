export const siteConfig = {
  name: "Wanna Navi",
  domain: "wannavi.online",
  url: "https://www.wannavi.online",
  contactEmail: "info@wannavi.online",
  adsenseClient: "ca-pub-9852760004523512",
  gaMeasurementId: "G-GKHT28VF83",
  description:
    "なりたい自分へ進むための、実践ロードマップと道具選びをまとめるメディア。",
};

export const staticPages = [
  { href: "/about", title: "運営者情報" },
  { href: "/privacy", title: "プライバシーポリシー" },
  { href: "/contact", title: "お問い合わせ" },
  { href: "/disclosure", title: "広告・PR表記" },
] as const;

export const categories = [
  {
    slug: "ai-engineer",
    title: "AIエンジニアになりたい",
    description:
      "AIツール、開発環境、ポートフォリオ制作までをゼロから進めるロードマップ。",
    accent: "from-sky-500 to-cyan-400",
  },
  {
    slug: "dtm",
    title: "DTMerになりたい",
    description:
      "最初の機材、作曲の練習、曲作りまで、音を形にするための実践ナビ。",
    accent: "from-fuchsia-500 to-rose-400",
  },
  {
    slug: "vr-creator",
    title: "VRクリエイターになりたい",
    description:
      "VRChat、アバター、Quest対応、ワールド制作のつまずきを減らすガイド。",
    accent: "from-emerald-500 to-lime-400",
  },
  {
    slug: "instrument-player",
    title: "楽器演奏者になりたい",
    description:
      "大人の練習習慣、最初の楽器選び、上達の記録を続けるための実践ナビ。",
    accent: "from-violet-500 to-indigo-400",
  },
] as const;

export type CategorySlug = (typeof categories)[number]["slug"];

export function getCategory(slug: string) {
  return categories.find((category) => category.slug === slug);
}
