-- ============================================================
-- PAID TUTORING: TUTORS, WEEKLY HOURS, BOOKINGS, AND A LEDGER
-- ============================================================
--
-- STATUS.md, Owner brief 23 Oct, T1 and T2. Owner decisions of 2026-10-23:
--
--   - an admin brings a tutor in by email;
--   - a tutor paints weekly hours and adds time off;
--   - a student books one specific open hour and answers a short questionnaire
--     that only the booked tutor and staff can read;
--   - the tutor is paid per completed session from a ledger the owner pays by
--     hand and marks paid (no money moves through the site);
--   - $25 an hour, $30 an hour once a tutor has 6 months with Blueberry, good
--     ratings, a minimum number of lessons and referrals. The numbers are
--     admin-editable (tutor_pay_rules).
--
-- Sits beside office hours (20261007120000_office_hours.sql), which stay free
-- and unchanged. Every table here is prefixed `tutor_` or is `tutors`.
--
-- Who may do what, in one place:
--
--   signed out (anon)      nothing at all
--   any signed-in student  see open hours (through tutor_open_slots, which
--                          never says who booked); book, cancel and rate their
--                          own sessions (rpcs only); read their own bookings
--   a tutor                edit their own hours and time off; read their own
--                          bookings, the questionnaires on them, their ratings,
--                          referrals and ledger; mark their sessions done
--   staff (is_staff())     all of the above for every tutor, plus invite
--                          tutors, edit the pay benchmarks and mark ledger rows
--                          paid
--
-- A tutor is a row in `tutors`, keyed by email the way `staff_roster` is, not a
-- new value of profiles.role: every existing role check stays as it is.
--
-- The pay rule is written once, in tutor_rate_basis below. The browser has a
-- copy for tests and display (src/lib/tutoring/rules.ts), and never sends a
-- rate: the ledger is written by a trigger.

-- The `=` half of the double-booking guard (uuid inside a gist index) needs
-- btree_gist. Supabase ships it; this only switches it on.
create extension if not exists btree_gist with schema extensions;


-- ------------------------------------------------------------
-- 1. Tutors
-- ------------------------------------------------------------
--
-- `user_id` is filled in by triggers (section 2) once somebody with this email
-- has an account, so an invite can go out before the tutor ever signs up.
-- `started_at` is tenure for the pay rule; an admin may backdate it for a tutor
-- who taught with Blueberry before the site tracked it. There is no delete: a
-- tutor who leaves is deactivated, so their ledger history keeps its tutor.

create table public.tutors (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique check (email = lower(trim(email)) and email like '%@%'),
  user_id       uuid unique references auth.users (id) on delete set null,
  display_name  text not null check (char_length(display_name) between 1 and 80),
  started_at    timestamptz not null default now(),
  timezone      text not null default 'America/New_York',
  active        boolean not null default true,
  onboarded_at  timestamptz,
  invited_by    uuid default auth.uid(),
  invited_at    timestamptz not null default now()
);

alter table public.tutors enable row level security;

-- `stable` so a policy calls it once per statement. `security definer` so a
-- policy on a tutor_ table can ask "is this caller a tutor" without needing a
-- select grant on tutors that every student would then also have.
create function public.current_tutor_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select t.id from public.tutors t
  where t.active and t.user_id = (select auth.uid());
$$;

create function public.is_tutor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_tutor_id() is not null;
$$;

revoke execute on function public.current_tutor_id() from public, anon;
revoke execute on function public.is_tutor() from public, anon;
grant execute on function public.current_tutor_id() to authenticated;
grant execute on function public.is_tutor() to authenticated;

create policy "tutors_select_staff_or_self"
  on public.tutors for select
  to authenticated
  using ((select public.is_staff()) or user_id = (select auth.uid()));

create policy "tutors_insert_staff"
  on public.tutors for insert
  to authenticated
  with check ((select public.is_staff()));

create policy "tutors_update_staff"
  on public.tutors for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));


-- ------------------------------------------------------------
-- 2. Linking a tutor row to an account, without touching handle_new_user
-- ------------------------------------------------------------
--
-- Both orders work, as with the roster:
--
--   invite first, then sign up  ->  profiles_link_tutor fills user_id
--   sign up first, then invite  ->  tutors_before_write fills user_id
--
-- The same trigger also refuses a time zone Postgres does not know, because one
-- bad zone would make tutor_open_slots fail for every student.

create function public.tutors_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.email := lower(trim(new.email));
  if not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = new.timezone) then
    raise exception 'Unknown time zone: %', new.timezone;
  end if;
  if tg_op = 'INSERT' or new.email is distinct from old.email then
    select p.id into new.user_id
    from public.profiles p
    where lower(p.email) = new.email
    limit 1;
  end if;
  return new;
