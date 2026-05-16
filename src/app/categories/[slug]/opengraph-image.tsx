import { ImageResponse } from "next/og";

import { getCategory, siteConfig } from "@/lib/site";

export const alt = "Wanna Navi category";
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
  const category = getCategory(slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#082f49",
          color: "white",
          padding: 72,
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 900, color: "#bae6fd" }}>
          {siteConfig.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.1 }}>
            {category?.title ?? "なりたい自分へのロードマップ"}
          </div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#e0f2fe", lineHeight: 1.4 }}>
            {category?.description ?? siteConfig.description}
          </div>
        </div>
        <div style={{ fontSize: 24, color: "#bae6fd" }}>{siteConfig.domain}</div>
      </div>
    ),
    size,
  );
}
