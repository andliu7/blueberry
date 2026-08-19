-- ============================================================
-- CARDS AND DECKS THAT BELONG TO A PERSON
--
-- Everything on this site so far is either course content that staff own and
-- everyone reads, or progress kept in one browser's localStorage. This is the
-- first thing that is genuinely a user's own and has to follow them between
-- devices: a card they made from a reaction, filed into a deck they named.
-- ============================================================


-- ------------------------------------------------------------
-- DECKS
-- ------------------------------------------------------------

create table public.user_decks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 80),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index user_decks_user_idx on public.user_decks (user_id);

alter table public.user_decks enable row level security;

-- Four policies rather than `for all`. `for all` needs both `using` and
-- `with check` to be correct and it is easy to supply only one, which silently
-- leaves a hole on insert.
create policy "user_decks_select_own" on public.user_decks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_decks_insert_own" on public.user_decks
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_decks_update_own" on public.user_decks
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "user_decks_delete_own" on public.user_decks
  for delete to authenticated using ((select auth.uid()) = user_id);


-- ------------------------------------------------------------
-- CARDS
-- ------------------------------------------------------------
--
-- `deck_id` is nullable and `on delete set null`, so a card outlives the deck
-- it was filed in. Deleting a deck should tidy an organiser, not destroy work:
-- an unfiled card lands back in "everything" rather than disappearing.
--
-- `source_reaction_id` is plain text, not a foreign key. The reactions are
-- generated into `src/data/reactions.ts` and are not a table, so there is
-- nothing to reference. It records where the card came from so a card can link
-- back to the reaction that made it, and a regenerated reaction set cannot
-- orphan somebody's saved cards.

create table public.user_cards (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  deck_id            uuid references public.user_decks (id) on delete set null,
  front              text not null check (length(front) between 1 and 4000),
  back               text not null check (length(back) between 1 and 4000),
  source_reaction_id text,
  -- Red, yellow and green, the same three the site already rates cards with.
  -- Null means never rated, which is different from rated and struggling.
  rating             text check (rating in ('red', 'yellow', 'green')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index user_cards_user_idx on public.user_cards (user_id);
create index user_cards_deck_idx on public.user_cards (deck_id);

alter table public.user_cards enable row level security;

create policy "user_cards_select_own" on public.user_cards
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_cards_insert_own" on public.user_cards
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_cards_update_own" on public.user_cards
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "user_cards_delete_own" on public.user_cards
  for delete to authenticated using ((select auth.uid()) = user_id);


-- ------------------------------------------------------------
-- GRANTS
-- ------------------------------------------------------------
--
-- Separate from the policies, and both are required. RLS with no grant returns
-- 42501 before a policy is ever consulted. That cost an evening the first time
-- round on `profiles` and it is the single easiest thing to leave off.
--
-- Column lists on update, not a bare `grant update`. A bare one covers every
-- column including `user_id`, and an own-row policy would happily allow a user
-- to set that to somebody else's id and hand them their card. That is exactly
-- the privilege escalation the `profiles` grant had.

grant select, insert, delete on public.user_decks to authenticated;
grant update (name, description, updated_at) on public.user_decks to authenticated;

grant select, insert, delete on public.user_cards to authenticated;
grant update (deck_id, front, back, rating, updated_at) on public.user_cards to authenticated;

-- Deliberately nothing for `anon`. These are private by definition, and the
-- read policies would refuse anyway; withholding the grant means the refusal
-- happens before any policy runs.
