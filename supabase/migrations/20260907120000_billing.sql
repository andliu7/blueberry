-- ============================================================
-- BILLING
--
-- Two tables and no client writes anywhere in them.
--
-- Everything a browser can write on this site so far is the person's own
-- content: their decks, their cards, their notes. This is the first thing
-- where the browser must not be believed at all. "Am I paid up" is decided by
-- Stripe, relayed by a webhook running with the service role, and read back by
-- the client. So every policy here is `for select` only: there is no insert,
-- update or delete policy on either table, which under RLS means nobody
-- holding an anon or authenticated JWT can write a row by any route. The
-- service role bypasses RLS, which is exactly and only what the webhook uses.
--
-- Nothing here grants a feature either. These rows are a *record* of what
-- Stripe says; whichever surface decides what Pro unlocks reads them and
-- decides. Keeping the record and the gate separate is what lets a refund or a
-- failed renewal take access away without a second write path.
-- ============================================================


-- ------------------------------------------------------------
-- WHO THIS PERSON IS IN STRIPE
-- ------------------------------------------------------------
--
-- One Stripe customer per user, created the first time they open checkout and
-- reused forever after. Without this, a second purchase makes a second Stripe
-- customer, the billing portal shows one of them, and a support question
-- becomes an archaeology exercise.
--
-- The email is deliberately NOT stored here. It is in `auth.users`, Stripe has
-- its own copy, and a third copy would be the one that goes stale.

create table public.billing_customers (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at         timestamptz not null default now()
);

alter table public.billing_customers enable row level security;

create policy "billing_customers_select_own" on public.billing_customers
  for select to authenticated using ((select auth.uid()) = user_id);


-- ------------------------------------------------------------
-- WHAT THEY BOUGHT
-- ------------------------------------------------------------
--
-- ONE ROW PER PURCHASE, not one row per user, and that is the decision worth
-- defending. A single row per user has to merge a subscription and a semester
-- pass into one "access_until", which means every webhook writes needs to know
-- what the other product already granted and take the later of the two. That
-- merge is easy to get subtly wrong and impossible to audit afterwards.
--
-- Separate rows mean each product answers only for itself, the webhook writes
-- what Stripe just told it and nothing else, and "does this person have Pro
-- right now" is a question about the SET of rows rather than a value somebody
-- computed at write time. See `isPro` in `src/lib/billing.ts`, which is the
-- one place that question is answered.

create table public.entitlements (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references auth.users (id) on delete cascade,

  -- 'subscription' renews and can be cancelled; 'pass' is bought once and runs
  -- out. They are told apart here rather than inferred from which id column is
  -- null, because a reader should not have to know that trick.
  kind                       text not null check (kind in ('subscription', 'pass')),

  -- The plan key from `_shared/billing.ts`, not a Stripe price id. Price ids
  -- change when a price is archived and re-created; the key is ours and does
  -- not.
  plan                       text not null,

  -- Stripe's own subscription statuses, plus 'complete' for a one-off pass,
  -- which has no subscription lifecycle to report. Not an enum type: Stripe
  -- adds statuses, and a new one arriving should widen a check constraint in a
  -- migration rather than fail a webhook in production.
  status                     text not null,

  -- When access ends. Null means it does not: a pass with no configured end
  -- date cannot be sold, so in practice this is always set, and the column
  -- stays nullable only so a future perpetual grant does not need a migration.
  access_until               timestamptz,

  -- The idempotency keys. A Stripe webhook is delivered at least once and can
  -- be replayed by hand from the dashboard, so every write is an upsert keyed
  -- on one of these and a duplicate delivery changes nothing.
  stripe_subscription_id     text unique,
  stripe_checkout_session_id text unique,

  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create index entitlements_user_idx on public.entitlements (user_id);

alter table public.entitlements enable row level security;

create policy "entitlements_select_own" on public.entitlements
  for select to authenticated using ((select auth.uid()) = user_id);


-- ------------------------------------------------------------
-- GRANTS
-- ------------------------------------------------------------
--
-- Separate from the policies, and both are required. RLS with no grant returns
-- a permission error, not an empty list, which is the same trap
-- `20260815064800_grants_and_roles.sql` was written to close and the same one
-- `user_cards` had to be told about. This project does not auto-expose new
-- tables: `auto_expose_new_tables` is commented out in config.toml, matching
-- the cloud default, so a table with perfect policies and no grant is simply
-- unreachable.
--
-- SELECT ONLY, TO BOTH ROLES THAT READ. There is no insert, update or delete
-- grant for `authenticated` anywhere below, which means a browser is refused
-- twice over: once by the missing grant and once by the missing policy. Money
-- is the one thing on this site where one lock is not enough.

grant select on public.billing_customers to authenticated;
grant select on public.entitlements      to authenticated;

-- THE WEBHOOK'S GRANT, AND IT IS NOT OPTIONAL. `service_role` carries
-- `rolbypassrls`, so it ignores every policy above, and that is what makes it
-- the right role for a request Stripe signed. It does NOT bypass GRANT.
-- Verified on this project: `service_role` holds no DML on any existing table
-- here, so without these two lines the webhook would take a valid payment,
-- receive a signed event, and be refused by Postgres while returning 500 to
-- Stripe. That failure lands after the money has moved, which is the worst
-- place to find it.
--
-- No delete: the webhook never deletes an entitlement. A cancelled
-- subscription keeps its row and its period end, so access lasts as long as
-- the person paid for. See the note on `customer.subscription.deleted`.

grant select, insert, update on public.billing_customers to service_role;
grant select, insert, update on public.entitlements      to service_role;
