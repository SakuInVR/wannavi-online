/**
 * Amazon Product Advertising API (PA-API 5.0) クライアント
 *
 * 記事中に登場する商品名から Amazon 商品を検索し、
 * アフィリエイトリンクを自動生成します。
 *
 * 必要な環境変数:
 *   AMAZON_ACCESS_KEY    - PA-API Access Key
 *   AMAZON_SECRET_KEY    - PA-API Secret Key
 *   AMAZON_PARTNER_TAG   - アフィリエイトタグ (例: wannanavi-22)
 *   AMAZON_REGION        - デフォルト: us-west-2
 *   AMAZON_MARKETPLACE   - デフォルト: www.amazon.co.jp
 *
 * API リファレンス:
 *   https://webservices.amazon.com/paapi5/documentation/
 */

const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY;
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY;
const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG ?? "wannanavi-22";
const AMAZON_REGION = process.env.AMAZON_REGION ?? "us-west-2";
const AMAZON_MARKETPLACE = process.env.AMAZON_MARKETPLACE ?? "www.amazon.co.jp";
const AMAZON_HOST = "webservices.amazon.co.jp";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface AmazonProduct {
  asin: string;
  title: string;
  price?: { amount: number; currency: string; display: string };
  imageUrl?: string;
  detailUrl: string;
  affiliateUrl: string;
  brand?: string;
  features?: string[];
}

export interface AmazonSearchResult {
  keyword: string;
  totalResults: number;
  products: AmazonProduct[];
}

/* ------------------------------------------------------------------ */
/* AWS Signature V4 (for PA-API)                                      */
/* ------------------------------------------------------------------ */

