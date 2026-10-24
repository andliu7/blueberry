-- ============================================================
-- GAME PROGRESS THAT FOLLOWS THE STUDENT (STATUS A1)
--
-- The first per-user game history on the account. Until now the game's journal
-- (packages/economy: every attempt, clear, chest and spend) lived only in one
-- browser's localStorage, so a student who switched devices started over.
-- src/game/app/progressSync.ts pulls these rows on sign-in, merges them with
-- the device's journal by event id, and pushes the events the account lacks.
--
-- APPEND ONLY. The journal is a record of things that happened, and every
-- balance is derived from it (docs/ECONOMY.md: "Recomputable from scratch").
-- An event is never edited and never removed, so there is no update or delete
-- policy and no update or delete grant: a student cannot rewrite their history,
-- and a sync bug cannot erase it.
--
-- A PROGRESS RECORD, NOT AN ENTITLEMENT. Nothing paid is gated on these rows.
-- The events are client-claimed; the Phase 6 server check of whether an event
-- may exist at all is not part of this table. Balances stay derived.
-- ============================================================


-- ------------------------------------------------------------
-- 1. The table
-- ------------------------------------------------------------
--
-- `id` is the event's own id (crypto.randomUUID, or a deterministic
-- `legacy:<hash>:<n>` for events written before ids existed), unique per user,
-- so the primary key is (user_id, id): an id cannot collide across accounts,
-- and a repeated push of one event is ON CONFLICT DO NOTHING.
--
-- `kind` is a pattern rather than a list, so a new event kind needs no
-- migration; the client validates the full shape (isEconomyEvent) on every
-- read and drops a row that does not pass.
--
-- `seq` breaks ties in `at`: the derivation reads same-instant events in the
-- order they were written (a lesson's attempts before its clear).

create table public.progress_events (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id          text not null check (id ~ '^[A-Za-z0-9:_-]{1,80}$'),
  kind        text not null check (kind ~ '^[a-z_]{1,40}$'),
  at          timestamptz not null,
  event       jsonb not null check (
                jsonb_typeof(event) = 'object'
                and event->>'kind' = kind
                and octet_length(event::text) <= 4096
              ),
  seq         bigint generated always as identity,
  received_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index progress_events_user_at_idx on public.progress_events (user_id, at, seq);


-- ------------------------------------------------------------
-- 2. Row level security
-- ------------------------------------------------------------
--
-- Own rows only, read and insert. Nothing else exists to allow.

alter table public.progress_events enable row level security;

create policy "progress_events_select_own" on public.progress_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "progress_events_insert_own" on public.progress_events
  for insert to authenticated with check ((select auth.uid()) = user_id);


-- ------------------------------------------------------------
-- 3. Grants
-- ------------------------------------------------------------
--
-- Revoke whatever the project's default privileges handed out when the table
-- was created, then grant only what sync needs. The insert grant is a column
-- list, so `user_id`, `seq` and `received_at` can only come from their
-- defaults: nobody can write a row into another account, even before the
-- policy runs. `anon` gets nothing: a visitor with no session has no account.

revoke all on public.progress_events from anon, authenticated;

grant select on public.progress_events to authenticated;
grant insert (id, kind, at, event) on public.progress_events to authenticated;
