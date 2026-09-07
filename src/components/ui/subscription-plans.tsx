import { useState } from "react";
import { BookOpen, Check, Loader2, Sparkles, Ticket, User } from "lucide-react";
import * as PricingCard from "@/components/ui/pricing-card";
import { useAuth } from "@/lib/AuthContext";
import {
  formatPrice,
  startCheckout,
  useEntitlements,
  usePlanPrices,
  type PlanKey,
  type PlanPrice,
} from "@/lib/billing";

/**
 * The tiers, shown in Subscriptions and at the top of Profile.
 *
 * **The prices are still not invented, they are now read.** Every number on
 * these cards comes from `stripe-prices`, which asks Stripe. A plan Stripe has
 * no price for is absent from that answer and its card says so, which today is
 * all of the paid ones. That is the correct output until Andrew creates the
 * products; see `docs/STRIPE.md`. Typing "$6" in here would make this file the
 * one place on the site that can be out of date about money.
 *
 * Which card is marked current comes from the Supabase session and from the
 * entitlements the Stripe webhook wrote, so the panel reflects the actual
 * state. It used to come from `useGoogleAuth`, which is the old Google-only
 * path the rest of the site left behind: somebody signed in through Supabase
 * saw "Open site" and was offered an account they already had.
 */

type Plan = {
  id: "open" | "member" | "pro" | "pass";
  /** The Stripe plan key, for the tiers that are bought. */
  buys?: PlanKey;
  icon: React.ReactNode;
  name: string;
  description: string;
  /** Shown when Stripe has no price for this tier. Free tiers keep it always. */
  fallbackPrice: string;
  fallbackPeriod?: string;
  features: string[];
  /** Shown below the divider: what this tier adds that the one before it lacks. */
  adds?: string[];
};

const PLANS: Plan[] = [
  {
    id: "open",
    icon: <BookOpen />,
    name: "Open site",
    description: "No account. Everything here works today.",
    fallbackPrice: "Free",
    features: [
      "Every study deck",
      "Reference decks: pKa, IR, NMR, resonance",
      "Ratings and notes, held in this browser",
      "The focus timer and the break room",
      "Lessons as they are written",
    ],
  },
  {
    id: "member",
    icon: <User />,
    name: "Member",
    description: "An account, so your progress is not tied to one browser.",
    fallbackPrice: "Free",
    features: ["Everything in the open site"],
    adds: [
      "Progress that follows you between machines",
      "Your ratings and notes backed up",
      "An onboarding quiz that sets the site up around your course",
    ],
  },
  {
    id: "pro",
    buys: "pro_monthly",
    icon: <Sparkles />,
    name: "Pro",
    description: "The parts that cost something to run.",
    fallbackPrice: "TBD",
    fallbackPeriod: "not on sale yet",
    features: ["Everything in Member"],
    adds: [
      "Mechanism practice, marked as you draw it",
      "Importing your own notes and images",
      "A syllabus, so the site knows when your exams are",
    ],
  },
  {
    id: "pass",
    buys: "semester_pass",
    icon: <Ticket />,
    name: "Semester pass",
    description: "Everything in Pro, paid once, until the semester ends.",
    fallbackPrice: "TBD",
    fallbackPeriod: "not on sale yet",
    features: ["Everything in Pro"],
    adds: ["One payment, no renewal", "Nothing to remember to cancel"],
  },
];

