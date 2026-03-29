import Stripe from "stripe";
import { headers } from "next/headers";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

function getPriceIds() {
  return {
    supporter:   process.env.STRIPE_PRICE_SUPPORTER,
    contributor: process.env.STRIPE_PRICE_CONTRIBUTOR,
    patron:      process.env.STRIPE_PRICE_PATRON,
  } as Record<string, string | undefined>;
}

function getOneTimePriceIds() {
  return {
    10:  process.env.STRIPE_PRICE_ONETIME_10,
    25:  process.env.STRIPE_PRICE_ONETIME_25,
    50:  process.env.STRIPE_PRICE_ONETIME_50,
    100: process.env.STRIPE_PRICE_ONETIME_100,
  } as Record<number, string | undefined>;
}

export async function POST(req: Request) {
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "https://gadaalabs.com";

  const { tier, amount, mode } = await req.json() as {
    tier?: string;
    amount?: number;
    mode: "subscription" | "payment";
  };

  try {
    const stripe = getStripe();
    const PRICE_IDS = getPriceIds();
    const ONE_TIME_PRICE_IDS = getOneTimePriceIds();
    let priceId: string | undefined;

    if (mode === "subscription" && tier) {
      priceId = PRICE_IDS[tier];
      if (!priceId) {
        return Response.json({ error: `Price not configured for tier: ${tier}` }, { status: 400 });
      }
    } else if (mode === "payment" && amount) {
      priceId = ONE_TIME_PRICE_IDS[amount];
      if (!priceId) {
        return Response.json({ error: `Price not configured for amount: $${amount}` }, { status: 400 });
      }
    } else {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/donate`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      metadata: { tier: tier ?? "onetime", amount: String(amount ?? 0) },
    });

    return Response.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return Response.json({ error: message }, { status: 500 });
  }
}
