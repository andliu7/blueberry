# Stripe

Everything is built. Turning it on is six steps, and the ones carrying a secret
are yours to run because a key must never pass through a transcript.

Work through this in **test mode** first. The whole thing runs end to end on
test keys with a test card, and the only difference in live mode is which keys
you paste.

**Your project ref is `kwoqzfvssoxxuvlzzhrp`.** Every URL below is already
filled in with it.

## What was built

| Piece | Where | What it does |
|---|---|---|
| `billing_customers`, `entitlements` | `supabase/migrations/20260907120000_billing.sql` | Two tables. Read-your-own only; **no write policy and no write grant for `authenticated`**, so the only writer is the webhook on the service role |
| `stripe-prices` | `supabase/functions/stripe-prices/` | Public. Returns what the plans cost, read from Stripe. A plan with no price in Stripe is simply absent from the answer, which is why no paid card is on the page today |
| `stripe-checkout` | `supabase/functions/stripe-checkout/` | Signed in only. Takes a plan key, returns a Checkout URL |
| `stripe-webhook` | `supabase/functions/stripe-webhook/` | Stripe calls this. Signature-verified, and the only thing that grants access |
| `stripe-portal` | `supabase/functions/stripe-portal/` | Signed in only. A link to Stripe's own page for changing a card or cancelling |
| `src/lib/billing.ts` | client | `usePlanPrices`, `useEntitlements`, `startCheckout`, `openBillingPortal` |
| Plans panel | `src/components/ui/subscription-plans.tsx` | The two free cards, plus Pro and the semester pass, each appearing only once `stripe-prices` quotes it, with the number it quoted and a buy button. Quote neither and one "coming" card stands in for both, carrying no price and no buy button |

Three plans, keyed by name and not by price id, because a price id changes when
a price is archived and re-made:

- `pro_monthly` and `pro_yearly`: subscriptions
- `semester_pass`: one payment, runs out on a date you set

The panel has a card for `pro_monthly` and one for `semester_pass`. `pro_yearly`
is a key the functions accept, not a third card, so creating that price alone
changes nothing on the page.

## Three things worth knowing before you start

**No number is typed anywhere in the site.** The cards ask `stripe-prices`,
which asks Stripe. This is why there is currently no Pro card and no semester
pass card at all: asking Stripe about a product that does not exist returns
nothing, and a card that cannot say what it costs is not shown. In their place
is one card that says the paid tiers are being built and names no price. Create
a product and its real card appears, with a number on it, with no code change.

**The semester pass has no default length and will not invent one.** It is sold
only while `SEMESTER_PASS_ENDS_ON` is a future date. Unset or past, the pass is
absent from the price list and checkout refuses it with a message; the
subscriptions carry on. A guessed end date is a promise the site made up, and
the way it fails is a student losing access they paid for.

**Access is never decided in the browser.** `useEntitlements` tells the UI which
button to draw. When you build something Pro actually unlocks, that feature
checks on the server. A check in the bundle is a check the bundle's reader can
delete.

## Step 1: create the products in Stripe

Dashboard, **test mode on**, Product catalogue > Add product. Two products, three
prices. Pick your own numbers.

1. **Blueberry Pro**
   - Price: recurring, monthly
   - Then Add another price to the *same* product: recurring, yearly
2. **Blueberry semester pass**
   - Price: one-off

Copy the three price ids. They look like `price_1Q...` and they are on the
**price** row, not the product row. A `prod_...` is not what you want.

## Step 2: push the migration

From `grignard-app-source`. Dry run first so you see what it will do:

```powershell
npx supabase db push --dry-run
npx supabase db push
```

It should report the one migration `20260907120000_billing`. Everything before
it is already applied.

## Step 3: deploy the four functions

**Docker is not running on this machine, so `--use-api` is required.** Without
it the CLI tries to bundle in a container and fails before it reaches Supabase.

```powershell
npx supabase functions deploy stripe-prices --use-api --no-verify-jwt
npx supabase functions deploy stripe-checkout --use-api
npx supabase functions deploy stripe-portal --use-api
npx supabase functions deploy stripe-webhook --use-api --no-verify-jwt
```

