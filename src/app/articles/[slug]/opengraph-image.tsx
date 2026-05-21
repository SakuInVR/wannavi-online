import { ImageResponse } from "next/og";

import { getArticleBySlug } from "@/lib/articles";
import { siteConfig } from "@/lib/site";

export const alt = "Wanna Navi article";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

type OpenGraphImageProps = {
  params: Promise<{ slug: string }>;
};

export default async function Image({ params }: OpenGraphImageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f8fafc",
          color: "#0f172a",
          padding: 72,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            fontSize: 26,
          }}
        >
          <span style={{ fontWeight: 900, color: "#0369a1" }}>{siteConfig.name}</span>
          <span style={{ color: "#64748b" }}>{article.categoryTitle}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 70, fontWeight: 900, lineHeight: 1.12 }}>
            {article.title}
          </div>
          <div style={{ marginTop: 28, fontSize: 28, color: "#475569", lineHeight: 1.4 }}>
            {article.description}
          </div>
        </div>
        <div style={{ fontSize: 22, color: "#64748b" }}>{siteConfig.domain}</div>
      </div>
    ),
    size,
  );
}
