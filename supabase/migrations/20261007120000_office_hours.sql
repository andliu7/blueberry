-- ============================================================
-- OFFICE HOURS: TUTORS POST SLOTS, STUDENTS BOOK THEM
-- ============================================================
--
-- SITE-REPLAN.md phase 6 (Schedule). Owner answer of 2026-10-07: tutors on the
-- roster post office-hour slots; any signed-in student books one, free; and the
-- rule is enforced here, on the server, never only in the browser.
--
-- Replaces the Apps Script tutoring calls (`tutoring`, `setAvailability`,
-- `bookSlot`, `cancelBooking`). Those needed a Google ID token, which a Supabase
-- session does not have, so a student signed in the normal way could never book.
--
-- Two tables:
--
--   office_hours           one row per slot a tutor offers
--   office_hour_bookings   one row per booked slot (at most one per slot)
--
-- Who may do what, in one place:
--
--   signed out (anon)      nothing at all, on either table
--   any signed-in student  read every slot; book an open future slot for
--                          themselves; read and cancel their own bookings
--   a tutor (is_staff())   all of the above, plus post, move and delete their
--                          own slots, and read and cancel bookings on them
--
-- "Tutor" means staff on `staff_roster` (admin or owner), read through the same
-- `is_staff()` every other staff policy uses. Adding a TA stays one roster insert.


-- ------------------------------------------------------------
-- 1. The slots
-- ------------------------------------------------------------
--
-- `timestamptz`, unlike `course_dates`, which stores the syllabus's wall-clock
-- time. A slot needs a real instant because the booking policy below compares
-- it with `now()` to refuse a slot that has already started; a zoneless
-- timestamp compared with `now()` is read in the server's zone (UTC) and would
-- be four or five hours wrong in College Park.
--
-- `booked` is kept by a trigger on the bookings table, so students can see that
-- a slot is taken without seeing who took it (they cannot read other people's
-- bookings). Nobody can write it through the API: it has no column grant.

create table public.office_hours (
  id          uuid primary key default gen_random_uuid(),
  tutor_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tutor_name  text not null check (char_length(tutor_name) between 1 and 80),
  starts_at   timestamptz not null,
  minutes     integer not null default 30 check (minutes between 10 and 180),
  location    text check (char_length(location) <= 200),
  booked      boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (tutor_id, starts_at)
);

create index office_hours_starts_at_idx on public.office_hours (starts_at);

alter table public.office_hours enable row level security;

-- Any signed-in account sees the timetable. An anonymous sign-in (if the project
-- ever turns those on) carries the `authenticated` role too, so it is excluded
-- by its claim rather than trusted because of its role.
create policy "office_hours_select_signed_in"
  on public.office_hours for select
  to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

create policy "office_hours_insert_tutor"
  on public.office_hours for insert
  to authenticated
  with check ((select public.is_staff()) and tutor_id = (select auth.uid()));

-- Both halves: USING picks the rows a tutor may touch (their own), WITH CHECK
-- stops them handing a slot to somebody else.
create policy "office_hours_update_tutor"
  on public.office_hours for update
  to authenticated
  using ((select public.is_staff()) and tutor_id = (select auth.uid()))
  with check ((select public.is_staff()) and tutor_id = (select auth.uid()));

create policy "office_hours_delete_tutor"
  on public.office_hours for delete
  to authenticated
  using ((select public.is_staff()) and tutor_id = (select auth.uid()));


-- ------------------------------------------------------------
-- 2. The bookings
-- ------------------------------------------------------------
--
-- `student_id` and `student_email` come from the caller's own token through
-- column defaults, and neither column is granted for insert, so a student can
-- only ever book as themselves. `unique (slot_id)` is what makes a slot
-- single-occupancy: two students pressing Confirm at the same moment get one
-- booking and one refusal, decided by the index rather than by whoever's
-- browser looked first.

create table public.office_hour_bookings (
  id             uuid primary key default gen_random_uuid(),
  slot_id        uuid not null unique references public.office_hours (id) on delete cascade,
  student_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  student_email  text default (auth.jwt() ->> 'email'),
  student_name   text check (char_length(student_name) <= 80),
  note           text check (char_length(note) <= 1000),
  created_at     timestamptz not null default now()
);

create index office_hour_bookings_student_idx on public.office_hour_bookings (student_id);

alter table public.office_hour_bookings enable row level security;

-- Your own bookings, or the bookings on your own slots if you are the tutor.
create policy "bookings_select_own_or_tutor"
  on public.office_hour_bookings for select
  to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.office_hours s
      where s.id = slot_id and s.tutor_id = (select auth.uid())
    )
  );

-- The rule the owner set, and the one the phase check proves. Signed in, not an
-- anonymous account, booking as yourself, a slot that has not started, and not
-- your own slot. `to authenticated` already shuts out a visitor with no session:
-- `anon` has no grant on this table, so Postgres refuses before this runs.
create policy "bookings_insert_signed_in_student"
  on public.office_hour_bookings for insert
  to authenticated
  with check (
    student_id = (select auth.uid())
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    and exists (
      select 1 from public.office_hours s
      where s.id = slot_id
        and s.starts_at > now()
        and s.tutor_id <> (select auth.uid())
    )
  );

-- Cancelling: the student who booked, or the tutor whose slot it is. There is no
-- update policy and no update grant; changing the time is book the new slot,
-- then cancel the old one, so a failed change never leaves you with neither.
create policy "bookings_delete_own_or_tutor"
  on public.office_hour_bookings for delete
  to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.office_hours s
      where s.id = slot_id and s.tutor_id = (select auth.uid())
    )
  );


-- ------------------------------------------------------------
-- 3. Keeping `booked` true
-- ------------------------------------------------------------
--
-- `security definer` because the student whose booking fires this cannot update
-- `office_hours` (no grant, no policy), and should not be able to. The function
-- does one fixed thing to one row the booking names; it takes no input a caller
-- chooses. `search_path = ''` for the usual hijacking reason, and execute is
-- revoked from everyone, since a trigger function is never called directly.

create function public.office_hours_sync_booked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT') then
    update public.office_hours set booked = true where id = new.slot_id;
    return new;
  end if;
  update public.office_hours set booked = false where id = old.slot_id;
  return old;
end;
$$;

revoke execute on function public.office_hours_sync_booked() from public, anon, authenticated;

create trigger office_hour_bookings_sync_booked
  after insert or delete on public.office_hour_bookings
  for each row execute function public.office_hours_sync_booked();


-- ------------------------------------------------------------
-- 4. Grants
-- ------------------------------------------------------------
--
-- RLS is not GRANT: without a grant Postgres answers 42501 before any policy is
-- read. And a grant with no column list covers every column, which is how a
-- student once set their own role to owner. So: revoke whatever a project's
-- default privileges handed out when the tables were created, then grant only
-- the columns each action needs.
--
-- `anon` gets nothing. A visitor with no session cannot read a slot, let alone
-- book one; the Schedule page shows them the course dates and a sign-in line.

revoke all on public.office_hours         from anon, authenticated;
revoke all on public.office_hour_bookings from anon, authenticated;

grant select on public.office_hours to authenticated;
grant insert (tutor_name, starts_at, minutes, location) on public.office_hours to authenticated;
grant update (tutor_name, starts_at, minutes, location) on public.office_hours to authenticated;
grant delete on public.office_hours to authenticated;

grant select on public.office_hour_bookings to authenticated;
grant insert (slot_id, student_name, note) on public.office_hour_bookings to authenticated;
grant delete on public.office_hour_bookings to authenticated;
