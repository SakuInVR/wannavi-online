import type { Metadata } from "next";

import { StaticPage } from "@/components/StaticPage";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "Wanna Naviへのお問い合わせ先。",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <StaticPage
      title="お問い合わせ"
      description="掲載内容、広告、取材、修正依頼などはこちらからご連絡ください。"
    >
      <h2>連絡先</h2>
      <p>
        現在のお問い合わせ先は <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a> です。
      </p>

      <h2>返信について</h2>
      <p>
        内容を確認のうえ、必要に応じて返信します。営業、広告掲載、掲載内容の修正依頼は、要点をまとめて送ってください。
      </p>

      <h2>今後の拡張</h2>
      <p>
        公開後は、フォームサービスまたは独自APIを使った問い合わせフォームを追加できます。
      </p>
    </StaticPage>
  );
}
