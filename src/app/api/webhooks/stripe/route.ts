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
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("Webhook error: Supabase admin client not initialized");
    return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const stripeSessionId = session.id;

      if (!userId) {
        console.error(`Webhook error: userId not found in session metadata for session ${stripeSessionId}`);
        return NextResponse.json({ error: "User ID missing in metadata" }, { status: 400 });
      }

      if (session.mode === "subscription") {
        // 1. Handle Subscription Checkout Completion
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (!stripe) {
          throw new Error("Stripe instance not configured");
        }
        
        // Retrieve full subscription details from Stripe
        const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as any;
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (profileUpdateError) {
          console.error(`Failed to update subscription profile for user ${userId}:`, profileUpdateError);
          return NextResponse.json({ error: "Failed to sync subscription status" }, { status: 500 });
        }

        console.log(`Successfully activated 'Wanna Navi Pro' subscription for user ${userId}`);
      } else {
        // 2. Handle One-time Credit Purchase Completion
        const amountTotal = session.amount_total ?? 1000;
        const creditsAdded = Number(session.metadata?.creditsAdded ?? "10");

        // Log purchase in purchases table
        const { error: purchaseError } = await supabase.from("purchases").insert({
          user_id: userId,
          stripe_session_id: stripeSessionId,
          amount_total: amountTotal,
          credits_added: creditsAdded,
          status: "completed",
        });

        if (purchaseError) {
          console.error("Failed to insert purchase record:", purchaseError);
        }

        // Fetch current credits and increment
        const { data: profile, error: profileFetchError } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", userId)
          .single();

        if (profileFetchError || !profile) {
          console.error("Failed to fetch user profile for crediting:", profileFetchError);
          return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        const newCredits = (profile.credits ?? 0) + creditsAdded;

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ credits: newCredits, updated_at: new Date().toISOString() })
          .eq("id", userId);

        if (updateError) {
          console.error(`Failed to update credits for user ${userId}:`, updateError);
          return NextResponse.json({ error: "Failed to update credits" }, { status: 500 });
        }

        console.log(`Successfully added ${creditsAdded} credits to user ${userId}`);
      }
    } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      // 3. Handle Subscription Updates (Renewals, Cancellations)
      const subscription = event.data.object as any;
      const subscriptionId = subscription.id;
      const stripeStatus = subscription.status; // active, past_due, canceled, unpaid, etc.
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

      // Find user associated with this subscription
      const { data: profile, error: profileFindError } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle();

      if (profileFindError) throw profileFindError;

      if (profile) {
        const subStatus = stripeStatus === "active" ? "active" : stripeStatus;
        const { error: syncError } = await supabase
          .from("profiles")
          .update({
            subscription_status: subStatus,
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);

        if (syncError) {
          console.error(`Failed to sync subscription state for user ${profile.id}:`, syncError);
          return NextResponse.json({ error: "Sync failed" }, { status: 500 });
        }

        console.log(`Synced subscription status '${subStatus}' for user ${profile.id}`);
      } else {
        console.warn(`Stripe sub webhook: No profile found matching subscription ${subscriptionId}`);
      }
    }
  } catch (err: any) {
    console.error("Stripe Webhook DB operation failed:", err);
    return NextResponse.json({ error: err.message || "Internal database/Stripe error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
