import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

/**
 * The browser's half of billing: ask for a checkout link, read back what
 * Stripe said.
 *
 * **Nothing here decides anything.** `isPro` reads rows the webhook wrote with
 * the service role and that Row Level Security only ever lets you see your
 * own; it is a convenience for drawing the right button, not a gate. Anything
 * that actually costs money to run has to check on the server, because a
 * client-side check is a check the client can skip. The one line worth
 * remembering: this file answers "what should I draw", never "may they".
 */

export type PlanKey = "pro_monthly" | "pro_yearly" | "semester_pass";

/* What a plan costs, read from Stripe through the price list function */

export interface PlanPrice {
  plan: PlanKey;
  label: string;
  kind: "subscription" | "pass";
  /** Smallest currency unit, as Stripe reports it: 600 is $6.00. */
  amount: number;
  currency: string;
  /** 'month' or 'year' for a subscription, null for the pass. */
  interval: string | null;
  /** ISO date the pass runs to, so a card can say what "a semester" means. */
  endsOn: string | null;
}

/**
 * The live prices, or an empty list.
 *
 * Empty is the correct answer today and it is not an error: no Stripe products
 * exist yet, so the plan cards draw "not on sale yet" rather than a number
 * somebody typed. That is also what happens if the function is unreachable,
 * which is the right failure: a price that cannot be confirmed should not be
 * shown, because the only thing worse than no price is a wrong one.
 */
export function usePlanPrices(): { prices: PlanPrice[]; loading: boolean } {
  const [prices, setPrices] = useState<PlanPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let live = true;
    supabase.functions
      .invoke("stripe-prices", { method: "GET" })
      .then(({ data }) => {
        if (!live) return;
        setPrices(Array.isArray(data?.prices) ? (data.prices as PlanPrice[]) : []);
      })
      .catch(() => {})
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, []);

  return { prices, loading };
}

/** "$6.00" from Stripe's 600 and "usd". Intl does the currency's own rules. */
export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    // Whole-dollar prices read better without the cents, and anything else
    // needs them. Stripe's minor unit is always hundredths for the currencies
    // this site could plausibly charge in.
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);
}

/* What this person has bought */

export interface Entitlement {
  kind: "subscription" | "pass";
  plan: string;
  /** Stripe's own word, stored verbatim by the webhook. */
  status: string;
  access_until: string | null;
}

/**
 * Which Stripe statuses mean the person may use what they bought.
 *
 * `past_due` is in, and that is a deliberate call. A card that failed at 3am is
 * a payment problem, not a decision to leave: Stripe retries for days, and the
 * most common cause by far is an expired card on a renewal. Cutting access on
 * the first failed retry punishes that case. When the retries are genuinely
 * exhausted Stripe moves the subscription to `unpaid` or `canceled`, and
 * neither of those is in this set.
 */
const USABLE = new Set(["active", "trialing", "past_due", "complete"]);

/** Whether an entitlement is good right now. One rule, one place. */
export const isLive = (e: Entitlement): boolean =>
  USABLE.has(e.status) && (e.access_until === null || new Date(e.access_until) > new Date());

/**
 * Every entitlement this person holds, and whether any of them is live.
 *
 * Returns `pro: false` while loading and while signed out, so a card cannot
 * flash "you have Pro" at somebody who does not. Being wrong in the direction
 * of showing the upgrade is recoverable; the other direction is not.
 */
export function useEntitlements(): {
  entitlements: Entitlement[];
  pro: boolean;
  loading: boolean;
} {
  const { user } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !user) {
      setEntitlements([]);
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    supabase
      .from("entitlements")
      .select("kind, plan, status, access_until")
      .then(({ data }) => {
        if (!live) return;
        setEntitlements((data as Entitlement[]) ?? []);
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [user]);

  return { entitlements, loading, pro: entitlements.some(isLive) };
}

/* Buying */

export interface CheckoutResult {
  ok: boolean;
  /** Where to send the browser. Present only when `ok`. */
  url?: string;
  /** `not-signed-in` is named so the caller can offer a sign-in. */
  error?: string;
}

/**
 * Open Stripe Checkout for a plan.
 *
 * The plan KEY goes over the wire, never a price or an amount: the server
 * looks the price up from the key, so a modified request can only ask to buy
 * one of three things at the price Stripe holds for it.
 *
 * The caller navigates. Doing `window.location = url` in here would make a
 * function that returns a value also leave the page, which is a surprise for
 * whoever calls it next.
 */
export async function startCheckout(plan: PlanKey): Promise<CheckoutResult> {
  if (!supabase) return { ok: false, error: "Payments are not configured yet." };

  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: { plan },
  });

  if (error) return { ok: false, error: await readError(error) };
  return data as CheckoutResult;
}

/** A link to Stripe's own billing portal, for changing a card or cancelling. */
export async function openBillingPortal(): Promise<CheckoutResult> {
  if (!supabase) return { ok: false, error: "Payments are not configured yet." };

  const { data, error } = await supabase.functions.invoke("stripe-portal", { body: {} });

  if (error) return { ok: false, error: await readError(error) };
  return data as CheckoutResult;
}

/**
 * Read the function's own message off a failed invoke.
 *
 * `functions.invoke` reports every non-2xx as an `error` whose `message` is a
 * generic "non-2xx status code", and the body is on `error.context`. Without
 * this, "the semester pass is not on sale right now" reaches the user as
 * "Edge Function returned a non-2xx status code", which is the same silent
 * failure these functions were written to avoid. Same shape as
 * `askBlueberry`, deliberately.
 */
async function readError(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response }).context;
  if (ctx?.status === 401) return "not-signed-in";
  if (ctx) {
    try {
      const body = await ctx.json();
      if (typeof body?.error === "string") return body.error;
    } catch {
      // Not JSON. A gateway or CORS failure looks like this.
    }
  }
  return "Could not reach the payment service.";
}
