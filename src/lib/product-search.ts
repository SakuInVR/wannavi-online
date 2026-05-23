/**
 * 統合商品検索: Amazon PA-API + 楽天市場API を並列検索し、
 * 記事生成時の商品エンリッチに使う統合結果を返す。
 */

import {
  searchAmazonProducts,
  buildAmazonSearchUrl,
  isAmazonApiAvailable,
  type AmazonProduct,
} from "@/lib/amazon";

import {
  searchRakutenProducts,
  buildRakutenSearchUrl,
  isRakutenApiAvailable,
  type RakutenProduct,
} from "@/lib/rakuten";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface ShopProduct {
  shop: "amazon" | "rakuten";
  name: string;
  price?: { amount: number; currency: string; display: string };
  imageUrl?: string;
  url: string; // アフィリエイトURL
}

export interface ProductSearchResult {
  keyword: string;
  amazon: ShopProduct[];
  rakuten: ShopProduct[];
}

/**
 * ProductRecommendation コンポーネントに渡す props 型。
 * MDX に埋め込む際の JSON シリアライズ可能な最小形式。
 */
export interface ProductRecommendationData {
  keyword: string;
  amazonProduct: ShopProduct | null;
  rakutenProduct: ShopProduct | null;
}

/* ------------------------------------------------------------------ */
/* Search                                                             */
/* ------------------------------------------------------------------ */

/**
 * キーワードで Amazon + 楽天を並列検索し、統合結果を返す。
 *
 * - Amazon PA-API が設定されていない場合は検索リンクをフォールバックとして返す
 * - 楽天API が設定されていない場合は検索リンクをフォールバックとして返す
 * - 個別のAPIがエラーでも他方の結果は返す
 */
export async function searchAllShops(
  keyword: string
): Promise<ProductSearchResult> {
  const result: ProductSearchResult = {
    keyword,
    amazon: [],
    rakuten: [],
  };

  // 並列実行（Promise.allSettled で片方が失敗しても継続）
  const [amazonSettled, rakutenSettled] = await Promise.allSettled([
    searchAmazonWithFallback(keyword),
    searchRakutenWithFallback(keyword),
  ]);

  if (amazonSettled.status === "fulfilled") {
    result.amazon = amazonSettled.value;
  } else {
    console.warn("[product-search] Amazon search failed:", amazonSettled.reason);
    // フォールバック: 検索リンクのみ
    const searchUrl = buildAmazonSearchUrl(keyword);
    result.amazon = [
      {
        shop: "amazon",
        name: keyword,
        url: searchUrl,
      },
    ];
  }

  if (rakutenSettled.status === "fulfilled") {
    result.rakuten = rakutenSettled.value;
  } else {
    console.warn("[product-search] Rakuten search failed:", rakutenSettled.reason);
    // フォールバック: 検索リンクのみ
    const searchUrl = buildRakutenSearchUrl(keyword);
    result.rakuten = [
      {
        shop: "rakuten",
        name: keyword,
        url: searchUrl,
      },
    ];
  }

  return result;
}

async function searchAmazonWithFallback(
  keyword: string
): Promise<ShopProduct[]> {
  if (!isAmazonApiAvailable()) {
    const url = buildAmazonSearchUrl(keyword);
    return [{ shop: "amazon" as const, name: keyword, url }];
  }

  const res = await searchAmazonProducts({ keyword, itemCount: 1 });
  return res.products.map(toShopProduct);
}

async function searchRakutenWithFallback(
  keyword: string
): Promise<ShopProduct[]> {
  if (!isRakutenApiAvailable()) {
    const url = buildRakutenSearchUrl(keyword);
    return [{ shop: "rakuten" as const, name: keyword, url }];
  }

  const res = await searchRakutenProducts(keyword, { maxResults: 1 });
  return res.products.map(toShopProduct);
}

function toShopProduct(p: AmazonProduct | RakutenProduct): ShopProduct {
  // AmazonProduct
  if ("asin" in p) {
    const ap = p as AmazonProduct;
    return {
      shop: "amazon",
      name: ap.title.length > 60 ? ap.title.slice(0, 57) + "..." : ap.title,
      price: ap.price,
      imageUrl: ap.imageUrl,
      url: ap.affiliateUrl,
    };
  }

  // RakutenProduct
  const rp = p as RakutenProduct;
  return {
    shop: "rakuten",
    name: rp.itemName.length > 60 ? rp.itemName.slice(0, 57) + "..." : rp.itemName,
    price: {
      amount: rp.itemPrice,
      currency: "JPY",
      display: `¥${rp.itemPrice.toLocaleString()}`,
    },
    imageUrl: rp.mediumImageUrls[0] ?? undefined,
    url: rp.affiliateUrl,
  };
}

/**
 * ProductRecommendationData 形式に変換（MDX埋め込み用の最小形式）。
 */