end;
$$;

revoke execute on function public.tutors_before_write() from public, anon, authenticated;

create trigger tutors_before_write
  before insert or update of email, timezone on public.tutors
  for each row execute function public.tutors_before_write();

create function public.profiles_link_tutor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null then
    update public.tutors t
    set user_id = new.id
    where t.email = lower(trim(new.email))
      and t.user_id is null;
  end if;
  return new;
end;
$$;

revoke execute on function public.profiles_link_tutor() from public, anon, authenticated;

create trigger profiles_link_tutor
  after insert or update of email on public.profiles
  for each row execute function public.profiles_link_tutor();

-- A tutor edits their own name and zone, and says they finished the walk-through.
-- One rpc instead of a column grant, because the update grant on tutors also
-- covers started_at and active, which only staff may change.
create function public.tutor_update_me(p_display_name text, p_timezone text, p_onboarded boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := public.current_tutor_id();
begin
  if me is null then
    raise exception 'You are not set up as a tutor yet.' using errcode = '42501';
  end if;
  update public.tutors t
  set display_name = coalesce(nullif(trim(p_display_name), ''), t.display_name),
      timezone     = coalesce(nullif(trim(p_timezone), ''), t.timezone),
      onboarded_at = case when p_onboarded then coalesce(t.onboarded_at, now()) else t.onboarded_at end
  where t.id = me;
end;
$$;


-- ------------------------------------------------------------
-- 3. The pay benchmarks (one row, admin-editable)
-- ------------------------------------------------------------
--
-- The defaults are the owner's "easy benchmarks" of 2026-10-23. A single row,
-- forced by a boolean primary key that can only be true.

create table public.tutor_pay_rules (
  id                 boolean primary key default true check (id),
  base_rate_cents    integer not null default 2500 check (base_rate_cents > 0),
  raised_rate_cents  integer not null default 3000 check (raised_rate_cents > 0),
  min_months         integer not null default 6 check (min_months >= 0),
  min_avg_rating     numeric(3,2) not null default 4.50 check (min_avg_rating between 1 and 5),
  min_ratings        integer not null default 5 check (min_ratings >= 0),
  min_lessons        integer not null default 20 check (min_lessons >= 0),
  min_referrals      integer not null default 2 check (min_referrals >= 0),
  updated_at         timestamptz not null default now(),
  updated_by         uuid,
  check (raised_rate_cents >= base_rate_cents)
);

insert into public.tutor_pay_rules (id) values (true);

alter table public.tutor_pay_rules enable row level security;

create policy "tutor_pay_rules_select_staff_or_tutor"
  on public.tutor_pay_rules for select
  to authenticated
  using ((select public.is_staff()) or (select public.is_tutor()));

create policy "tutor_pay_rules_update_staff"
  on public.tutor_pay_rules for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create function public.tutor_stamp_updated()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

revoke execute on function public.tutor_stamp_updated() from public, anon, authenticated;

create trigger tutor_pay_rules_stamp
  before update on public.tutor_pay_rules
  for each row execute function public.tutor_stamp_updated();


-- ------------------------------------------------------------
-- 4. Weekly hours and time off
-- ------------------------------------------------------------
--
-- Hours are wall-clock times in the tutor's own zone (tutors.timezone), so
-- "Mondays 2 to 6" stays 2 to 6 across a daylight-saving change. weekday 0 is
-- Sunday, the same as Postgres's extract(dow) and JavaScript's getDay(). Whole
-- hours only, because a session is one hour.

create table public.tutor_availability (
  id            uuid primary key default gen_random_uuid(),
  tutor_id      uuid not null default public.current_tutor_id() references public.tutors (id) on delete cascade,
  weekday       smallint not null check (weekday between 0 and 6),
  start_minute  integer not null check (start_minute between 0 and 1439),
  end_minute    integer not null,
  check (
    end_minute > start_minute
    and end_minute <= 1440
    and start_minute % 60 = 0
    and (end_minute - start_minute) % 60 = 0
  ),
  unique (tutor_id, weekday, start_minute)
);

alter table public.tutor_availability enable row level security;

create policy "tutor_availability_select_own_or_staff"
  on public.tutor_availability for select
  to authenticated
  using (tutor_id = (select public.current_tutor_id()) or (select public.is_staff()));

create policy "tutor_availability_insert_own"
  on public.tutor_availability for insert
  to authenticated
  with check (tutor_id = (select public.current_tutor_id()));

create policy "tutor_availability_update_own"
  on public.tutor_availability for update
  to authenticated
  using (tutor_id = (select public.current_tutor_id()))
  with check (tutor_id = (select public.current_tutor_id()));

create policy "tutor_availability_delete_own"
  on public.tutor_availability for delete
  to authenticated
  using (tutor_id = (select public.current_tutor_id()));

-- Blocked windows: a week away, a dentist appointment. Real instants, because
-- time off is a particular afternoon, not a weekly pattern.
create table public.tutor_availability_exceptions (
  id         uuid primary key default gen_random_uuid(),
  tutor_id   uuid not null default public.current_tutor_id() references public.tutors (id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text check (char_length(reason) <= 200),
  check (ends_at > starts_at)
);

alter table public.tutor_availability_exceptions enable row level security;

create policy "tutor_exceptions_select_own_or_staff"
  on public.tutor_availability_exceptions for select
  to authenticated
  using (tutor_id = (select public.current_tutor_id()) or (select public.is_staff()));

create policy "tutor_exceptions_insert_own"
  on public.tutor_availability_exceptions for insert
  to authenticated
  with check (tutor_id = (select public.current_tutor_id()));

create policy "tutor_exceptions_update_own"
  on public.tutor_availability_exceptions for update
  to authenticated
  using (tutor_id = (select public.current_tutor_id()))
  with check (tutor_id = (select public.current_tutor_id()));

create policy "tutor_exceptions_delete_own"
  on public.tutor_availability_exceptions for delete
  to authenticated
  using (tutor_id = (select public.current_tutor_id()));

-- Saving the week's hours replaces them in one transaction, so a failed save
-- never leaves a tutor with no hours at all. Security invoker: the policies
-- above already say a tutor may only touch their own rows.
create function public.tutor_set_availability(p_rules jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  me uuid := public.current_tutor_id();
begin
  if me is null then
    raise exception 'You are not set up as a tutor yet.' using errcode = '42501';
  end if;
  delete from public.tutor_availability a where a.tutor_id = me;
  -- tutor_id is left to its default (current_tutor_id()): the caller has no
  -- insert grant on that column, which is the point.
  insert into public.tutor_availability (weekday, start_minute, end_minute)
  select r.weekday, r.start_minute, r.end_minute
  from jsonb_to_recordset(coalesce(p_rules, '[]'::jsonb))
    as r(weekday smallint, start_minute integer, end_minute integer);
end;
$$;


-- ------------------------------------------------------------
-- 5. Bookings, and the double-booking guard
-- ------------------------------------------------------------
--
-- THE GUARD is the exclusion constraint: no two live bookings for one tutor may
-- overlap in time. Ranges are half-open ('[)'), so 10:00-11:00 and 11:00-12:00
-- are both allowed. A cancelled booking does not count, so its hour opens
-- again. Two students pressing Confirm at the same moment get one booking and
-- one SQLSTATE 23P01, decided by the index, not by whose browser looked first.
--
-- Students hold no write grant here: every write goes through the rpcs in
-- section 9, which check the hour is one the tutor offers.

create table public.tutor_bookings (
  id            uuid primary key default gen_random_uuid(),
  tutor_id      uuid not null references public.tutors (id),
  student_id    uuid not null references auth.users (id) on delete cascade,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  during        tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  status        text not null default 'booked' check (status in ('booked', 'cancelled', 'completed', 'no_show')),
  created_at    timestamptz not null default now(),
  cancelled_at  timestamptz,
  completed_at  timestamptz,
  completed_by  uuid,
  check (ends_at > starts_at),
  constraint tutor_bookings_no_overlap
    exclude using gist (tutor_id with =, during with &&) where (status <> 'cancelled')
);

create index tutor_bookings_student_idx on public.tutor_bookings (student_id);

alter table public.tutor_bookings enable row level security;

create policy "tutor_bookings_select_party_or_staff"
  on public.tutor_bookings for select
  to authenticated
  using (
    student_id = (select auth.uid())
    or tutor_id = (select public.current_tutor_id())
    or (select public.is_staff())
  );

-- The questionnaire. The booked tutor and staff read it. The student who wrote
-- it cannot read it back: the brief says only the tutor and admins, and this
-- follows it strictly (the booking sheet shows the answers on its confirmation
-- card from what the student just typed, not from this table).
create table public.tutor_booking_answers (
  booking_id       uuid primary key references public.tutor_bookings (id) on delete cascade,
  course           text not null check (char_length(course) between 1 and 80),
  stuck_on         text not null check (char_length(stuck_on) between 1 and 1000),
  exam_date        date,
  preferred_style  text not null check (preferred_style in ('walk_me_through', 'practice_problems', 'quick_questions', 'mix'))
);

alter table public.tutor_booking_answers enable row level security;

create policy "tutor_answers_select_tutor_or_staff"
  on public.tutor_booking_answers for select
  to authenticated
  using (
    (select public.is_staff())
    or exists (
      select 1 from public.tutor_bookings b
      where b.id = booking_id and b.tutor_id = (select public.current_tutor_id())
    )
  );


-- ------------------------------------------------------------
-- 6. Ratings and referrals
-- ------------------------------------------------------------

create table public.tutor_ratings (
  booking_id  uuid primary key references public.tutor_bookings (id) on delete cascade,
  tutor_id    uuid not null references public.tutors (id),
  student_id  uuid not null references auth.users (id) on delete cascade,
  stars       smallint not null check (stars between 1 and 5),
  comment     text check (char_length(comment) <= 500),
  created_at  timestamptz not null default now()
);

create index tutor_ratings_tutor_idx on public.tutor_ratings (tutor_id);

alter table public.tutor_ratings enable row level security;

create policy "tutor_ratings_select_party_or_staff"
  on public.tutor_ratings for select
  to authenticated
  using (
    student_id = (select auth.uid())
    or tutor_id = (select public.current_tutor_id())
    or (select public.is_staff())
  );

-- A referral is a student's address a tutor brought in. It only counts toward
-- the raise once that student, new to tutoring when referred, has completed a
-- session after it (tutor_stats).
create table public.tutor_referrals (
  id              uuid primary key default gen_random_uuid(),
  tutor_id        uuid not null default public.current_tutor_id() references public.tutors (id),
  referred_email  text not null unique check (referred_email = lower(trim(referred_email)) and referred_email like '%@%'),
  created_at      timestamptz not null default now()
);

alter table public.tutor_referrals enable row level security;

create policy "tutor_referrals_select_own_or_staff"
  on public.tutor_referrals for select
  to authenticated
  using (tutor_id = (select public.current_tutor_id()) or (select public.is_staff()));

create policy "tutor_referrals_insert_own"
  on public.tutor_referrals for insert
  to authenticated
  with check (tutor_id = (select public.current_tutor_id()));

create policy "tutor_referrals_delete_own_or_staff"
  on public.tutor_referrals for delete
  to authenticated
  using (tutor_id = (select public.current_tutor_id()) or (select public.is_staff()));


-- ------------------------------------------------------------
-- 7. The ledger
-- ------------------------------------------------------------
--
-- One row per completed session, written only by the trigger in section 10.
-- The rate is chosen there from the tutor's record at the session's end; the
-- browser never sends it, and nobody holds an insert grant. Staff mark a row
-- paid (paid_at, paid_note); the trigger below stamps who did.
--
-- booking_id is `on delete set null` so pay history survives a deleted account.

create table public.tutor_ledger (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid unique references public.tutor_bookings (id) on delete set null,
  tutor_id         uuid not null references public.tutors (id),
  session_ends_at  timestamptz not null,
  minutes          integer not null check (minutes > 0),
  hours            numeric(5,2) generated always as (minutes / 60.0) stored,
  rate_cents       integer not null check (rate_cents > 0),
  amount_cents     integer not null check (amount_cents >= 0),
  rate_basis       jsonb not null,
  created_at       timestamptz not null default now(),
  paid_at          timestamptz,
  paid_by          uuid,
  paid_note        text check (char_length(paid_note) <= 200)
);

create index tutor_ledger_tutor_idx on public.tutor_ledger (tutor_id);

alter table public.tutor_ledger enable row level security;

create policy "tutor_ledger_select_own_or_staff"
  on public.tutor_ledger for select
  to authenticated
  using (tutor_id = (select public.current_tutor_id()) or (select public.is_staff()));

create policy "tutor_ledger_update_staff"
  on public.tutor_ledger for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create function public.tutor_ledger_stamp_paid()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.paid_at is distinct from old.paid_at then
    new.paid_by := case when new.paid_at is null then null else auth.uid() end;
  end if;
  return new;
end;
$$;

revoke execute on function public.tutor_ledger_stamp_paid() from public, anon, authenticated;

create trigger tutor_ledger_stamp_paid
  before update on public.tutor_ledger
  for each row execute function public.tutor_ledger_stamp_paid();


-- ------------------------------------------------------------
-- 8. The pay rule
-- ------------------------------------------------------------
--
-- Every function takes the instant to judge at (p_at), so a test gets the same
-- answer on any day. Mirrored in src/lib/tutoring/rules.ts; the tests in
-- src/test/tutoringRate.test.ts and supabase/rls-tests/tutoring.sql use the same
-- model tutors (src/lib/tutoring/modelCases.ts, supabase/seed.sql).
--
--   tenure     started_at is on or before p_at minus min_months, in UTC
--              (explicit, so the session's TimeZone cannot move it; Postgres
--              clamps the day at a month's end: Aug 31 minus 6 months is Feb 28)
--   rating     at least min_ratings ratings made before p_at, and their sum at
--              least min_avg_rating times their count (sums, never a rounded
--              average, so 4.45 cannot round its way past 4.5)
--   lessons    completed sessions that ended before p_at
--   referrals  referred addresses whose account completed a session that ended
--              after the referral was written and before p_at, and that had
--              booked no tutoring at all before the referral (so typing in a
--              student someone already teaches credits nothing)
--
-- All four: raised_rate_cents. Otherwise base_rate_cents.

create function public.tutor_stats(
  p_tutor uuid,
  p_at timestamptz,
  out months_ok boolean,
  out rating_sum bigint,
  out rating_count integer,
  out lessons integer,
  out referrals integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.started_at <= ((p_at at time zone 'UTC') - make_interval(months => r.min_months)) at time zone 'UTC',
    (select coalesce(sum(x.stars), 0) from public.tutor_ratings x
      where x.tutor_id = t.id and x.created_at < p_at),
    (select count(*)::integer from public.tutor_ratings x
      where x.tutor_id = t.id and x.created_at < p_at),
    (select count(*)::integer from public.tutor_bookings b
      where b.tutor_id = t.id and b.status = 'completed' and b.ends_at < p_at),
    (select count(*)::integer from public.tutor_referrals f
      where f.tutor_id = t.id
        and f.created_at < p_at
        and exists (
          select 1 from public.profiles p
          join public.tutor_bookings b on b.student_id = p.id
          where lower(p.email) = f.referred_email
            and b.status = 'completed'
            and b.ends_at > f.created_at
            and b.ends_at < p_at
            -- New to tutoring when referred: no booking of any status, with
            -- any tutor, made before the referral row.
            and not exists (
              select 1 from public.tutor_bookings b0
              where b0.student_id = p.id and b0.created_at < f.created_at
            )
        ))
  from public.tutors t
  cross join public.tutor_pay_rules r
  where t.id = p_tutor;
$$;

-- The whole judgement as one jsonb: the stats, each check, the rate, and the
-- rules it used. The ledger stores it per row, so "why was this $25" has an
-- answer long after the benchmarks change.
create function public.tutor_rate_basis(p_tutor uuid, p_at timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s record;
  r public.tutor_pay_rules;
  rating_ok boolean;
  qualified boolean;
begin
  select * into r from public.tutor_pay_rules where id;
  select * into s from public.tutor_stats(p_tutor, p_at);
  rating_ok := s.rating_count >= r.min_ratings
               and s.rating_sum >= r.min_avg_rating * s.rating_count;
  qualified := coalesce(s.months_ok, false)
               and rating_ok
               and s.lessons >= r.min_lessons
               and s.referrals >= r.min_referrals;
  return jsonb_build_object(
    'at',            p_at,
    'months_ok',     coalesce(s.months_ok, false),
    'avg_rating',    case when s.rating_count > 0 then round(s.rating_sum::numeric / s.rating_count, 2) end,
    'rating_sum',    s.rating_sum,
    'rating_count',  s.rating_count,
    'rating_ok',     rating_ok,
    'lessons',       s.lessons,
    'lessons_ok',    s.lessons >= r.min_lessons,
    'referrals',     s.referrals,
    'referrals_ok',  s.referrals >= r.min_referrals,
    'qualified',     qualified,
    'rate_cents',    case when qualified then r.raised_rate_cents else r.base_rate_cents end,
    'rules', jsonb_build_object(
      'base_rate_cents',   r.base_rate_cents,
      'raised_rate_cents', r.raised_rate_cents,
      'min_months',        r.min_months,
      'min_avg_rating',    r.min_avg_rating,
      'min_ratings',       r.min_ratings,
      'min_lessons',       r.min_lessons,
      'min_referrals',     r.min_referrals
    )
  );
end;
$$;

create function public.tutor_rate_cents(p_tutor uuid, p_at timestamptz)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (public.tutor_rate_basis(p_tutor, p_at) ->> 'rate_cents')::integer;
$$;

-- Nobody calls these three directly from the API: they read every tutor's
-- record. tutor_rate_status below is the door, and it checks who is asking.
revoke execute on function public.tutor_stats(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.tutor_rate_basis(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.tutor_rate_cents(uuid, timestamptz) from public, anon, authenticated;

-- Today's standing for one tutor, plus what is owed. Staff, or that tutor.
create function public.tutor_rate_status(p_tutor uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_staff() or p_tutor = public.current_tutor_id()) then
    raise exception 'Only staff or that tutor can see this.' using errcode = '42501';
  end if;
  return public.tutor_rate_basis(p_tutor, now()) || jsonb_build_object(
    'started_at',   (select t.started_at from public.tutors t where t.id = p_tutor),
    'unpaid_cents', (select coalesce(sum(l.amount_cents), 0) from public.tutor_ledger l
                      where l.tutor_id = p_tutor and l.paid_at is null),
    'unpaid_count', (select count(*) from public.tutor_ledger l
                      where l.tutor_id = p_tutor and l.paid_at is null)
  );
end;
$$;


-- ------------------------------------------------------------
-- 9. The rpcs a page calls
-- ------------------------------------------------------------
--
-- All security definer with search_path = '', execute for signed-in callers
-- only (granted in section 11). Each refusal is a sentence the page can show
-- as it is (SQLSTATE P0001), or 42501 when the caller is the problem.

create function public.book_tutor_slot(
  p_tutor uuid,
  p_starts timestamptz,
  p_course text,
  p_stuck_on text,
  p_exam_date date,
  p_style text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid       uuid := auth.uid();
  t         public.tutors;
  local_ts  timestamp;
  local_min integer;
  booking   uuid;
begin
  if uid is null then
    raise exception 'Sign in to book a tutor.' using errcode = '42501';
  end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Sign in with your Blueberry account to book a tutor.' using errcode = '42501';
  end if;

  select * into t from public.tutors x where x.id = p_tutor;
  if not found or not t.active then
    raise exception 'That tutor is not taking bookings right now.';
  end if;
  if t.user_id = uid then
    raise exception 'You cannot book your own hours.';
  end if;
  if p_starts <= now() then
    raise exception 'That time has already started. Pick a later one.';
  end if;
  if p_starts > now() + interval '60 days' then
    raise exception 'Bookings open 60 days ahead. Pick a sooner time.';
  end if;

  -- The tutor's own wall clock, which is what their weekly hours are written in.
  local_ts := p_starts at time zone t.timezone;
  if local_ts <> date_trunc('hour', local_ts) then
    raise exception 'Sessions start on the hour.';
  end if;
  local_min := extract(hour from local_ts)::integer * 60;

  if not exists (
    select 1 from public.tutor_availability a
    where a.tutor_id = t.id
      and a.weekday = extract(dow from local_ts)::smallint
      and a.start_minute <= local_min
      and local_min + 60 <= a.end_minute
  ) then
    raise exception 'That time is not in the tutor''s hours.';
  end if;

  if exists (
    select 1 from public.tutor_availability_exceptions e
    where e.tutor_id = t.id
      and tstzrange(e.starts_at, e.ends_at, '[)') && tstzrange(p_starts, p_starts + interval '60 minutes', '[)')
  ) then
    raise exception 'The tutor is away then. Pick another time.';
  end if;

  -- A clash with a live booking raises 23P01 from tutor_bookings_no_overlap.
  insert into public.tutor_bookings (tutor_id, student_id, starts_at, ends_at)
  values (t.id, uid, p_starts, p_starts + interval '60 minutes')
  returning id into booking;

  insert into public.tutor_booking_answers (booking_id, course, stuck_on, exam_date, preferred_style)
  values (booking, trim(p_course), trim(p_stuck_on), p_exam_date, p_style);

  return booking;
end;
$$;

-- Every open hour between p_from and p_to (at most 31 days), for every active
-- tutor. Each tutor's weekly hours are expanded day by day in their own zone,
-- then time off, live bookings and past hours are taken away. It says that an
-- hour is gone, never who took it. Mirrored in src/lib/tutoring/slots.ts.
create function public.tutor_open_slots(p_from timestamptz, p_to timestamptz)
returns table (tutor_id uuid, tutor_name text, starts_at timestamptz, ends_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  lo timestamptz := greatest(p_from, now());
  hi timestamptz := least(p_to, p_from + interval '31 days', now() + interval '60 days');
begin
  if auth.uid() is null then
    raise exception 'Sign in to see open times.' using errcode = '42501';
  end if;
  return query
  with days as (
    select t.id as tid, t.display_name as tname, t.timezone as tz, d::date as day
    from public.tutors t
    cross join lateral generate_series(
      (lo at time zone t.timezone)::date - 1,
      (hi at time zone t.timezone)::date,
      interval '1 day'
    ) as d
    where t.active and t.user_id is distinct from auth.uid()
  ),
  cand as (
    select distinct days.tid, days.tname,
      (days.day + make_interval(mins => m)) at time zone days.tz as s
    from days
    join public.tutor_availability a
      on a.tutor_id = days.tid and a.weekday = extract(dow from days.day)::smallint
    cross join lateral generate_series(a.start_minute, a.end_minute - 60, 60) as m
  )
  select c.tid, c.tname, c.s, c.s + interval '60 minutes'
  from cand c
  where c.s >= lo and c.s < hi and c.s > now()
    and not exists (
      select 1 from public.tutor_availability_exceptions e
      where e.tutor_id = c.tid
        and tstzrange(e.starts_at, e.ends_at, '[)') && tstzrange(c.s, c.s + interval '60 minutes', '[)')
    )
    and not exists (
      select 1 from public.tutor_bookings b
      where b.tutor_id = c.tid
        and b.status <> 'cancelled'
        and b.during && tstzrange(c.s, c.s + interval '60 minutes', '[)')
    )
  order by c.s, c.tname;
end;
$$;

create function public.cancel_tutor_booking(p_booking uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.tutor_bookings;
begin
  select * into b from public.tutor_bookings x where x.id = p_booking;
  if not found or not (
    b.student_id = auth.uid()
    or b.tutor_id = public.current_tutor_id()
    or public.is_staff()
  ) then
    raise exception 'That booking is not yours to cancel.' using errcode = '42501';
  end if;
  if b.status <> 'booked' then
    raise exception 'That session is already %.', replace(b.status, '_', '-');
  end if;
  if b.starts_at <= now() then
    raise exception 'That session has started, so it cannot be cancelled here.';
  end if;
  update public.tutor_bookings x
  set status = 'cancelled', cancelled_at = now()
  where x.id = p_booking;
end;
$$;

-- The tutor (or staff) closes a session once it has ended. 'completed' writes a
-- ledger row (section 10); 'no_show' does not.
create function public.complete_tutor_session(p_booking uuid, p_outcome text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.tutor_bookings;
begin
  if p_outcome not in ('completed', 'no_show') then
    raise exception 'Mark a session done or a no-show.';
  end if;
  select * into b from public.tutor_bookings x where x.id = p_booking;
  if not found or not (b.tutor_id = public.current_tutor_id() or public.is_staff()) then
    raise exception 'Only that session''s tutor can close it.' using errcode = '42501';
  end if;
  if b.status <> 'booked' then
    raise exception 'That session is already %.', replace(b.status, '_', '-');
  end if;
  if now() < b.ends_at then
    raise exception 'A session can be closed once it has ended.';
  end if;
  update public.tutor_bookings x
  set status = p_outcome, completed_at = now(), completed_by = auth.uid()
  where x.id = p_booking;
end;
$$;

create function public.rate_tutor_session(p_booking uuid, p_stars integer, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.tutor_bookings;
begin
  select * into b from public.tutor_bookings x where x.id = p_booking;
  if not found or b.student_id is distinct from auth.uid() then
    raise exception 'Only the student in that session can rate it.' using errcode = '42501';
  end if;
  if b.status <> 'completed' then
    raise exception 'You can rate a session once your tutor marks it done.';
  end if;
  insert into public.tutor_ratings (booking_id, tutor_id, student_id, stars, comment)
  values (b.id, b.tutor_id, b.student_id, p_stars, nullif(trim(p_comment), ''))
  on conflict (booking_id) do update
    set stars = excluded.stars, comment = excluded.comment;
end;
$$;

-- A student's own sessions, with the tutor's name (students cannot read tutors)
-- and their own rating if they gave one.
create function public.my_tutor_bookings()
returns table (id uuid, tutor_id uuid, tutor_name text, starts_at timestamptz, ends_at timestamptz, status text, stars smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.tutor_id, t.display_name, b.starts_at, b.ends_at, b.status, r.stars
  from public.tutor_bookings b
  join public.tutors t on t.id = b.tutor_id
  left join public.tutor_ratings r on r.booking_id = b.id
  where b.student_id = (select auth.uid())
  order by b.starts_at desc;
$$;

-- A tutor's own sessions with the student's name and the questionnaire. Tutors
-- cannot read profiles, so the name comes through here and nowhere else.
create function public.tutor_sessions()
returns table (
  id uuid, starts_at timestamptz, ends_at timestamptz, status text,
  student_name text, student_email text,
  course text, stuck_on text, exam_date date, preferred_style text
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.starts_at, b.ends_at, b.status,
    coalesce(nullif(p.full_name, ''), p.email), p.email,
    a.course, a.stuck_on, a.exam_date, a.preferred_style
  from public.tutor_bookings b
  left join public.profiles p on p.id = b.student_id
  left join public.tutor_booking_answers a on a.booking_id = b.id
  where b.tutor_id = public.current_tutor_id()
  order by b.starts_at;
$$;


-- ------------------------------------------------------------
-- 10. Completed session -> ledger row
-- ------------------------------------------------------------
--
-- Fires on INSERT too, so historical sessions loaded already completed (the
-- local seed) get their rows the same way. The rate is judged at the session's
-- end, from the record before it: the session being paid for is not one of
-- its own 20 lessons.

create function public.tutor_bookings_to_ledger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  basis   jsonb;
  rate    integer;
  mins    integer;
begin
  if new.status <> 'completed' then
    return new;
  end if;
  if exists (select 1 from public.tutor_ledger l where l.booking_id = new.id) then
    return new;
  end if;
  basis := public.tutor_rate_basis(new.tutor_id, new.ends_at);
  rate  := (basis ->> 'rate_cents')::integer;
  mins  := round(extract(epoch from (new.ends_at - new.starts_at)) / 60)::integer;
  insert into public.tutor_ledger (booking_id, tutor_id, session_ends_at, minutes, rate_cents, amount_cents, rate_basis)
  values (new.id, new.tutor_id, new.ends_at, mins, rate, round(rate * mins / 60.0)::integer, basis);
  return new;
end;
$$;

revoke execute on function public.tutor_bookings_to_ledger() from public, anon, authenticated;

create trigger tutor_bookings_to_ledger
  after insert or update of status on public.tutor_bookings
  for each row execute function public.tutor_bookings_to_ledger();


-- ------------------------------------------------------------
-- 11. Grants
-- ------------------------------------------------------------
--
-- Office hours' rule: revoke whatever default privileges handed out, then grant
-- only the columns each action needs. A grant with no column list covers every
-- column, which is how a student once set their own role to owner. `anon` gets
-- nothing on any table or rpc here.

revoke all on public.tutors                        from anon, authenticated;
revoke all on public.tutor_pay_rules               from anon, authenticated;
revoke all on public.tutor_availability            from anon, authenticated;
revoke all on public.tutor_availability_exceptions from anon, authenticated;
revoke all on public.tutor_bookings                from anon, authenticated;
revoke all on public.tutor_booking_answers         from anon, authenticated;
revoke all on public.tutor_ratings                 from anon, authenticated;
revoke all on public.tutor_referrals               from anon, authenticated;
revoke all on public.tutor_ledger                  from anon, authenticated;

grant select on public.tutors to authenticated;
grant insert (email, display_name, started_at, timezone) on public.tutors to authenticated;
grant update (display_name, started_at, timezone, active) on public.tutors to authenticated;

grant select on public.tutor_pay_rules to authenticated;
grant update (base_rate_cents, raised_rate_cents, min_months, min_avg_rating, min_ratings, min_lessons, min_referrals)
  on public.tutor_pay_rules to authenticated;

grant select on public.tutor_availability to authenticated;
grant insert (weekday, start_minute, end_minute) on public.tutor_availability to authenticated;
grant update (weekday, start_minute, end_minute) on public.tutor_availability to authenticated;
grant delete on public.tutor_availability to authenticated;

grant select on public.tutor_availability_exceptions to authenticated;
grant insert (starts_at, ends_at, reason) on public.tutor_availability_exceptions to authenticated;
grant update (starts_at, ends_at, reason) on public.tutor_availability_exceptions to authenticated;
grant delete on public.tutor_availability_exceptions to authenticated;

grant select on public.tutor_bookings to authenticated;
grant select on public.tutor_booking_answers to authenticated;
grant select on public.tutor_ratings to authenticated;

grant select on public.tutor_referrals to authenticated;
grant insert (referred_email) on public.tutor_referrals to authenticated;
grant delete on public.tutor_referrals to authenticated;

grant select on public.tutor_ledger to authenticated;
grant update (paid_at, paid_note) on public.tutor_ledger to authenticated;

-- The rpcs. Functions are executable by PUBLIC by default, so revoke first.
revoke execute on function public.tutor_update_me(text, text, boolean) from public, anon;
revoke execute on function public.tutor_set_availability(jsonb) from public, anon;
revoke execute on function public.tutor_rate_status(uuid) from public, anon;
revoke execute on function public.book_tutor_slot(uuid, timestamptz, text, text, date, text) from public, anon;
revoke execute on function public.tutor_open_slots(timestamptz, timestamptz) from public, anon;
revoke execute on function public.cancel_tutor_booking(uuid) from public, anon;
revoke execute on function public.complete_tutor_session(uuid, text) from public, anon;
revoke execute on function public.rate_tutor_session(uuid, integer, text) from public, anon;
revoke execute on function public.my_tutor_bookings() from public, anon;
revoke execute on function public.tutor_sessions() from public, anon;

grant execute on function public.tutor_update_me(text, text, boolean) to authenticated;
grant execute on function public.tutor_set_availability(jsonb) to authenticated;
grant execute on function public.tutor_rate_status(uuid) to authenticated;
grant execute on function public.book_tutor_slot(uuid, timestamptz, text, text, date, text) to authenticated;
grant execute on function public.tutor_open_slots(timestamptz, timestamptz) to authenticated;
grant execute on function public.cancel_tutor_booking(uuid) to authenticated;
grant execute on function public.complete_tutor_session(uuid, text) to authenticated;
grant execute on function public.rate_tutor_session(uuid, integer, text) to authenticated;
grant execute on function public.my_tutor_bookings() to authenticated;
grant execute on function public.tutor_sessions() to authenticated;
