import type { Metadata } from "next";

import { StaticPage } from "@/components/StaticPage";

export const metadata: Metadata = {
  title: "広告・PR表記",
  description: "Wanna Naviの広告、アフィリエイトリンク、PR表記に関する方針。",
  alternates: {
    canonical: "/disclosure",
  },
};

export default function DisclosurePage() {
  return (
    <StaticPage
      title="広告・PR表記"
      description="当サイトで利用する広告、アフィリエイトリンク、PR表記の方針です。"
    >
      <h2>広告・アフィリエイトリンクについて</h2>
      <p>
        当サイトの記事には、広告、アフィリエイトリンク、PRリンクが含まれる場合があります。
        リンク経由で商品やサービスの購入、登録が行われた場合、当サイトが報酬を受け取ることがあります。
      </p>

      <h2>掲載基準</h2>
      <p>
        商品やサービスは、記事のテーマや読者の目的に合うものを中心に掲載します。
        報酬の有無だけで掲載を判断せず、始めやすさ、費用、使いやすさ、継続しやすさを重視します。
      </p>

      <h2>表記ルール</h2>
      <p>
        広告やアフィリエイトリンクを含む可能性がある記事では、記事内またはリンク付近にPR表記を行います。
      </p>
    </StaticPage>
  );
}
