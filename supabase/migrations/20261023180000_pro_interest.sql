-- ============================================================
-- "TELL ME WHEN PRO OPENS" (STATUS G3)
--
-- The Pro sheet in the game (src/game/upsell/UpsellSheet.tsx) offers, while
-- Pro is not on sale to everyone, one button: "Tell me when it opens". A press
-- writes one row here, so the owner can email those students when Pro opens.
-- One row per account: a second press is a primary key conflict, which the
-- client reads as "already recorded".
--
-- NOT AN ENTITLEMENT AND NOT MONEY. No column here grants anything or holds a
-- price; it is a list of who asked.
-- ============================================================


-- ------------------------------------------------------------
-- 1. The table
-- ------------------------------------------------------------

create table public.pro_interest (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 2. Row level security
-- ------------------------------------------------------------
--
-- A student inserts and reads their own row. Staff read every row through
-- is_staff(), the same check every other staff policy uses (role_hardening).
-- No update or delete policy: nothing about the row is worth changing.

alter table public.pro_interest enable row level security;

create policy "pro_interest_select_own" on public.pro_interest
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "pro_interest_insert_own" on public.pro_interest
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "pro_interest_select_staff" on public.pro_interest
  for select to authenticated using ((select public.is_staff()));


-- ------------------------------------------------------------
-- 3. Grants
-- ------------------------------------------------------------
--
-- Revoke the project's default privileges, then grant only what the button
-- needs. The insert grant is the one column, so `created_at` only ever comes
-- from its default. `anon` gets nothing: a visitor has no account to tell.

revoke all on public.pro_interest from anon, authenticated;

grant select on public.pro_interest to authenticated;
grant insert (user_id) on public.pro_interest to authenticated;
