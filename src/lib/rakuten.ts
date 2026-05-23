/**
 * 楽天市場商品検索API クライアント (Rakuten Ichiba API v2017-07-06)
 *
 * 必要な環境変数:
 *   RAKUTEN_APP_ID       - 楽天アプリID (https://webservice.rakuten.co.jp/)
 *   RAKUTEN_AFFILIATE_ID - 楽天アフィリエイトID (もしもアフィリエイトの hgc/XXXXXX 部分)
 *
 * API リファレンス:
 *   https://webservice.rakuten.co.jp/api/ichibaitemsearch/
 */

const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID;
const RAKUTEN_AFFILIATE_ID = process.env.RAKUTEN_AFFILIATE_ID;
const RAKUTEN_API_BASE = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface RakutenProduct {
  itemCode: string;
  itemName: string;
  itemPrice: number;
  itemUrl: string;
  mediumImageUrls: string[];
  shopName: string;
  affiliateUrl: string;
}

export interface RakutenSearchResult {
  keyword: string;
  totalResults: number;
  products: RakutenProduct[];
}

/* ------------------------------------------------------------------ */
/* API Client                                                         */
/* ------------------------------------------------------------------ */

export async function searchRakutenProducts(
  keyword: string,
  options?: { maxResults?: number }
): Promise<RakutenSearchResult> {
  if (!RAKUTEN_APP_ID) {
    throw new Error(
      "RAKUTEN_APP_ID が設定されていません。.env を確認してください。"
    );
  }

  const params = new URLSearchParams({
    applicationId: RAKUTEN_APP_ID,
    keyword,
    format: "json",
    hits: String(options?.maxResults ?? 3),
    imageFlag: "1", // 画像あり商品のみ
    sort: "-reviewCount", // レビュー数順（人気順の代替）
  });

  const response = await fetch(`${RAKUTEN_API_BASE}?${params.toString()}`, {
    headers: {
      Referer: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.wannavi.online",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Rakuten API error (${response.status}): ${await response.text()}`
    );
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(
      `Rakuten API error: ${data.error} - ${data.error_description ?? ""}`
    );
  }

  return parseRakutenResponse(data, keyword);
}

/* ------------------------------------------------------------------ */
/* Response parsing                                                    */
/* ------------------------------------------------------------------ */

function parseRakutenResponse(
  data: Record<string, unknown>,
  keyword: string
): RakutenSearchResult {
  const items = (data.Items as unknown[]) ?? [];
  const totalResults =
    (data.count as number) ?? (data.hits as number) ?? items.length;

  return {
    keyword,
    totalResults,
    products: items.map(parseRakutenItem),
  };
}

function parseRakutenItem(item: unknown): RakutenProduct {
  const i = item as Record<string, unknown>;
  const itemData = (i.Item ?? i) as Record<string, unknown>;

  const itemCode = String(itemData.itemCode ?? "");
  const itemName = String(itemData.itemName ?? "");
  const itemPrice = Number(itemData.itemPrice ?? 0);
  const itemUrl = String(itemData.itemUrl ?? "");
  const shopName = String(itemData.shopName ?? "");

  // 画像URL（mediumImageUrls は配列で、最初の要素が中サイズ画像）
  const mediumImageUrls: string[] = [];
  const rawImages = itemData.mediumImageUrls;
  if (Array.isArray(rawImages)) {
    for (const img of rawImages) {
      if (typeof img === "object" && img !== null) {
        const url = (img as Record<string, unknown>).imageUrl;
        if (typeof url === "string") mediumImageUrls.push(url);
      } else if (typeof img === "string") {
        mediumImageUrls.push(img);
      }
    }
  }

  // アフィリエイトリンク生成
  const affiliateUrl = buildRakutenAffiliateUrl(itemUrl, itemCode);

  return {
    itemCode,
    itemName,
    itemPrice,
    itemUrl,
    mediumImageUrls,
    shopName,
    affiliateUrl,
  };
}

/* ------------------------------------------------------------------ */
/* Affiliate link generation                                           */
/* ------------------------------------------------------------------ */

/**
 * 楽天アフィリエイトリンクを生成する。
 *
 * フォーマット:
 *   https://hb.afl.rakuten.co.jp/hgc/{affiliateId}/?pc={urlEncodedItemUrl}
 *
 * アフィリエイトIDが未設定の場合は商品ページの直URLを返す。
 */
export function buildRakutenAffiliateUrl(
  itemUrl: string,
  _itemCode: string
): string {
  if (!RAKUTEN_AFFILIATE_ID) {
    // アフィリエイトID未設定の場合は直URL（収益化されないが動作はする）
    return itemUrl;
  }

  const encodedUrl = encodeURIComponent(itemUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encodedUrl}`;
}

/**
 * キーワードから楽天検索アフィリエイトリンクを生成（フォールバック用）。
 */
export function buildRakutenSearchUrl(keyword: string): string {
  if (!RAKUTEN_AFFILIATE_ID) {
    const encoded = encodeURIComponent(keyword);
    return `https://search.rakuten.co.jp/search/mall/${encoded}/`;
  }

  const encoded = encodeURIComponent(keyword);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encodeURIComponent(`https://search.rakuten.co.jp/search/mall/${encoded}/`)}`;
}

/**
 * 楽天APIが利用可能かどうか。
 */
export function isRakutenApiAvailable(): boolean {
  return !!RAKUTEN_APP_ID;
}
