import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

export const alt = "Wanna Navi";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#020617",
          color: "white",
          padding: 72,
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 800, color: "#7dd3fc" }}>
          {siteConfig.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 84, fontWeight: 900, lineHeight: 1.05 }}>
            <div>あなたは、</div>
            <div>何になりたい？</div>
          </div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#cbd5e1" }}>
            なりたい自分へのロードマップ
          </div>
        </div>
        <div style={{ fontSize: 24, color: "#94a3b8" }}>{siteConfig.domain}</div>
      </div>
    ),
    size,
  );
}
