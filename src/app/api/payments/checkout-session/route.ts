import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Initialize Stripe conditionally
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiVersion: "2025-02-11.acacia" as any, // Use Acacia API version or standard version
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

    // Determine request origin for redirection
    const origin = req.headers.get("origin") || new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: "Wanna Navi 記事生成クレジット (10回分)",
              description: "AI（Gemini & DeepSeek）を活用したアフィリエイト記事を10回生成できるクレジットです。",
            },
            unit_amount: 1000,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/dashboard?payment=cancel`,
      metadata: {
        userId: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: (err as Error).message || "Internal server error" }, { status: 500 });
  }
}
