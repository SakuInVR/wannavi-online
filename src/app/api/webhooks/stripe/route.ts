import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiVersion: "2026-04-22.dahlia" as any,
}) : null;

export async function POST(req: NextRequest) {
  if (!stripe || !webhookSecret) {
    console.error("Webhook processing failed: Stripe environment keys are missing");
    return NextResponse.json({ error: "Webhook keys not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    console.error(`Webhook signature verification failed: ${(err as Error).message}`);
    return NextResponse.json({ error: `Webhook Error: ${(err as Error).message}` }, { status: 400 });
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const amountTotal = session.amount_total ?? 1000;
    const stripeSessionId = session.id;

    if (!userId) {
      console.error(`Webhook error: userId not found in session metadata for session ${stripeSessionId}`);
      return NextResponse.json({ error: "User ID missing in metadata" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error("Webhook error: Supabase admin client not initialized");
      return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    try {
      // 1. Log the purchase in public.purchases
      const { error: purchaseError } = await supabase.from("purchases").insert({
        user_id: userId,
        stripe_session_id: stripeSessionId,
        amount_total: amountTotal,
        credits_added: 10,
        status: "completed",
      });

      if (purchaseError) {
        console.error("Failed to insert purchase record:", purchaseError);
        // Continue anyway to try and credit the user if it's a db issue
      }

      // 2. Read the user's current credits and increment by 10
      const { data: profile, error: profileFetchError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .single();

      if (profileFetchError || !profile) {
        console.error("Failed to fetch user profile for crediting:", profileFetchError);
        return NextResponse.json({ error: "User profile not found" }, { status: 404 });
      }

      const newCredits = (profile.credits ?? 0) + 10;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ credits: newCredits, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (updateError) {
        console.error(`Failed to update credits for user ${userId}:`, updateError);
        return NextResponse.json({ error: "Failed to update credits" }, { status: 500 });
      }

      console.log(`Successfully added 10 credits to user ${userId} (Stripe session: ${stripeSessionId})`);
    } catch (dbErr: unknown) {
      console.error("Database error during Stripe webhook handling:", dbErr);
      return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
