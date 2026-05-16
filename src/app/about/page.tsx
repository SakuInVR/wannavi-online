import type { Metadata } from "next";

import { StaticPage } from "@/components/StaticPage";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "運営者情報",
  description: "Wanna Naviの運営方針、サイトの目的、掲載内容について。",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <StaticPage
      title="運営者情報"
      description="Wanna Naviは、なりたい自分へ進むための実践ロードマップをまとめるメディアです。"
    >
      <h2>サイト名</h2>
      <p>{siteConfig.name}</p>

      <h2>サイトURL</h2>
      <p>{siteConfig.url}</p>

      <h2>運営方針</h2>
      <p>
        AI開発、DTM、VR制作など、初心者が最初の一歩で迷いやすい分野を中心に、必要な道具、学習手順、つまずきポイントを整理します。
      </p>

      <h2>掲載内容について</h2>
      <p>
        記事では、実践しやすさ、再現性、費用対効果を重視します。商品やサービスを紹介する場合も、読者の目的に合うかを優先して掲載します。
      </p>
    </StaticPage>
  );
}
