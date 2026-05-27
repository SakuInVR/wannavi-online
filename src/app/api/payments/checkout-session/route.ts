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

    // Read dynamic credits parameter from request body
    const body = await req.json().catch(() => ({}));
    const requestedCredits = Number(body.credits ?? 10);

    let unitAmount = 1000;
    let productName = "Wanna Navi 記事生成クレジット (10回分)";
    let productDesc = "AI（Gemini & DeepSeek）を活用したロードマップ記事を10回アンロックできるクレジットです。";

    if (requestedCredits === 1) {
      unitAmount = 100;
      productName = "Wanna Navi 記事生成クレジット (1回分)";
      productDesc = "AI（Gemini & DeepSeek）を活用したロードマップ記事を1回アンロックできるお試しクレジットです。";
    } else if (requestedCredits === 10) {
      unitAmount = 1000;
      productName = "Wanna Navi 記事生成クレジット (10回分)";
      productDesc = "AI（Gemini & DeepSeek）を活用したロードマップ記事を10回アンロックできる標準クレジットです。";
    } else if (requestedCredits === 30) {
      unitAmount = 2500;
      productName = "Wanna Navi 記事生成クレジット (30回分)";
      productDesc = "AI（Gemini & DeepSeek）を活用したロードマップ記事を30回アンロックできる、500円お得なプロクレジットです。";
    } else {
      return NextResponse.json({ error: "無効なクレジット購入数が指定されました。" }, { status: 400 });
    }

    // Determine request origin for redirection
    const origin = req.headers.get("origin") || new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
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
        creditsAdded: String(requestedCredits),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: (err as Error).message || "Internal server error" }, { status: 500 });
  }
}
