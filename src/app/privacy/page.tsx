import type { Metadata } from "next";

import { StaticPage } from "@/components/StaticPage";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "Wanna Naviの個人情報、アクセス解析、広告配信、アフィリエイトに関する方針。",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <StaticPage
      title="プライバシーポリシー"
      description="当サイトにおける個人情報、アクセス解析、広告配信、アフィリエイトの取り扱いを記載します。"
    >
      <h2>個人情報の利用目的</h2>
      <p>
        お問い合わせ時に入力された氏名、メールアドレス等は、返信や必要な連絡のために利用します。
        目的外の利用は行いません。
      </p>

      <h2>アクセス解析ツールについて</h2>
      <p>
        当サイトでは、サイト改善のためにGoogle Analyticsなどのアクセス解析ツールを利用する場合があります。
        取得される情報は匿名の統計情報であり、個人を特定するものではありません。
      </p>

      <h2>広告配信について</h2>
      <p>
        当サイトでは、Google AdSenseなどの第三者配信広告サービスを利用する場合があります。
        広告配信事業者は、ユーザーの興味に応じた広告を表示するためCookieを使用することがあります。
      </p>

      <h2>アフィリエイトについて</h2>
      <p>
        当サイトは、Amazonアソシエイト、楽天アフィリエイト、ASPなどのアフィリエイトプログラムを
        利用する場合があります。リンク経由で商品やサービスが購入された場合、当サイトが報酬を受け取ることがあります。
      </p>

      <h2>免責事項</h2>
      <p>
        掲載情報はできる限り正確になるよう努めますが、内容の正確性や安全性を保証するものではありません。
        商品やサービスの利用は、公式情報を確認のうえご自身の判断で行ってください。
      </p>

      <h2>お問い合わせ</h2>
      <p>
        本ポリシーに関するお問い合わせは{" "}
        <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>{" "}
        までご連絡ください。
      </p>
    </StaticPage>
  );
}
