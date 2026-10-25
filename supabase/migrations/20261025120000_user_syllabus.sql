-- ============================================================
-- A STUDENT'S SYLLABUS PLAN (STATUS C1)
--
-- A student pastes their Orgo II syllabus in the game (Me, Settings,
-- Syllabus: src/game/syllabus/SyllabusSettings.tsx). The page reads the
-- schedule and saves a DERIVED plan: which week each unit is taught, the unit
-- and section order, what the course does not cover, the side quests it does
-- cover, and the exam dates. Never the pasted text.
-- Until now the plan lived in one browser's localStorage
-- (blueberry.syllabus.v1); this row lets it follow the student.
-- src/game/syllabus/syllabusSync.ts pulls it on sign-in, keeps whichever side
-- is newer, upserts on change and deletes the row when the plan is cleared.
--
-- A PREFERENCE, NOT AN ENTITLEMENT. No money and no access hang on it: the
-- plan only moves the "you are here" marker and decides which side quests
-- appear on the student's own quizzes. The client re-sanitises the plan on
-- read (known unit and lesson ids only), so a hand-edited row cannot put
-- anything odd on screen.
--
-- Own row only. No is_staff() policy: TAs do not read students' plans unless
-- the owner asks for it.
-- ============================================================


-- ------------------------------------------------------------
-- 1. The table
-- ------------------------------------------------------------
--
-- One row per user. The size check keeps a buggy or hostile client from
-- parking megabytes here (a real plan is about 2 KB).

create table public.user_syllabus (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  plan       jsonb not null check (
               jsonb_typeof(plan) = 'object'
               and pg_column_size(plan) < 16384
             ),
  updated_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 2. Row level security
-- ------------------------------------------------------------

alter table public.user_syllabus enable row level security;

create policy "user_syllabus_select_own" on public.user_syllabus
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_syllabus_insert_own" on public.user_syllabus
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_syllabus_update_own" on public.user_syllabus
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "user_syllabus_delete_own" on public.user_syllabus
  for delete to authenticated using ((select auth.uid()) = user_id);


-- ------------------------------------------------------------
-- 3. Grants
-- ------------------------------------------------------------
--
-- `anon` gets nothing: a visitor with no session keeps the plan on the device.

revoke all on public.user_syllabus from anon, authenticated;

grant select, insert, update, delete on public.user_syllabus to authenticated;
