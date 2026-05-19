export type OutboundLink = {
  id: string;
  label: string;
  url: string;
  category: "ai-engineer" | "dtm" | "vr-creator" | "instrument-player" | "general";
};

export const outboundLinks: OutboundLink[] = [
  {
    id: "ai-tools",
    label: "AI開発ツール候補",
    url: "",
    category: "ai-engineer",
  },
  {
    id: "dtm-starter-kit",
    label: "DTM初心者向け機材候補",
    url: "",
    category: "dtm",
  },
  {
    id: "vr-creator-kit",
    label: "VR制作環境候補",
    url: "",
    category: "vr-creator",
  },
  {
    id: "instrument-starter-kit",
    label: "楽器練習スタート候補",
    url: "",
    category: "instrument-player",
  },
];

export function getOutboundLink(id: string) {
  return outboundLinks.find((link) => link.id === id);
}

export function outboundHref(id: string) {
  return `/go/${id}`;
}
