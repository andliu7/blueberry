/**
 * Open a Stripe Checkout session for the signed-in person.
 *
 * The browser sends a plan key and gets back a URL to send them to. It never
 * sends a price, an amount or a currency: those live in Stripe and are looked
 * up here from the plan key, so a modified request can only ask to buy one of
 * three things at the price Stripe holds for it.
 *
 * The one Stripe customer per user lives in `billing_customers` and is created
 * on the first checkout. Looking it up costs one query and saves a support
 * question later, when a person with two customer records sees an empty
 * billing portal.
 */

import {
  CORS,
  json,
  planFor,
  priceIdFor,
  semesterPassEnd,
  serviceClient,
  siteUrl,
  stripe,
  userClient,
} from "../_shared/billing.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  if (!Deno.env.get("STRIPE_SECRET_KEY")) {
    return json({ ok: false, error: "Payments are not configured yet." }, 503);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = userClient(authHeader);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    // Named distinctly so the client can offer a sign-in rather than printing
    // a generic failure, the same contract the `chat` function uses.
    return json({ ok: false, error: "not-signed-in" }, 401);
  }

  let planKey = "";
  try {
    const body = await req.json();
    planKey = typeof body?.plan === "string" ? body.plan : "";
  } catch {
    return json({ ok: false, error: "Malformed request." }, 400);
  }

  const plan = planFor(planKey);
  if (!plan) return json({ ok: false, error: "No such plan." }, 400);

  const price = priceIdFor(plan);
  if (!price) return json({ ok: false, error: `${plan.label} is not on sale yet.` }, 503);

  // The pass needs a date to expire on and there is no guessed fallback; see
  // `semesterPassEnd`. Refusing here means nobody pays for a pass whose end
  // the site would have had to invent.
  const passEnd = plan.kind === "pass" ? semesterPassEnd() : null;
  if (plan.kind === "pass" && !passEnd) {
    return json({ ok: false, error: "The semester pass is not on sale right now." }, 503);
  }

  // Service role, because `billing_customers` has no insert policy on purpose:
  // the mapping between a user and a Stripe customer is not the browser's to
  // assert. See the migration's header.
  const admin = serviceClient();

  const { data: existing } = await admin
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = existing?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      // So a Stripe dashboard row can be traced back to a Supabase user
      // without a lookup table, which matters most when something has already
      // gone wrong.
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("billing_customers").insert({
      user_id: user.id,
      stripe_customer_id: customerId,
    });
  }

  const site = siteUrl();

  const session = await stripe.checkout.sessions.create({
    mode: plan.kind === "subscription" ? "subscription" : "payment",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${site}/#/d/billing?checkout=done`,
    cancel_url: `${site}/#/d/billing?checkout=cancelled`,
    // THE METADATA IS THE WEBHOOK'S ONLY INPUT. It arrives on the event Stripe
    // sends back, which is what lets the webhook write the right row without
    // trusting anything the browser said at the time. `pass_until` is stamped
    // here rather than computed on delivery, so a webhook replayed three weeks
    // later grants the same end date it granted the first time.
    metadata: {
      supabase_user_id: user.id,
      plan: plan.key,
      kind: plan.kind,
      pass_until: passEnd ? passEnd.toISOString() : "",
    },
    // Subscriptions carry their own metadata, separate from the session's:
    // renewal and cancellation events reference the subscription and never see
    // the checkout session that started it.
    subscription_data:
      plan.kind === "subscription"
        ? { metadata: { supabase_user_id: user.id, plan: plan.key } }
        : undefined,
    allow_promotion_codes: true,
    client_reference_id: user.id,
  });

  if (!session.url) return json({ ok: false, error: "Stripe returned no checkout URL." }, 502);
  return json({ ok: true, url: session.url });
});
