-- ============================================================
-- A STUDENT'S OWN pKa VALUES (STATUS C2)
--
-- A student can paste their professor's pKa sheet or change single rungs
-- (src/game/settings/PkaSettings.tsx). DECIDED 23 Oct: those numbers change
-- only that student's values. Until now they lived in one browser's
-- localStorage (blueberry.pka.v1); this row lets them follow the student.
-- src/game/settings/pkaSync.ts pulls it on sign-in, keeps whichever side is
-- newer, and upserts on change.
--
-- WHY NOT progress_events. That table is an append only journal of things that
-- happened, with no update grant on purpose. A preference that is replaced
-- wholesale does not belong in it.
--
-- A PREFERENCE, NOT AN ENTITLEMENT. No money and no access hang on these
-- columns. The client re-sanitises every value on read (range -25 to 65, known
-- rungs only), so a hand-edited row cannot put anything odd on screen.
-- ============================================================


-- ------------------------------------------------------------
-- 1. The table
-- ------------------------------------------------------------
--
-- One row per user. `overrides` is the client's { rung_id: number } map; the
-- size check keeps a buggy or hostile client from parking megabytes here.

create table public.user_pka_settings (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  preset_id  text not null default 'course_worksheet' check (length(preset_id) between 1 and 64),
  overrides  jsonb not null default '{}'::jsonb check (
               jsonb_typeof(overrides) = 'object'
               and pg_column_size(overrides) < 4096
             ),
  updated_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 2. Row level security
-- ------------------------------------------------------------
--
-- Own row only. Four policies rather than `for all`, in the style of
-- 20260819120000_user_cards_and_decks.sql.

alter table public.user_pka_settings enable row level security;

create policy "user_pka_settings_select_own" on public.user_pka_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_pka_settings_insert_own" on public.user_pka_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_pka_settings_update_own" on public.user_pka_settings
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "user_pka_settings_delete_own" on public.user_pka_settings
  for delete to authenticated using ((select auth.uid()) = user_id);


-- ------------------------------------------------------------
-- 3. Grants
-- ------------------------------------------------------------
--
-- Revoke what the project's default privileges handed out, then grant what
-- sync needs. `anon` gets nothing: a visitor with no session has no account.

revoke all on public.user_pka_settings from anon, authenticated;

grant select, insert, update, delete on public.user_pka_settings to authenticated;
