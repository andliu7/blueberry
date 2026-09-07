/**
 * What is for sale, and the two clients that talk to Stripe and Supabase.
 *
 * Shared by all four billing functions so the plan catalogue is stated once.
 * A price id typed into two functions is a price id that will disagree with
 * itself the first time one of them is edited.
 */

import Stripe from "npm:stripe@22.6.1";
import { createClient } from "jsr:@supabase/supabase-js@2";

/* The catalogue */

export type PlanKey = "pro_monthly" | "pro_yearly" | "semester_pass";

export interface Plan {
  key: PlanKey;
  /** 'subscription' renews; 'pass' is bought once and runs out. */
  kind: "subscription" | "pass";
  /** The name of the env var holding this plan's Stripe price id. */
  priceEnv: string;
  label: string;
}

export const PLANS: readonly Plan[] = [
  {
    key: "pro_monthly",
    kind: "subscription",
    priceEnv: "STRIPE_PRICE_PRO_MONTHLY",
    label: "Pro, monthly",
  },
  {
    key: "pro_yearly",
    kind: "subscription",
    priceEnv: "STRIPE_PRICE_PRO_YEARLY",
    label: "Pro, yearly",
  },
  {
    key: "semester_pass",
    kind: "pass",
    priceEnv: "STRIPE_PRICE_SEMESTER_PASS",
    label: "Semester pass",
  },
];

export const planFor = (key: string): Plan | null =>
  PLANS.find((p) => p.key === key) ?? null;

/** The configured price id, or null when this plan is not set up yet. */
export const priceIdFor = (plan: Plan): string | null =>
  Deno.env.get(plan.priceEnv) || null;

/**
 * When a semester pass bought today runs out.
 *
 * `SEMESTER_PASS_ENDS_ON` is an ISO date Andrew sets once a semester. There is
 * deliberately no fallback duration: a pass whose end date is guessed is a
 * promise the site made up, and the failure mode of guessing wrong is a
 * student losing access they paid for. When it is unset or already past, the
 * pass is simply not on sale and checkout says so before any money moves. The
 * subscriptions are unaffected.
 */
export function semesterPassEnd(): Date | null {
  const raw = Deno.env.get("SEMESTER_PASS_ENDS_ON");
  if (!raw) return null;
  const end = new Date(`${raw}T23:59:59Z`);
  if (Number.isNaN(end.getTime()) || end.getTime() <= Date.now()) return null;
  return end;
}

/* The clients */

/**
 * Stripe over `fetch`, which is the only HTTP client Deno has. The Node build
 * defaults to a `http`-module client that does not exist here and fails at the
 * first request rather than at import, so this line is not optional.
 *
 * No `apiVersion`: the pinned SDK sends its own, which is the version its
 * types and its request shapes were generated against. Naming a different one
 * here would make the wire format and the types disagree silently.
 */
export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  httpClient: Stripe.createFetchHttpClient(),
});

/**
 * The service-role client, for the webhook only.
 *
 * It bypasses Row Level Security, which is the entire reason the entitlement
 * tables have no write policies: the only writer is a request Stripe signed.
 * Never build this one from a caller's token, and never use it in a function a
 * browser calls directly.
 */
export const serviceClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

/**
 * The caller's own client: their token, so `auth.getUser` and RLS both see the
 * person who actually asked. This function cannot be tricked into acting as
 * somebody else.
 */
export const userClient = (authHeader: string) =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );

/* HTTP plumbing, identical in shape to `functions/chat` */

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

/**
 * Where Stripe sends people back to. Hash routes, because this site is a
 * static bundle: `SITE_URL` is the origin and path, and the funnel's own
 * addresses hang off it.
 */
export const siteUrl = () =>
  (Deno.env.get("SITE_URL") ?? "https://andliu7.github.io/blueberry/").replace(/\/+$/, "");
