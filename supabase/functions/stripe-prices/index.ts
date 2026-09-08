/**
 * What the plans actually cost, read from Stripe.
 *
 * The pricing cards need a number on them, and there are two places that
 * number could live: in the component, or in Stripe. Typing "$6" into the
 * component makes a second source of truth for the one fact on this site where
 * being out of date is a false statement about money. So the cards ask.
 *
 * **Public on purpose: `verify_jwt = false` in config.toml.** A price list is
 * what a stranger deciding whether to sign up needs to see, and requiring an
 * account to find out the price is the pattern this funnel exists to avoid.
 * Nothing here is secret: it returns only what a Stripe payment page would
 * show anybody who clicked through.
 *
 * A plan with no configured price id is simply absent from the answer, which
 * is how the cards know to draw "not on sale yet" rather than a number that is
 * not real. Today all three are absent, and that is the correct output.
 */

import { CORS, PLANS, json, priceIdFor, semesterPassEnd, stripe } from "../_shared/billing.ts";

/** One minute at the edge. Prices change roughly never; this is not a feed. */
const CACHE = "public, max-age=60";

interface PriceRow {
  plan: string;
  label: string;
  kind: "subscription" | "pass";
  /** In the currency's smallest unit, as Stripe reports it. 600 is $6.00. */
  amount: number;
  currency: string;
  /** 'month' or 'year' for a subscription, null for the pass. */
  interval: string | null;
  /** The pass's end date, so a card can say what "a semester" means. */
  endsOn: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  if (!Deno.env.get("STRIPE_SECRET_KEY")) return json({ ok: true, prices: [] });

  const passEnd = semesterPassEnd();
  const rows: PriceRow[] = [];

  for (const plan of PLANS) {
    const id = priceIdFor(plan);
    if (!id) continue;
    // The pass is not offered without an end date, for the reason in
    // `semesterPassEnd`. Not listing it keeps the card and the checkout
    // agreeing about what is for sale.
    if (plan.kind === "pass" && !passEnd) continue;

    try {
      const price = await stripe.prices.retrieve(id);
      if (price.unit_amount === null) continue;
      rows.push({
        plan: plan.key,
        label: plan.label,
        kind: plan.kind,
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval ?? null,
        endsOn: plan.kind === "pass" && passEnd ? passEnd.toISOString().slice(0, 10) : null,
      });
    } catch (err) {
      // A price id that has been archived or mistyped should take that one
      // card off sale, not the whole panel down.
      console.error("price lookup failed", plan.key, err instanceof Error ? err.message : err);
    }
  }

  return new Response(JSON.stringify({ ok: true, prices: rows }), {
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": CACHE },
  });
});