export function SubscriptionPlans({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const { prices } = usePlanPrices();
  const { pro } = useEntitlements();

  /**
   * Which card wears the "Current" badge. One badge, on the highest tier the
   * person actually holds: Pro if anything is live, Member if signed in, the
   * open site otherwise. It is not per-card state, so it cannot say two.
   */
  const current: Plan["id"] = pro ? "pro" : user ? "member" : "open";

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const price = plan.buys ? prices.find((p) => p.plan === plan.buys) : undefined;
          return (
            <PricingCard.Card key={plan.id}>
              <PricingCard.Header>
                <PricingCard.Plan>
                  <PricingCard.PlanName>
                    {plan.icon}
                    <span>{plan.name}</span>
                  </PricingCard.PlanName>
                  {current === plan.id && <PricingCard.Badge>Current</PricingCard.Badge>}
                </PricingCard.Plan>

                <PricingCard.Price>
                  <PricingCard.MainPrice>
                    {price ? formatPrice(price.amount, price.currency) : plan.fallbackPrice}
                  </PricingCard.MainPrice>
                  {periodLabel(plan, price) && (
                    <PricingCard.Period>{periodLabel(plan, price)}</PricingCard.Period>
                  )}
                </PricingCard.Price>

                <PlanAction
                  plan={plan}
                  price={price}
                  isCurrent={current === plan.id}
                  signedIn={Boolean(user)}
                  onNavigate={onNavigate}
                />
              </PricingCard.Header>

              <PricingCard.Body>
                <PricingCard.Description>{plan.description}</PricingCard.Description>

                <PricingCard.List>
                  {plan.features.map((item) => (
                    <PricingCard.ListItem key={item}>
                      <Check className="mt-0.5 size-3.5 shrink-0 text-slate-900 dark:text-stone-100" />
                      <span>{item}</span>
                    </PricingCard.ListItem>
                  ))}
                </PricingCard.List>

                {plan.adds && (
                  <>
                    <PricingCard.Separator>Adds</PricingCard.Separator>
                    <PricingCard.List>
                      {plan.adds.map((item) => (
                        <PricingCard.ListItem key={item}>
                          <Check className="mt-0.5 size-3.5 shrink-0 text-slate-900 dark:text-stone-100" />
                          <span>{item}</span>
                        </PricingCard.ListItem>
                      ))}
                    </PricingCard.List>
                  </>
                )}
              </PricingCard.Body>
            </PricingCard.Card>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-slate-400 dark:text-stone-500">
        Everything on the open site stays free. The paid tiers are for the parts that cost
        something to run.
      </p>
    </div>
  );
}

/** "a month", "a year", or when the pass runs to. Nothing when it is free. */
function periodLabel(plan: Plan, price: PlanPrice | undefined): string | undefined {
  if (!price) return plan.fallbackPeriod;
  if (price.interval) return `a ${price.interval}`;
  return price.endsOn ? `until ${price.endsOn}` : undefined;
}

/**
 * A button that admits what it does.
 *
 * Member sends you to the sign-in page rather than firing a popup from inside
 * a panel. Signing in is its own act with its own address, and doing it behind
 * a dashboard overlay leaves you signed in while still looking at the panel you
 * started from.
 *
 * A paid tier with no Stripe price says so plainly, which beats a live-looking
 * button that takes a click and does nothing. A paid tier with a price and
 * nobody signed in sends them to sign in first: Stripe needs a customer to
 * attach the purchase to, and an anonymous payment is one nobody can ever be
 * given access for.
 */
function PlanAction({
  plan,
  price,
  isCurrent,
  signedIn,
  onNavigate,
}: {
  plan: Plan;
  price: PlanPrice | undefined;
  isCurrent: boolean;
  signedIn: boolean;
  onNavigate?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const base =
    "mt-1 block w-full rounded-full px-3 py-2 text-center text-xs font-semibold transition-colors";
  const filled = `${base} cursor-pointer bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white hover:brightness-110`;
  const quiet = `${base} border border-dashed border-slate-300 text-slate-400 dark:border-stone-700 dark:text-stone-500`;

  if (isCurrent) {
    return (
      <div
        className={`${base} border border-slate-200 bg-white/70 text-slate-500 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-400`}
      >
        Your current plan
      </div>
    );
  }

  if (plan.id === "open") return <div className={quiet}>Always available</div>;

  if (plan.id === "member") {
    return (
      <a href="#/signup" onClick={onNavigate} className={filled}>
        Create an account
      </a>
    );
  }

  if (!price) return <div className={quiet}>Not on sale yet</div>;

  if (!signedIn) {
    return (
      <a href="#/signup" onClick={onNavigate} className={filled}>
        Sign in to buy
      </a>
    );
  }

  const buy = async () => {
    if (!plan.buys || busy) return;
    setBusy(true);
    setFailed(null);
    const result = await startCheckout(plan.buys);
    if (result.ok && result.url) {
      // Stripe hosts the payment page, so this leaves the site on purpose.
      window.location.href = result.url;
      return;
    }
    setBusy(false);
    setFailed(
      result.error === "not-signed-in" ? "Sign in first." : (result.error ?? "That did not work."),
    );
  };

  return (
    <>
      <button type="button" onClick={buy} disabled={busy} className={filled}>
        {busy ? (
          <span className="inline-flex items-center justify-center gap-1.5">
            <Loader2 className="size-3.5 animate-spin" />
            Opening Stripe
          </span>
        ) : (
          `Get ${plan.name}`
        )}
      </button>
      {failed && <p className="mt-1.5 text-center text-xs text-rose-600">{failed}</p>}
    </>
  );
}

export default SubscriptionPlans;