export function toProductRecommendationData(
  keyword: string,
  searchResult: ProductSearchResult
): ProductRecommendationData {
  return {
    keyword,
    amazonProduct: searchResult.amazon[0] ?? null,
    rakutenProduct: searchResult.rakuten[0] ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Article enrichment: ToolRecommendation → ProductRecommendation      */
/* ------------------------------------------------------------------ */

/**
 * 記事本文（MDX）内の `<ToolRecommendation>` タグを検出し、
 * 各商品名に対して Amazon + 楽天 の商品検索を実行、
 * `<ProductRecommendation>` タグに置き換える。
 *
 * `<ToolRecommendation>` の形式:
 *   <ToolRecommendation name="商品名" reason="理由" priceHint="価格帯" href="URL" />
 *
 * 変換後:
 *   <ProductRecommendation name="商品名" reason="理由" priceHint="価格帯"
 *     amazonProduct={{ shop:"amazon", name:"...", price:{...}, imageUrl:"...", url:"..." }}
 *     rakutenProduct={{ shop:"rakuten", name:"...", price:{...}, imageUrl:"...", url:"..." }} />
 *
 * maxProducts: 検索する商品の最大数（API呼び出し制限のため）。
 *              Amazon PA-API は1リクエスト/商品。デフォルト 3。
 */
export async function enrichArticleWithProductSearch(
  body: string,
  options?: { maxProducts?: number }
): Promise<{ body: string; enriched: number }> {
  const maxProducts = options?.maxProducts ?? 3;
  let enriched = 0;

  // ToolRecommendation タグをすべて検出
  const toolRegex = /<ToolRecommendation\s+([^>]*?)\/>/g;
  const replacements: Array<{
    original: string;
    name: string;
    reason: string;
    priceHint: string;
  }> = [];

  for (const match of body.matchAll(toolRegex)) {
    const attrs = match[1];
    const nameMatch = attrs.match(/name="([^"]*)"/);
    const reasonMatch = attrs.match(/reason="([^"]*)"/);
    const priceHintMatch = attrs.match(/priceHint="([^"]*)"/);

    if (nameMatch && reasonMatch) {
      replacements.push({
        original: match[0],
        name: nameMatch[1],
        reason: reasonMatch[1],
        priceHint: priceHintMatch?.[1] ?? "まずは無料または低予算から",
      });
    }
  }

  if (replacements.length === 0) {
    return { body, enriched: 0 };
  }

  // 重複する商品名は1回だけ検索
  const uniqueNames = [...new Set(replacements.map((r) => r.name))];

  // 検索実行（最大 maxProducts 件）
  const searchCache = new Map<string, ProductRecommendationData>();
  for (const name of uniqueNames.slice(0, maxProducts)) {
    try {
      const result = await searchAllShops(name);
      searchCache.set(name, toProductRecommendationData(name, result));
    } catch (err) {
      console.warn(`[product-search] Enrich failed for "${name}":`, err);
      // フォールバック: 検索リンクのみ
      const { buildAmazonSearchUrl } = await import("@/lib/amazon");
      const { buildRakutenSearchUrl } = await import("@/lib/rakuten");
      searchCache.set(name, {
        keyword: name,
        amazonProduct: {
          shop: "amazon",
          name,
          url: buildAmazonSearchUrl(name),
        },
        rakutenProduct: {
          shop: "rakuten",
          name,
          url: buildRakutenSearchUrl(name),
        },
      });
    }
  }

  // 検索しなかった商品名は検索リンクでフォールバック
  for (const name of uniqueNames.slice(maxProducts)) {
    const { buildAmazonSearchUrl } = await import("@/lib/amazon");
    const { buildRakutenSearchUrl } = await import("@/lib/rakuten");
    searchCache.set(name, {
      keyword: name,
      amazonProduct: {
        shop: "amazon",
        name,
        url: buildAmazonSearchUrl(name),
      },
      rakutenProduct: {
        shop: "rakuten",
        name,
        url: buildRakutenSearchUrl(name),
      },
    });
  }

  // MDX 本文の置換
  let result = body;
  for (const rep of replacements) {
    const data = searchCache.get(rep.name);
    if (!data) continue;

    const amazonJson = JSON.stringify(data.amazonProduct);
    const rakutenJson = JSON.stringify(data.rakutenProduct);

    const replacement = [
      "<ProductRecommendation",
      `  name="${rep.name.replace(/"/g, "\\\"")}"`,
      `  reason="${rep.reason.replace(/"/g, "\\\"")}"`,
      `  priceHint="${rep.priceHint.replace(/"/g, "\\\"")}"`,
      `  amazonProduct={${amazonJson}}`,
      `  rakutenProduct={${rakutenJson}}`,
      "/>",
    ].join("\n");

    result = result.replace(rep.original, replacement);
    enriched++;
  }

  return { body: result, enriched };
}