`config.toml` already records `verify_jwt = false` for the two public ones; the
flag is belt and braces. Check it landed:

```powershell
npx supabase functions list
```

`stripe-webhook` and `stripe-prices` must read `"verify_jwt":false`, and
`stripe-checkout`, `stripe-portal` and `chat` must read `true`. If the webhook
came out `true`, Stripe gets a 401 on every delivery and nothing works.

## Step 4: give the functions their secrets

One command, all six, from `grignard-app-source`. **Run this yourself** and do
not paste the result anywhere:

```powershell
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_PRICE_PRO_MONTHLY=price_... STRIPE_PRICE_PRO_YEARLY=price_... STRIPE_PRICE_SEMESTER_PASS=price_... SEMESTER_PASS_ENDS_ON=2026-12-20 SITE_URL=https://andliu7.github.io/blueberry
```

`STRIPE_WEBHOOK_SECRET` comes from step 5 and is set there.

Secrets are read at invocation, so nothing needs redeploying after a
`secrets set`. Confirm the names arrived without printing the values:

```powershell
npx supabase secrets list
```

**Every `npx supabase` command has to run from `grignard-app-source`**, not from
the `grignard` parent, or it reports `LegacyProjectNotLinkedError` and looks
like a linking problem when it is a directory problem.

## Step 5: point Stripe at the webhook

Dashboard, test mode, Developers > Webhooks > Add endpoint.

- **URL:** `https://kwoqzfvssoxxuvlzzhrp.supabase.co/functions/v1/stripe-webhook`
- **Events:** `checkout.session.completed`, `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted`

Copy the signing secret (`whsec_...`) and:

```powershell
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

**Nothing works before this.** Checkout will complete, the money will move in
test mode, and no row will appear in `entitlements`, because the only thing that
writes one is a signed webhook delivery.

## Step 6: test the whole path

```powershell
npm run dev
```

Sign in, open the plans panel, press Get Pro. Stripe's test card is
`4242 4242 4242 4242`, any future expiry, any CVC, any postcode.

Three checks afterwards, in this order:

1. Stripe dashboard, Developers > Webhooks: the delivery is there and its
   response is **200**. A 400 means the signing secret is wrong. A 401 means
   `verify_jwt` did not come off, so go back to step 3.
2. Supabase table editor, `entitlements`: one row, your user id, status `active`
   for a subscription or `complete` for the pass.
3. Reload the plans panel: Pro wears the "Current" badge.

If the webhook shows a 500:

```powershell
npx supabase functions logs stripe-webhook
```

## The grant trap, recorded because it nearly shipped

The first draft of the migration had RLS policies and **no `GRANT`s**. On this
project that breaks twice, and neither failure is obvious:

- `authenticated` with a policy but no grant gets a *permission error*, not an
  empty list. `auto_expose_new_tables` is commented out in `config.toml`,
  matching the cloud default, so a new table is unreachable until granted.
- `service_role` carries `rolbypassrls`, so it ignores policies, **but it does
  not bypass `GRANT`**. Verified on this project: it holds no DML on any
  existing table. The webhook would have taken a valid payment, received a
  signed event and been refused by Postgres, returning 500 to Stripe *after the
  money moved*.

Both are fixed in the migration. If you ever add another billing table, copy the
GRANTS block at the foot of it.

## Going live

Swap `sk_test_` for `sk_live_`, create the products again in live mode (test and
live are separate catalogues, so the price ids differ), add a live webhook
endpoint, and set its `whsec_`. Nothing in the code changes.

## The thing to settle before anyone is charged

This is not a technical blocker and it is the real one.

The site's content includes Dr. Stocker's pKa sheet, the class IR and NMR slides
and the course's own sample LCTA questions. That was already noted as not yours
to sell while the site was free. A paywall in front of it is a materially
different exposure, and you are pre-dental at the university whose faculty
produced it.

The engine is yours: the trainer, the decks you wrote, the funnel, the
scheduling, all of it. The course material is not. Worth deciding which side of
the paywall each piece sits on before the first live charge rather than after.
