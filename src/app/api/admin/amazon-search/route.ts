import { NextRequest, NextResponse } from "next/server";
import {
  searchAmazonProducts,
  isAmazonApiAvailable,
  buildAmazonSearchUrl,
  type AmazonProduct,
} from "@/lib/amazon";

/**
 * GET /api/admin/amazon-search?q=キーワード&n=5
 *
 * Amazon 商品検索 API。
 * PA-API キーが未設定の場合は検索リンクのみ返します。
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  const n = parseInt(request.nextUrl.searchParams.get("n") ?? "5", 10);

  if (!q || !q.trim()) {
    return NextResponse.json(
      { error: "q（検索キーワード）は必須です" },
      { status: 400 }
    );
  }

  // PA-API 未設定時は検索リンクのみ返す
  if (!isAmazonApiAvailable()) {
    return NextResponse.json({
      keyword: q.trim(),
      note: "PA-API キーが未設定です。Amazon 検索リンクを返します。",
      searchUrl: buildAmazonSearchUrl(q.trim()),
      products: [],
    });
  }

  try {
    const result = await searchAmazonProducts({
      keyword: q.trim(),
      itemCount: Math.min(n, 10),
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[amazon-search] Error:", message);

    // API エラー時も検索リンクをフォールバックとして返す
    return NextResponse.json({
      keyword: q.trim(),
      error: message,
      searchUrl: buildAmazonSearchUrl(q.trim()),
      products: [],
    });
  }
}

/**
 * POST /api/admin/amazon-search
 *
 * 複数キーワードの一括検索。
 * Body: { keywords: string[], maxPerKeyword?: number }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const keywords: string[] = body.keywords ?? [];
  const maxPerKeyword = body.maxPerKeyword ?? 3;

  if (!keywords.length) {
    return NextResponse.json(
      { error: "keywords は必須です（string[]）" },
      { status: 400 }
    );
  }

  if (!isAmazonApiAvailable()) {
    return NextResponse.json({
      results: keywords.map((kw) => ({
        keyword: kw,
        searchUrl: buildAmazonSearchUrl(kw),
        products: [],
      })),
      note: "PA-API キーが未設定です。検索リンクのみ返します。",
    });
  }

  const results: Array<{
    keyword: string;
    products: AmazonProduct[];
    searchUrl: string;
    error?: string;
  }> = [];

  for (const kw of keywords) {
    try {
      const result = await searchAmazonProducts({
        keyword: kw,
        itemCount: maxPerKeyword,
      });
      results.push({
        keyword: kw,
        products: result.products,
        searchUrl: buildAmazonSearchUrl(kw),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({
        keyword: kw,
        products: [],
        searchUrl: buildAmazonSearchUrl(kw),
        error: message,
      });
    }
  }

  return NextResponse.json({ results });
}
