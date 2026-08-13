import { BookOpen, Check, Sparkles, User } from "lucide-react";
import * as PricingCard from "@/components/ui/pricing-card";
import { useGoogleAuth } from "@/lib/useGoogleAuth";

/**
 * The three tiers, shown in Subscriptions and at the top of Profile.
 *
 * The prices are deliberately not invented. Nothing is charged today, so a card
 * reading "$29" would be the one thing on this site that is not true. Pro says
 * so on its face until a number is decided, and `PLANS` is where to put that
 * number when it is.
 *
 * Which card is marked current comes from whether Google sign-in has a user,
 * so the panel reflects the actual state rather than a hardcoded guess.
 */

type Plan = {
  id: "open" | "member" | "pro";
  icon: React.ReactNode;
  name: string;
  description: string;
  price: string;
  period?: string;
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
    price: "Free",
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
    price: "Free",
    features: ["Everything in the open site"],
    adds: [
      "Progress that follows you between machines",
      "Your ratings and notes backed up",
      "An onboarding quiz that sets the site up around your course",
    ],
  },
  {
    id: "pro",
    icon: <Sparkles />,
    name: "Pro",
    description: "The parts that cost something to run.",
    price: "TBD",
    period: "not charging yet",
    features: ["Everything in Member"],
    adds: [
      "Mechanism practice, marked as you draw it",
      "Importing your own notes and images",
      "A syllabus, so the site knows when your exams are",
    ],
  },
];

export function SubscriptionPlans({ onNavigate }: { onNavigate?: () => void }) {
  const { user, configured } = useGoogleAuth();
  const current: Plan["id"] = user ? "member" : "open";

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PLANS.map((plan) => (
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
                <PricingCard.MainPrice>{plan.price}</PricingCard.MainPrice>
                {plan.period && <PricingCard.Period>{plan.period}</PricingCard.Period>}
              </PricingCard.Price>

              <PlanAction
                plan={plan}
                isCurrent={current === plan.id}
                canSignIn={configured}
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
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-400 dark:text-stone-500">
        Nothing is paid for yet and nothing is being charged. Everything on the site today stays
        free.
      </p>
    </div>
  );
}

/**
 * A button that admits what it does.
 *
 * Member sends you to the sign-in page rather than firing the Google popup from
 * inside a panel. Signing in is its own act with its own address, and doing it
 * behind a dashboard overlay leaves you signed in while still looking at the
 * panel you started from. `DeckUploadTicket` already linked to `#/signin`; this
 * is the same route.
 *
 * The rest say plainly that they are not built, which beats a live-looking
 * button that silently does nothing.
 */
function PlanAction({
  plan,
  isCurrent,
  canSignIn,
  onNavigate,
}: {
  plan: Plan;
  isCurrent: boolean;
  canSignIn: boolean;
  onNavigate?: () => void;
}) {
  const base =
    "mt-1 block w-full rounded-full px-3 py-2 text-center text-xs font-semibold transition-colors";

  if (isCurrent) {
    return (
      <div
        className={`${base} border border-slate-200 bg-white/70 text-slate-500 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-400`}
      >
        Your current plan
      </div>
    );
  }

  if (plan.id === "member" && canSignIn) {
    return (
      <a
        href="#/signup"
        onClick={onNavigate}
        className={`${base} cursor-pointer bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white hover:brightness-110`}
      >
        Create an account
      </a>
    );
  }

  return (
    <div
      className={`${base} border border-dashed border-slate-300 text-center text-slate-400 dark:border-stone-700 dark:text-stone-500`}
    >
      {plan.id === "pro" ? "Not available yet" : "Sign-in is off in this build"}
    </div>
  );
}

export default SubscriptionPlans;
