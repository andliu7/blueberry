/**
 * The billing portal: Stripe's own page for changing a card, seeing invoices
 * and cancelling.
 *
 * Building any of that here would mean holding card details, writing a
 * cancellation flow and keeping both correct against a payments API. Stripe
 * hosts it, this hands the person a link to their own, and the site never sees
 * a card number.
 *
 * Someone with no Stripe customer has never opened checkout, so there is
 * nothing to show them and this says so rather than creating an empty
 * customer to have something to link to.
 */

import { CORS, json, serviceClient, siteUrl, stripe, userClient } from "../_shared/billing.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  if (!Deno.env.get("STRIPE_SECRET_KEY")) {
    return json({ ok: false, error: "Payments are not configured yet." }, 503);
  }

  const supabase = userClient(req.headers.get("Authorization") ?? "");
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ ok: false, error: "not-signed-in" }, 401);

  const { data } = await serviceClient()
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data?.stripe_customer_id) {
    return json({ ok: false, error: "There is nothing to manage yet." }, 404);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${siteUrl()}/#/d/billing`,
  });

  return json({ ok: true, url: session.url });
});