// 簡易 SHA-256 (Node.js crypto)
import { createHash, createHmac } from "node:crypto";

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Buffer {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

/* ------------------------------------------------------------------ */
/* PA-API Client                                                      */
/* ------------------------------------------------------------------ */

type SearchItemsParams = {
  keyword: string;
  itemCount?: number;
  resources?: string[];
};

/**
 * Amazon 商品をキーワード検索
 */
export async function searchAmazonProducts(
  params: SearchItemsParams
): Promise<AmazonSearchResult> {
  const { keyword, itemCount = 5, resources } = params;

  if (!AMAZON_ACCESS_KEY || !AMAZON_SECRET_KEY) {
    throw new Error(
      "AMAZON_ACCESS_KEY / AMAZON_SECRET_KEY が設定されていません。.env を確認してください。"
    );
  }

  const defaultResources = [
    "Images.Primary.Medium",
    "ItemInfo.Title",
    "ItemInfo.Features",
    "ItemInfo.ByLineInfo",
    "Offers.Listings.Price",
  ];

  const payload = JSON.stringify({
    Keywords: keyword,
    SearchIndex: "All",
    ItemCount: itemCount,
    Resources: resources ?? defaultResources,
    PartnerTag: AMAZON_PARTNER_TAG,
    PartnerType: "Associates",
    Marketplace: AMAZON_MARKETPLACE,
  });

  const response = await paapiRequest("SearchItems", payload);

  const data = await response.json();

  if (data.Errors && data.Errors.length > 0) {
    throw new Error(
      `PA-API Error: ${data.Errors.map((e: { Code: string; Message: string }) => `${e.Code}: ${e.Message}`).join(", ")}`
    );
  }

  return parseSearchResponse(data, keyword);
}

/**
 * ASIN から商品詳細を取得
 */
export async function getAmazonProduct(asin: string): Promise<AmazonProduct | null> {
  if (!AMAZON_ACCESS_KEY || !AMAZON_SECRET_KEY) {
    throw new Error(
      "AMAZON_ACCESS_KEY / AMAZON_SECRET_KEY が設定されていません。"
    );
  }

  const payload = JSON.stringify({
    ItemIds: [asin],
    Resources: [
      "Images.Primary.Medium",
      "ItemInfo.Title",
      "ItemInfo.Features",
      "ItemInfo.ByLineInfo",
      "Offers.Listings.Price",
    ],
    PartnerTag: AMAZON_PARTNER_TAG,
    PartnerType: "Associates",
    Marketplace: AMAZON_MARKETPLACE,
  });

  const response = await paapiRequest("GetItems", payload);
  const data = await response.json();

  if (data.Errors && data.Errors.length > 0) {
    console.error("PA-API GetItems Error:", data.Errors);
    return null;
  }

  const items = data.ItemsResult?.Items;
  if (!items || items.length === 0) return null;

  return parseItem(items[0]);
}

/**
 * PA-API リクエストを署名付きで送信
 */
async function paapiRequest(
  operation: "SearchItems" | "GetItems",
  payload: string
): Promise<globalThis.Response> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
  const dateStamp = amzDate.slice(0, 8);

  const method = "POST";
  const canonicalUri = "/paapi5/" + operation.toLowerCase().replace("items", "items");
  const canonicalQuerystring = "";
  const service = "ProductAdvertisingAPI";

  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${AMAZON_HOST}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${operation}\n`;

  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";
  const payloadHash = sha256(payload);

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${AMAZON_REGION}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");

  const signingKey = getSignatureKey(
    AMAZON_SECRET_KEY!,
    dateStamp,
    AMAZON_REGION,
    service
  );

  const signature = hmacSha256(signingKey, stringToSign).toString("hex");

  const authorization = `${algorithm} Credential=${AMAZON_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const endpoint = `https://${AMAZON_HOST}${canonicalUri}`;

  return fetch(endpoint, {
    method,
    headers: {
      "Content-Encoding": "amz-1.0",
      "Content-Type": "application/json; charset=utf-8",
      Host: AMAZON_HOST,
      "X-Amz-Date": amzDate,
      "X-Amz-Target": `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${operation}`,
      Authorization: authorization,
    },
    body: payload,
  });
}

/* ------------------------------------------------------------------ */
/* Response parsing                                                    */
/* ------------------------------------------------------------------ */

function parseSearchResponse(
  data: Record<string, unknown>,
  keyword: string
): AmazonSearchResult {
  const searchResult = data.SearchResult as Record<string, unknown> | undefined;
  const items = (searchResult?.Items as unknown[]) ?? [];
  const totalResults = (searchResult?.TotalResultCount as number) ?? 0;

  return {
    keyword,
    totalResults,
    products: items.map((item) => parseItem(item)),
  };
}

function parseItem(item: unknown): AmazonProduct {
  const i = item as Record<string, unknown>;
  const asin = (i.ASIN as string) ?? "";
  const detailUrl = (i.DetailPageURL as string) ?? `https://${AMAZON_MARKETPLACE}/dp/${asin}`;

  // ItemInfo
  const itemInfo = (i.ItemInfo ?? {}) as Record<string, unknown>;
  const title =
    ((itemInfo.Title as Record<string, string>)?.DisplayValue as string) ?? "";

  // Features
  const features =
    ((itemInfo.Features as Record<string, string[]>)?.DisplayValues as string[]) ?? [];

  // Brand
  const byLineInfo = itemInfo.ByLineInfo as Record<string, unknown> | undefined;
  const brandInfo = byLineInfo?.Brand as Record<string, string> | undefined;
  const brand = brandInfo?.DisplayValue ?? "";

  // Price
  const offers = itemInfo.Offers as Record<string, unknown> | undefined;
  const listings = offers?.Listings as unknown[] | undefined;
  const firstListing = listings?.[0] as Record<string, unknown> | undefined;
  const priceInfo = firstListing?.Price as Record<string, unknown> | undefined;
  const price = priceInfo
    ? {
        amount: (priceInfo.Amount as number) ?? 0,
        currency: (priceInfo.Currency as string) ?? "JPY",
        display: (priceInfo.DisplayAmount as string) ?? "",
      }
    : undefined;

  // Image
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageUrl = ((i as any).Images?.Primary?.Medium?.URL as string) ?? "";

  // Affiliate URL
  const affiliateUrl = buildAffiliateUrl(detailUrl, asin);

  return {
    asin,
    title,
    price,
    imageUrl,
    detailUrl,
    affiliateUrl,
    brand: brand || undefined,
    features: features.length > 0 ? features : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Affiliate link generation                                          */
/* ------------------------------------------------------------------ */

/**
 * Amazon アフィリエイトリンクを生成
 */
export function buildAffiliateUrl(detailUrl: string, asin: string): string {
  // detailUrl が空の場合は検索リンクにフォールバック
  if (!detailUrl) {
    return `https://${AMAZON_MARKETPLACE}/dp/${asin}?tag=${AMAZON_PARTNER_TAG}`;
  }

  const url = new URL(detailUrl);
  url.searchParams.set("tag", AMAZON_PARTNER_TAG);
  url.searchParams.set("linkCode", "ll1");
  return url.toString();
}

/**
 * キーワードから Amazon 検索アフィリエイトリンクを生成
 */
export function buildAmazonSearchUrl(keyword: string): string {
  const encoded = encodeURIComponent(keyword);
  return `https://${AMAZON_MARKETPLACE}/s?k=${encoded}&tag=${AMAZON_PARTNER_TAG}&linkCode=ll2`;
}

/* ------------------------------------------------------------------ */
/* Article enrichment (記事本文への自動リンク挿入)                     */
/* ------------------------------------------------------------------ */

/**
 * 商品・機材に関連するセクションの見出しキーワード。
 * これらのキーワードを含む ## 見出しのセクション内でのみ、
 * **太字** → Amazon 検索リンクの変換を行う。
 */
const PRODUCT_SECTION_KEYWORDS = [
  "機材", "道具", "必要なもの", "比較", "おすすめ", "選び方",
  "スペック", "モデル", "購入", "価格", "予算", "ヘッドホン",
  "インターフェース", "マイク", "キーボード", "スピーカー",
  "PC", "パソコン", "デバイス", "機種", "製品", "商品",
  "買う", "選ぶ", "一式", "セット", "備品", "用品",
  "ソフト", "アプリ", "ツール", "環境", "用意",
  "イヤホン", "ケーブル", "スタンド", "モニター",
  "オーディオ", "MIDI", "DAW", "プラグイン", "音源",
  "楽器", "ギター", "ピアノ", "ドラム", "ベース",
  "アバター", "VR", "HMD", "トラッキング", "センサー",
  "カメラ", "録画", "編集", "配信", "キャプチャー",
];

/**
 * 見出しが商品・機材関連セクションかどうかを判定する。
 */
function isProductSectionHeading(heading: string): boolean {
  return PRODUCT_SECTION_KEYWORDS.some((kw) => heading.includes(kw));
}

/**
 * **太字** を Amazon 検索リンクに変換する（単一置換用ヘルパー）。
 * URL やコードブロックはスキップ。
 */
function boldToAmazonLink(_fullMatch: string, productName: string): string {
  const name = productName.trim();
  if (name.includes("http") || name.includes("```")) {
    return `**${name}**`;
  }
  const searchUrl = buildAmazonSearchUrl(name);
  return `[**${name}**](${searchUrl})`;
}

/**
 * 指定されたテキスト片に対して、**太字** → Amazon 検索リンク変換を適用する。
 * （既存リンクの保護→変換→復元 の一連の流れ）
 */
function applyBoldToLinkConversion(text: string): string {
  // 既存のリンクを保護（プレースホルダーに置換）
  const existingLinks: string[] = [];
  let result = text.replace(/\[([^\]]+)\]\([^)]+\)/g, (match) => {
    existingLinks.push(match);
    return `__LINK_${existingLinks.length - 1}__`;
  });

  // **太字** を Amazon 検索リンクに変換（2〜50文字）
  result = result.replace(/\*\*(.{2,50}?)\*\*/g, boldToAmazonLink);

  // 保護した既存リンクを復元
  result = result.replace(/__LINK_(\d+)__/g, (_, i) => existingLinks[parseInt(i)]);

  return result;
}

/**
 * 記事本文から商品名らしきキーワードを抽出して
 * Amazon 検索アフィリエイトリンクを自動挿入する。
 *
 * ## ルール（重要）
 * - **太字** のうち、商品・機材関連セクション（下記キーワードを含む見出し）内のものだけリンク化する
 * - `<ToolRecommendation>` / `<AffiliateCTA>` コンポーネントの前後にある太字もリンク化対象
 * - それ以外のセクション（練習方法、考え方、手順など）の太字はそのまま維持
 *
 * ※ PA-API 呼び出しは行わず、キーワードベースの検索リンクを生成。
 *    API 呼び出しが必要な場合は `enrichArticleWithApi` を使用。
 */
export function enrichArticleWithSearchLinks(body: string): string {
  // 記事を ## 見出しでセクション分割
  // パターン: 行頭の ## で始まる行（見出し）を区切りとする
  const sectionRegex = /^(##\s+.+)$/gm;

  // 見出しの位置をすべて取得
  const headingMatches: { index: number; heading: string; end: number }[] = [];
  for (const m of body.matchAll(sectionRegex)) {
    headingMatches.push({
      index: m.index!,
      heading: m[0],
      end: m.index! + m[0].length,
    });
  }

  // 見出しがない場合は記事全体を非商品セクション扱い（リンク変換しない）
  if (headingMatches.length === 0) {
    // ただし JSX コンポーネント周辺だけは処理
    return convertNearJsxComponents(body);
  }

  // セクションごとに処理
  const parts: string[] = [];
  let cursor = 0;

  for (let i = 0; i < headingMatches.length; i++) {
    const current = headingMatches[i];
    const next = headingMatches[i + 1];

    // 見出し行の前のテキスト（最初の見出しより前のリード文）
    if (cursor < current.index) {
      const beforeText = body.slice(cursor, current.index);
      // リード文は非商品セクション扱い（変換しない）
      // ただし JSX コンポーネント周辺だけは処理
      parts.push(convertNearJsxComponents(beforeText));
    }

    // 見出し行
    const headingLine = body.slice(current.index, current.end);

    // セクション本文（見出し行の後〜次の見出しの前、または末尾まで）
    const sectionStart = current.end;
    const sectionEnd = next ? next.index : body.length;
    let sectionBody = body.slice(sectionStart, sectionEnd);

    // 商品関連セクションかどうか判定
    const headingText = current.heading.replace(/^##\s+/, "").trim();
    if (isProductSectionHeading(headingText)) {
      // 商品セクション：**太字** をリンク化
      sectionBody = applyBoldToLinkConversion(sectionBody);
    } else {
      // 非商品セクション：JSX コンポーネント近傍の太字のみリンク化
      sectionBody = convertNearJsxComponents(sectionBody);
    }

    parts.push(headingLine + sectionBody);
    cursor = sectionEnd;
  }

  // 最後の見出しより後ろの残りテキスト
  if (cursor < body.length) {
    const tail = body.slice(cursor);
    parts.push(convertNearJsxComponents(tail));
  }

  return parts.join("");
}

/**
 * JSX コンポーネント（<ToolRecommendation> / <AffiliateCTA>）の
 * 前後 300 文字以内にある **太字** を Amazon 検索リンクに変換する。
 * （コンポーネント周辺は商品紹介文脈である可能性が高いため）
 */
function convertNearJsxComponents(text: string): string {
  // JSX コンポーネントの位置を検出
  const jsxRegex = /<(?:ToolRecommendation|AffiliateCTA)\s[^>]*\/>/g;
  const jsxPositions: number[] = [];
  for (const m of text.matchAll(jsxRegex)) {
    jsxPositions.push(m.index!);
  }

  if (jsxPositions.length === 0) return text;

  // 変換対象の太字範囲をマーク
  const CONTEXT_RANGE = 300; // コンポーネントの前後 300 文字
  const boldRegex = /\*\*(.{2,50}?)\*\*/g;

  // 各太字が JSX コンポーネントの近傍かチェック
  return text.replace(boldRegex, (match, name, offset) => {
    const isNearJsx = jsxPositions.some(
      (pos) => Math.abs(offset - pos) <= CONTEXT_RANGE
    );
    if (isNearJsx) {
      return boldToAmazonLink(match, name);
    }
    return match;
  });
}

/**
 * 商品名のリストを受け取り、記事本文内の該当箇所を
 * Amazon 検索アフィリエイトリンクに置換する。
 * （DeepSeek 生成後の後処理で使用）
 */
export function injectAffiliateLinks(
  body: string,
  productNames: string[]
): string {
  let result = body;

  for (const name of productNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // 既にリンク化されていない箇所のみ置換
    const regex = new RegExp(
      `(?<!\\[)${escaped}(?!\\]\\()`,
      "g"
    );
    const searchUrl = buildAmazonSearchUrl(name);
    result = result.replace(regex, `[${name}](${searchUrl})`);
  }

  return result;
}

/* ------------------------------------------------------------------ */
/* Batch enrichment (PA-API を使った高精度な商品マッチング)            */
/* ------------------------------------------------------------------ */

export interface EnrichResult {
  body: string;
  products: AmazonProduct[];
  replaced: number;
}

/**
 * 記事本文内の商品名を検出し、PA-API で実商品を検索して
 * アフィリエイトリンクを自動挿入する（高精度版）。
 *
 * ## 商品関連セクションの見出しと **太字** から商品名候補を抽出 → PA-API 検索 →
 * ヒットした商品のアフィリエイトURLをリンクとして挿入。
 *
 * ※ 商品関連セクション以外の太字は候補から除外される。
 */
export async function enrichArticleWithApi(
  body: string,
  options?: { maxProducts?: number }
): Promise<EnrichResult> {
  const maxProducts = options?.maxProducts ?? 5;
  const products: AmazonProduct[] = [];

  // API キーがない場合は検索リンク方式にフォールバック
  if (!AMAZON_ACCESS_KEY || !AMAZON_SECRET_KEY) {
    console.warn("[amazon] PA-API keys not configured, using search links fallback");
    return {
      body: enrichArticleWithSearchLinks(body),
      products: [],
      replaced: 0,
    };
  }

  // 商品名候補を抽出（商品関連セクションのみ）
  const candidates = extractProductCandidates(body);

  // 候補ごとに PA-API 検索（最大 maxProducts 件まで）
  for (const candidate of candidates.slice(0, maxProducts)) {
    try {
      const result = await searchAmazonProducts({ keyword: candidate, itemCount: 1 });
      if (result.products.length > 0) {
        products.push(result.products[0]);
      }
    } catch (err) {
      console.warn(`[amazon] Search failed for "${candidate}":`, err);
    }
  }

  // 記事本文にリンクを挿入（商品関連セクション内のみ）
  // 本文をセクション分割し、商品セクション内でのみ置換を行う
  let enrichedBody = body;
  let replaced = 0;

  for (const product of products) {
    const keywords = product.title.split(/\s+/).filter((w) => w.length >= 2);
    for (const kw of keywords.slice(0, 3)) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(?<!\\[)(${escaped})(?!\\]\\()`, "gi");

      // 商品セクション内のマッチのみ置換
      enrichedBody = replaceInProductSections(enrichedBody, regex, `[$1](${product.affiliateUrl})`);
      if (enrichedBody !== body) {
        replaced++;
        break; // 1商品につき1回だけ置換
      }
    }
  }

  return { body: enrichedBody, products, replaced };
}

/**
 * 商品関連セクション内でのみ正規表現置換を行う。
 * 非商品セクションのテキストはそのまま保持する。
 */
function replaceInProductSections(
  body: string,
  regex: RegExp,
  replacement: string
): string {
  const sectionRegex = /^(##\s+.+)$/gm;
  const headingMatches: { index: number; heading: string; end: number }[] = [];
  for (const m of body.matchAll(sectionRegex)) {
    headingMatches.push({
      index: m.index!,
      heading: m[0],
      end: m.index! + m[0].length,
    });
  }

  if (headingMatches.length === 0) return body;

  const parts: string[] = [];
  let cursor = 0;

  for (let i = 0; i < headingMatches.length; i++) {
    const current = headingMatches[i];
    const next = headingMatches[i + 1];

    if (cursor < current.index) {
      parts.push(body.slice(cursor, current.index));
    }

    const headingLine = body.slice(current.index, current.end);
    const sectionStart = current.end;
    const sectionEnd = next ? next.index : body.length;
    let sectionBody = body.slice(sectionStart, sectionEnd);

    const headingText = current.heading.replace(/^##\s+/, "").trim();
    if (isProductSectionHeading(headingText)) {
      sectionBody = sectionBody.replace(regex, replacement);
    }

    parts.push(headingLine + sectionBody);
    cursor = sectionEnd;
  }

  if (cursor < body.length) {
    parts.push(body.slice(cursor));
  }

  return parts.join("");
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * 記事本文から商品名候補を抽出（商品関連セクションのみ対象）。
 * - ## 見出し（商品関連セクションのみ）
 * - **太字**（商品関連セクション内のみ、2〜50文字）
 * - 箇条書き（商品関連セクション内のみ）
 */
function extractProductCandidates(body: string): string[] {
  const candidates = new Set<string>();

  // 記事を ## 見出しでセクション分割
  const sectionRegex = /^(##\s+.+)$/gm;
  const sections: { heading: string; body: string; isProduct: boolean }[] = [];

  const headingMatches: { index: number; heading: string; end: number }[] = [];
  for (const m of body.matchAll(sectionRegex)) {
    headingMatches.push({
      index: m.index!,
      heading: m[0],
      end: m.index! + m[0].length,
    });
  }

  for (let i = 0; i < headingMatches.length; i++) {
    const current = headingMatches[i];
    const next = headingMatches[i + 1];
    const sectionBody = body.slice(current.end, next ? next.index : body.length);
    const headingText = current.heading.replace(/^##\s+/, "").trim();
    sections.push({
      heading: headingText,
      body: sectionBody,
      isProduct: isProductSectionHeading(headingText),
    });
  }

  for (const section of sections) {
    // ## 見出し（商品セクションのみ）
    if (section.isProduct && section.heading.length >= 3 && section.heading.length <= 60) {
      candidates.add(section.heading);
    }

    if (!section.isProduct) continue;

    // **太字**（商品セクション内のみ）
    for (const m of section.body.matchAll(/\*\*(.{2,50}?)\*\*/g)) {
      const t = m[1].trim();
      if (!t.includes("http") && !t.includes("```") && t.length >= 2) {
        candidates.add(t);
      }
    }

    // 箇条書き（商品セクション内のみ）
    for (const m of section.body.matchAll(/^[-*]\s+(.+)$/gm)) {
      const t = m[1].trim();
      if (t.length >= 3 && t.length <= 60 && !t.includes("http")) {
        candidates.add(t);
      }
    }
  }

  // JSX コンポーネント近傍の太字も候補に追加
  const jsxRegex = /<(?:ToolRecommendation|AffiliateCTA)\s[^>]*\/>/g;
  const CONTEXT_RANGE = 300;
  const jsxPositions: number[] = [];
  for (const m of body.matchAll(jsxRegex)) {
    jsxPositions.push(m.index!);
  }
  for (const m of body.matchAll(/\*\*(.{2,50}?)\*\*/g)) {
    const isNearJsx = jsxPositions.some(
      (pos) => Math.abs(m.index! - pos) <= CONTEXT_RANGE
    );
    if (isNearJsx) {
      const t = m[1].trim();
      if (!t.includes("http") && !t.includes("```") && t.length >= 2) {
        candidates.add(t);
      }
    }
  }

  return Array.from(candidates);
}

/**
 * PA-API が利用可能かどうか
 */
export function isAmazonApiAvailable(): boolean {
  return !!(AMAZON_ACCESS_KEY && AMAZON_SECRET_KEY);
}
