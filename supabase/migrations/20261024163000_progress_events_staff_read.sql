-- ============================================================
-- STAFF CAN READ LESSON ACTIVITY (STATUS F1, admin feed view)
--
-- The owner wants to watch a TA's test accounts play lessons, live, from the
-- admin viewer (#/app/admin/activity, src/game/admin/AdminActivity.tsx). Until
-- now progress_events (20261023120000) allowed reading your own rows only.
--
-- One SELECT policy for staff, the same shape as attempts_select_staff and
-- profiles_select_staff in 20260815064800_grants_and_roles.sql: staff are
-- public.is_staff() (role admin or owner), so a student still sees only
-- their own rows.
--
-- READ ONLY. No insert, update or delete is added, and no grant: the table
-- already grants select to authenticated, and RLS decides which rows. Nothing
-- for anon. The table stays append only.
--
-- STAFF'S OWN SYNC. Staff accounts play lessons too, and progressSync.ts
-- pulls their journal from this table. Before be27030 that pull had no
-- user_id filter and leaned on RLS being own-rows-only, so with this policy
-- a staff account would have merged every student's events into its own
-- journal. be27030 adds .eq('user_id', userId). DO NOT APPLY this file until
-- the live site is deployed from a build that includes be27030.
--
-- NOT APPLIED by the agent that wrote it. Run it in the SQL editor after
-- 20261023120000_progress_events.sql.
-- ============================================================

create policy "progress_events_select_staff" on public.progress_events
  for select to authenticated using ((select public.is_staff()));

-- The admin view reads "the most recent events across a few accounts", which
-- the (user_id, at, seq) index does not serve when no account is picked.
create index progress_events_at_idx on public.progress_events (at desc);
