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
      description="Wanna Naviは、何かを始めたい人のために、最初の一歩から道具選びまでを整理する実践メディアです。"
    >
      <h2>サイト名</h2>
      <p>{siteConfig.name}</p>

      <h2>サイトURL</h2>
      <p>{siteConfig.url}</p>

      <h2>運営方針</h2>
      <p>
        Wanna Naviでは、AI開発、DTM、VR制作など「なりたい」「作れるようになりたい」という気持ちを出発点に、
        初心者が迷いやすい順番、必要な道具、学習の進め方をロードマップ形式でまとめます。
      </p>
      <p>
        単なる商品の紹介ではなく、実際に始めるときの不安やつまずき、費用感、継続しやすさを重視して、
        読者が自分の状況に合わせて判断できる記事作りを目指します。
      </p>

      <h2>掲載内容について</h2>
      <p>
        記事では、実践しやすさ、再現性、費用対効果を重視します。商品やサービスを紹介する場合も、
        読者の目的に合うかどうかを優先して掲載します。
      </p>

      <h2>お問い合わせ</h2>
      <p>
        掲載内容の修正依頼、広告掲載、取材相談などは{" "}
        <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>{" "}
        までご連絡ください。
      </p>
    </StaticPage>
  );
}
