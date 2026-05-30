import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Initialize Stripe conditionally
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiVersion: "2026-04-22.dahlia" as any, // Use Dahlia API version or standard version
}) : null;

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured on the server. Please define STRIPE_SECRET_KEY." },
        { status: 503 }
      );
    }

    // Read dynamic credits/subscription parameters from request body
    const body = await req.json().catch(() => ({}));
    const requestedCredits = body.credits !== undefined ? Number(body.credits) : null;
    const isSubscription = body.plan === "pro";

    // Determine request origin for redirection
    const origin = req.headers.get("origin") || new URL(req.url).origin;

    let sessionOptions: Stripe.Checkout.SessionCreateParams;

    if (isSubscription) {
      // 1. Subscription Mode (Wanna Navi Pro: ¥1,480/month)
      sessionOptions = {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "jpy",
              product_data: {
                name: "Wanna Navi Pro サブスクリプション",
                description: "ロードマップ生成無制限、AIメンター相談し放題、進捗ログ・期限管理使い放題のプレミアム年間/月額プランです。",
              },
              unit_amount: 1480,
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${origin}/dashboard?subscription=success`,
        cancel_url: `${origin}/dashboard?subscription=cancel`,
        metadata: {
          userId: user.id,
          plan: "pro",
        },
      };
    } else {
      // 2. Standard Credits Mode
      const creditsCount = Number(requestedCredits ?? 10);
      let unitAmount = 1000;
      let productName = "Wanna Navi 記事生成クレジット (10回分)";
      let productDesc = "AI（Gemini & DeepSeek）を活用したロードマップ記事を10回アンロックできるクレジットです。";

      if (creditsCount === 1) {
        unitAmount = 100;
        productName = "Wanna Navi 記事生成クレジット (1回分)";
        productDesc = "AI（Gemini & DeepSeek）を活用したロードマップ記事を1回アンロックできるお試しクレジットです。";
      } else if (creditsCount === 10) {
        unitAmount = 1000;
        productName = "Wanna Navi 記事生成クレジット (10回分)";
        productDesc = "AI（Gemini & DeepSeek）を活用したロードマップ記事を10回アンロックできる標準クレジットです。";
      } else if (creditsCount === 30) {
        unitAmount = 2500;
        productName = "Wanna Navi 記事生成クレジット (30回分)";
        productDesc = "AI（Gemini & DeepSeek）を活用したロードマップ記事を30回アンロックできる、500円お得なプロクレジットです。";
      } else {
        return NextResponse.json({ error: "無効なクレジット購入数が指定されました。" }, { status: 400 });
      }

      sessionOptions = {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "jpy",
              product_data: {
                name: productName,
                description: productDesc,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/dashboard?payment=success`,
        cancel_url: `${origin}/dashboard?payment=cancel`,
        metadata: {
          userId: user.id,
          creditsAdded: String(creditsCount),
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionOptions);

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: (err as Error).message || "Internal server error" }, { status: 500 });
  }
}
