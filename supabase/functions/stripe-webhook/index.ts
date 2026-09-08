/**
 * Stripe tells the site what was actually paid for.
 *
 * This is the only writer of `entitlements`, and it is the only place in the
 * product where "you are paid up" is decided. A browser can say anything; a
 * request carrying a valid `stripe-signature` over the raw body can only have
 * come from Stripe.
 *
 * **`verify_jwt = false` in config.toml, and that is not a hole.** Stripe has
 * no Supabase session and cannot send a bearer token, so leaving Supabase's
 * JWT check on would reject every delivery. The signature check below is the
 * authentication, and it is strictly stronger: it covers the body as well as
 * the caller.
 *
 * **`constructEventAsync`, not `constructEvent`.** The synchronous one uses
 * Node's crypto for the HMAC and there is no Node crypto here. The async one
 * uses Web Crypto, which is what Deno has. Getting this wrong throws on every
 * delivery with an error about the platform rather than about the signature,
 * which is a confusing hour.
 *
 * **The raw body, not the parsed one.** The signature is over the bytes Stripe
 * sent. `await req.text()` before anything else, and never `req.json()`.
 *
 * Deliveries are at-least-once and can be replayed by hand from the dashboard,
 * so every write here is an upsert on a Stripe id and a duplicate changes
 * nothing.
 */

import { CORS, json, serviceClient, stripe } from "../_shared/billing.ts";
import type Stripe from "npm:stripe@22.6.1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) return json({ ok: false, error: "Webhook is not configured." }, 503);

  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ ok: false, error: "Unsigned." }, 400);

  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, signature, secret);
  } catch (err) {
    // 400 on purpose. Stripe treats it as a failed delivery and retries, which
    // is right for a transient problem and harmless for a forged request.
    console.error("bad signature", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "Bad signature." }, 400);
  }

  const admin = serviceClient();

  switch (event.type) {
    /**
     * The one-off semester pass. Subscriptions also fire this event, and they
     * are ignored here: their whole lifecycle arrives on the subscription
     * events below, including the first period, so handling both here would
     * write the same grant twice from two different shapes.
     */
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "payment") break;
      if (session.payment_status !== "paid") break;

      const userId = session.metadata?.supabase_user_id;
      const plan = session.metadata?.plan;
      const until = session.metadata?.pass_until;
      if (!userId || !plan || !until) {
        console.error("pass session missing metadata", session.id);
        break;
      }

      const { error } = await admin.from("entitlements").upsert(
        {
          user_id: userId,
          kind: "pass",
          plan,
          status: "complete",
          access_until: until,
          stripe_checkout_session_id: session.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_checkout_session_id" },
      );
      if (error) throw error;
      break;
    }

    /**
     * Every state a subscription can reach, on one path.
     *
     * `deleted` is handled by the same code rather than by a delete: the row
     * stays with whatever status and period end Stripe last reported, so a
     * cancelled subscription still grants access until the period the person
     * paid for actually ends. Deleting the row would revoke it the moment they
     * pressed cancel, which is not what they bought.
     */
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;

      const userId = sub.metadata?.supabase_user_id ?? (await userIdForCustomer(admin, sub));
      if (!userId) {
        console.error("subscription with no user", sub.id);
        break;
      }

      // The period end moved to the item in recent API versions; the top-level
      // field is still sent by older ones. Read both rather than assume, since
      // a wrong value here is access ending early.
      const periodEnd =
        sub.items?.data?.[0]?.current_period_end ??
        (sub as unknown as { current_period_end?: number }).current_period_end ??
        null;

      const { error } = await admin.from("entitlements").upsert(
        {
          user_id: userId,
          kind: "subscription",
          plan: sub.metadata?.plan ?? "pro_monthly",
          // Stripe's own status word, stored verbatim. Which words mean "may
          // use it" is decided once, in `isPro` in src/lib/billing.ts;
          // translating here would lose the difference between "past due" and
          // "unpaid" before anything could act on it.
          status: sub.status,
          access_until: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          stripe_subscription_id: sub.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" },
      );
      if (error) throw error;
      break;
    }

    default:
      // Every other event type is acknowledged and dropped. Returning 200 for
      // events we do not handle is what stops Stripe retrying them forever.
      break;
  }

  return json({ ok: true });
});

/**
 * The fallback when a subscription arrives with no metadata on it: find the
 * user through the Stripe customer id we recorded at checkout.
 *
 * It should never be needed for a subscription this site created, because
 * `subscription_data.metadata` is set there. It exists for the one that was
 * made by hand in the Stripe dashboard, which is how a comped account happens.
 */
async function userIdForCustomer(
  admin: ReturnType<typeof serviceClient>,
  sub: Stripe.Subscription,
): Promise<string | null> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return null;
  const { data } = await admin
    .from("billing_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}
