-- ============================================================
-- RLS TEST: paid tutoring
-- (migration 20261024120000_tutoring.sql, fixtures from supabase/seed.sql)
-- ============================================================
--
-- Proves, on the database itself: the pay rule's edges give the same cents as
-- src/lib/tutoring/modelCases.ts; the double-booking guard is the constraint,
-- not only the rpc; each refusal holds; the questionnaire is read only by the
-- booked tutor and staff; nobody but staff touches money columns; and closing
-- a session writes exactly one ledger row.
--
-- Same harness as office_hours.sql: plain SQL, one transaction rolled back,
-- every check raises on failure. Needs the seed, so run it right after a reset
-- on the LOCAL stack (never against the live project):
--
--   npx supabase db reset
--   docker exec -i supabase_db_grignard-app-source psql -U postgres -v ON_ERROR_STOP=1 < supabase/rls-tests/tutoring.sql
--
-- It ends with the notice "tutoring RLS: all checks passed".
--
-- Seed ids are md5(email)::uuid. A caller is switched in with `set local role`
-- plus `request.jwt.claims`, as PostgREST does; ids pass between callers in
-- `test.*` settings.

begin;

-- The test tutor: the seed's new tutor, given every hour of every day inside
-- this transaction so any future hour is bookable. The slot is two days out,
-- on the hour (UTC hours are whole hours in New York too).
do $$
begin
  perform set_config('test.slot', (date_trunc('hour', now()) + interval '2 days')::text, true);
  perform set_config('test.tutor', (select id::text from public.tutors where email = 'tutor.new@test.local'), true);
  perform set_config('test.full', (select id::text from public.tutors where email = 'tutor.full@test.local'), true);
end $$;


-- ------------------------------------------------------------
-- 1. The pay rule at AT, one model tutor per edge
-- ------------------------------------------------------------
do $$
declare
  at constant timestamptz := '2026-11-02T17:00:00Z';
  rec record;
begin
  for rec in
    select * from (values
      ('tutor.full@test.local',         3000),
      ('tutor.months59@test.local',     2500),
      ('tutor.rating44@test.local',     2500),
      ('tutor.ratingcount4@test.local', 2500),
      ('tutor.lessons19@test.local',    2500),
      ('tutor.referrals1@test.local',   2500),
      ('tutor.new@test.local',          2500)
    ) v(email, cents)
  loop
    if public.tutor_rate_cents((select id from public.tutors where email = rec.email), at) <> rec.cents then
      raise exception 'FAIL 1: % should be % cents at AT', rec.email, rec.cents;
    end if;
  end loop;
  -- One second earlier the full tutor is a second short of 6 months.
  if public.tutor_rate_cents(current_setting('test.full')::uuid, at - interval '1 second') <> 2500 then
    raise exception 'FAIL 1: the full tutor qualified before 6 months';
  end if;
  -- The ledger shows the raise on the session after AT.
  if (select l.rate_cents from public.tutor_ledger l
      where l.tutor_id = current_setting('test.full')::uuid and l.session_ends_at = '2026-11-03T18:00:00Z') <> 3000 then
    raise exception 'FAIL 1: the full tutor''s next session was not priced 3000';
  end if;
  -- Admin-edited benchmarks move the line: 21 lessons needed, the full tutor drops.
  update public.tutor_pay_rules set min_lessons = 21;
  if public.tutor_rate_cents(current_setting('test.full')::uuid, at) <> 2500 then
    raise exception 'FAIL 1: raising min_lessons did not move the full tutor';
  end if;
  update public.tutor_pay_rules set min_lessons = 20;
  raise notice 'ok 1: every model tutor gets its expected rate at AT, and the rules move the line';
end $$;


-- ------------------------------------------------------------
-- 2. The tutor opens every hour (their own insert path)
-- ------------------------------------------------------------
-- Each caller's claims, built once. `set local` cannot take an expression, so
-- callers are switched in with set_config(..., true) below instead.
do $$
begin
  perform set_config('test.claims.tutor',
    jsonb_build_object('sub', md5('tutor.new@test.local')::uuid::text, 'email', 'tutor.new@test.local', 'role', 'authenticated')::text, true);
  perform set_config('test.claims.a',
    jsonb_build_object('sub', md5('student04@test.local')::uuid::text, 'email', 'student04@test.local', 'role', 'authenticated')::text, true);
  perform set_config('test.claims.b',
    jsonb_build_object('sub', md5('student05@test.local')::uuid::text, 'email', 'student05@test.local', 'role', 'authenticated')::text, true);
  perform set_config('test.claims.other_tutor',
    jsonb_build_object('sub', md5('tutor.full@test.local')::uuid::text, 'email', 'tutor.full@test.local', 'role', 'authenticated')::text, true);
  perform set_config('test.claims.admin',
    jsonb_build_object('sub', md5('admin@test.local')::uuid::text, 'email', 'admin@test.local', 'role', 'authenticated')::text, true);
end $$;

set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.claims.tutor'), true);

do $$
begin
  perform public.tutor_set_availability(
    (select jsonb_agg(jsonb_build_object('weekday', wd, 'start_minute', 0, 'end_minute', 1440))
     from generate_series(0, 6) wd));
  if (select count(*) from public.tutor_availability) <> 7 then
    raise exception 'FAIL 2: the tutor''s week was not saved as 7 rules';
  end if;
  insert into public.tutor_availability_exceptions (starts_at, ends_at, reason)
  values (current_setting('test.slot')::timestamptz + interval '1 day',
          current_setting('test.slot')::timestamptz + interval '1 day 3 hours', 'Dentist');
  begin
    insert into public.tutor_availability (tutor_id, weekday, start_minute, end_minute)
    values (current_setting('test.full')::uuid, 1, 0, 60);
    raise exception 'FAIL 2: a tutor wrote hours for another tutor';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok 2: a tutor saves their own week and time off, and cannot write another tutor''s';
end $$;

reset role;


-- ------------------------------------------------------------
-- 3. Double booking
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.claims.a'), true);

do $$
declare
  id uuid;
begin
  id := public.book_tutor_slot(current_setting('test.tutor')::uuid, current_setting('test.slot')::timestamptz,
                               'CHEM241', 'Aldol, step 2', null, 'walk_me_through');
  perform set_config('test.booking_a', id::text, true);
  if exists (select 1 from public.tutor_open_slots(now(), now() + interval '3 days') o
             where o.tutor_id = current_setting('test.tutor')::uuid and o.starts_at = current_setting('test.slot')::timestamptz) then
    raise exception 'FAIL 3: a booked hour is still listed as open';
  end if;
  raise notice 'ok 3: student A books an open hour, and it leaves the open list';
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.claims.b'), true);

do $$
begin
  begin
    perform public.book_tutor_slot(current_setting('test.tutor')::uuid, current_setting('test.slot')::timestamptz,
                                   'CHEM241', 'Same hour', null, 'mix');
    raise exception 'FAIL 4: the same hour was booked twice';
  exception when exclusion_violation then
    raise notice 'ok 4: student B booking the same hour gets 23P01';
  end;
end $$;

reset role;

-- As the database owner, past every policy: the constraint alone refuses an overlap.
do $$
begin
  begin
    insert into public.tutor_bookings (tutor_id, student_id, starts_at, ends_at)
    values (current_setting('test.tutor')::uuid, md5('student06@test.local')::uuid,
            current_setting('test.slot')::timestamptz + interval '30 minutes',
            current_setting('test.slot')::timestamptz + interval '90 minutes');
    raise exception 'FAIL 5: a direct insert overlapping a booking was accepted';
  exception when exclusion_violation then
    raise notice 'ok 5: the constraint itself refuses an overlapping insert (23P01)';
  end;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.claims.a'), true);

do $$
begin
  perform public.cancel_tutor_booking(current_setting('test.booking_a')::uuid);
  -- Back to back with the hour A just freed: allowed, the ranges are half-open.
  perform set_config('test.booking_a2',
    public.book_tutor_slot(current_setting('test.tutor')::uuid, current_setting('test.slot')::timestamptz + interval '1 hour',
                           'CHEM241', 'Next hour', null, 'mix')::text, true);
  raise notice 'ok 6: student A cancels, and books the next hour';
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.claims.b'), true);

do $$
begin
  perform set_config('test.booking_b',
    public.book_tutor_slot(current_setting('test.tutor')::uuid, current_setting('test.slot')::timestamptz,
                           'CHEM241', 'Grignard on esters', current_date + 9, 'practice_problems')::text, true);
  raise notice 'ok 7: after the cancel, student B books the freed hour, back to back with A';
end $$;


-- ------------------------------------------------------------
-- 4. Refusals
-- ------------------------------------------------------------
do $$
declare
  ny_3am timestamptz := ((now() at time zone 'America/New_York')::date + 3 + time '03:00') at time zone 'America/New_York';
begin
  begin
    perform public.book_tutor_slot(current_setting('test.full')::uuid, ny_3am, 'CHEM241', 'x', null, 'mix');
    raise exception 'FAIL 8: a booking outside the tutor''s hours was accepted';
  exception when raise_exception then
    if sqlerrm not like '%not in the tutor''s hours%' then raise exception 'FAIL 8: outside hours refused for the wrong reason: %', sqlerrm; end if;
  end;
  begin
    perform public.book_tutor_slot(current_setting('test.tutor')::uuid,
      current_setting('test.slot')::timestamptz + interval '1 day 1 hour', 'CHEM241', 'x', null, 'mix');
    raise exception 'FAIL 8: a booking inside time off was accepted';
  exception when raise_exception then
    if sqlerrm not like '%away%' then raise exception 'FAIL 8: time off refused for the wrong reason: %', sqlerrm; end if;
  end;
  begin
    perform public.book_tutor_slot(current_setting('test.tutor')::uuid,
      date_trunc('hour', now()) - interval '1 hour', 'CHEM241', 'x', null, 'mix');
    raise exception 'FAIL 8: a booking in the past was accepted';
  exception when raise_exception then
    if sqlerrm not like '%already started%' then raise exception 'FAIL 8: the past refused for the wrong reason: %', sqlerrm; end if;
  end;
  begin
    perform public.book_tutor_slot(current_setting('test.tutor')::uuid,
      current_setting('test.slot')::timestamptz + interval '5 hours 30 minutes', 'CHEM241', 'x', null, 'mix');
    raise exception 'FAIL 8: a booking off the hour was accepted';
  exception when raise_exception then
    if sqlerrm not like '%on the hour%' then raise exception 'FAIL 8: off the hour refused for the wrong reason: %', sqlerrm; end if;
  end;
  raise notice 'ok 8: outside hours, inside time off, in the past and off the hour are all refused';
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.claims.tutor'), true);

do $$
begin
  begin
    perform public.book_tutor_slot(current_setting('test.tutor')::uuid,
      current_setting('test.slot')::timestamptz + interval '6 hours', 'CHEM241', 'x', null, 'mix');
    raise exception 'FAIL 9: a tutor booked their own hours';
  exception when raise_exception then
    if sqlerrm not like '%your own hours%' then raise exception 'FAIL 9: refused for the wrong reason: %', sqlerrm; end if;
    raise notice 'ok 9: a tutor cannot book their own hours';
  end;
end $$;

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
begin
  begin
    perform public.book_tutor_slot(current_setting('test.tutor')::uuid,
      current_setting('test.slot')::timestamptz + interval '6 hours', 'CHEM241', 'x', null, 'mix');
    raise exception 'FAIL 10: anon booked a tutor';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.tutor_open_slots(now(), now() + interval '1 day');
    raise exception 'FAIL 10: anon listed open hours';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.cancel_tutor_booking(current_setting('test.booking_b')::uuid);
    raise exception 'FAIL 10: anon cancelled a booking';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.tutors;
    raise exception 'FAIL 10: anon read the tutors table';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok 10: anon can call no tutoring rpc and read no tutoring table';
end $$;

reset role;


-- ------------------------------------------------------------
-- 5. Who reads the questionnaire
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.claims.b'), true);

do $$
begin
  if exists (select 1 from public.tutor_booking_answers where booking_id = current_setting('test.booking_a2')::uuid) then
    raise exception 'FAIL 11: student B read student A''s questionnaire';
  end if;
  if exists (select 1 from public.tutor_bookings where id = current_setting('test.booking_a2')::uuid) then
    raise exception 'FAIL 11: student B read student A''s booking';
  end if;
  raise notice 'ok 11: student B cannot read A''s booking or answers';
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.claims.tutor'), true);

do $$
begin
  if (select stuck_on from public.tutor_booking_answers where booking_id = current_setting('test.booking_a2')::uuid) is distinct from 'Next hour' then
    raise exception 'FAIL 12: the booked tutor cannot read the questionnaire';
  end if;
  if not exists (select 1 from public.tutor_sessions() s where s.id = current_setting('test.booking_a2')::uuid and s.student_email = 'student04@test.local') then
    raise exception 'FAIL 12: tutor_sessions does not give the tutor the student and answers';
  end if;
  raise notice 'ok 12: the booked tutor reads the questionnaire and the student''s name';
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.claims.other_tutor'), true);

do $$
begin
  if exists (select 1 from public.tutor_booking_answers where booking_id = current_setting('test.booking_a2')::uuid) then
    raise exception 'FAIL 13: another tutor read the questionnaire';
  end if;
  begin
    perform public.tutor_rate_status(current_setting('test.tutor')::uuid);
    raise exception 'FAIL 13: a tutor read another tutor''s rate status';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok 13: another tutor cannot read the questionnaire or the rate status';
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.claims.admin'), true);

do $$
begin
  if not exists (select 1 from public.tutor_booking_answers where booking_id = current_setting('test.booking_a2')::uuid) then
    raise exception 'FAIL 14: the admin cannot read the questionnaire';
  end if;
  raise notice 'ok 14: the admin reads the questionnaire';
end $$;

reset role;


-- ------------------------------------------------------------
-- 6. Money columns
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.claims.a'), true);

do $$
begin
  if exists (select 1 from public.tutor_pay_rules) then
    raise exception 'FAIL 15: a student read the pay rules';
  end if;
  begin
    insert into public.tutor_ledger (tutor_id, session_ends_at, minutes, rate_cents, amount_cents, rate_basis)
    values (current_setting('test.tutor')::uuid, now(), 60, 9999, 9999, '{}');
    raise exception 'FAIL 15: a student wrote a ledger row';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.tutor_ledger set rate_cents = 9999;
    raise exception 'FAIL 15: a student updated rate_cents';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok 15: a student cannot read the pay rules, write a ledger row or set a rate';
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.claims.other_tutor'), true);

do $$
declare n int;
begin
  update public.tutor_ledger set paid_at = now() where paid_at is null;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL 16: a tutor marked their own ledger paid';
  end if;
  update public.tutors set started_at = '2020-01-01' where user_id = md5('tutor.full@test.local')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL 16: a tutor backdated their own tenure';
  end if;
  begin
    update public.tutor_ledger set rate_cents = 9999;
    raise exception 'FAIL 16: a tutor updated rate_cents';
  exception when insufficient_privilege then null;
  end;
  if (select count(*) from public.tutor_ledger) <> 21 then
    raise exception 'FAIL 16: the full tutor does not see exactly their own 21 ledger rows';
  end if;
  raise notice 'ok 16: a tutor sees their own ledger, and cannot mark it paid, change a rate or backdate tenure';
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.claims.admin'), true);

do $$
declare
  n int;
  row public.tutor_ledger;
begin
  update public.tutor_ledger set paid_at = now(), paid_note = 'test batch'
  where tutor_id = current_setting('test.full')::uuid and paid_at is null;
  get diagnostics n = row_count;
  if n <> 16 then
    raise exception 'FAIL 17: the admin marked % rows paid, expected 16', n;
  end if;
  select * into row from public.tutor_ledger where paid_note = 'test batch' limit 1;
  if row.paid_by is distinct from md5('admin@test.local')::uuid then
    raise exception 'FAIL 17: paid_by was not stamped with the admin';
  end if;
  update public.tutor_pay_rules set min_referrals = 3;
  if (select updated_by from public.tutor_pay_rules) is distinct from md5('admin@test.local')::uuid then
    raise exception 'FAIL 17: the pay rules edit was not stamped';
  end if;
  insert into public.tutors (email, display_name, started_at) values ('New.Tutor@Test.Local ', 'Invited', now());
  if not exists (select 1 from public.tutors where email = 'new.tutor@test.local' and user_id is null) then
    raise exception 'FAIL 17: an invited address was not normalised';
  end if;
  raise notice 'ok 17: the admin marks paid (stamped), edits the benchmarks and invites a tutor';
end $$;

reset role;


-- ------------------------------------------------------------
-- 7. Closing a session writes the ledger
-- ------------------------------------------------------------
-- Two sessions that already ended, put in as the database owner (no student
-- could book the past), then closed by their tutor.
do $$
declare
  done_id uuid;
  gone_id uuid;
begin
  insert into public.tutor_bookings (tutor_id, student_id, starts_at, ends_at)
  values (current_setting('test.tutor')::uuid, md5('student04@test.local')::uuid,
          date_trunc('hour', now()) - interval '3 hours', date_trunc('hour', now()) - interval '2 hours')
  returning id into done_id;
  insert into public.tutor_bookings (tutor_id, student_id, starts_at, ends_at)
  values (current_setting('test.tutor')::uuid, md5('student05@test.local')::uuid,
          date_trunc('hour', now()) - interval '5 hours', date_trunc('hour', now()) - interval '4 hours')
  returning id into gone_id;
  perform set_config('test.done', done_id::text, true);
  perform set_config('test.gone', gone_id::text, true);
end $$;

set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.claims.tutor'), true);

do $$
begin
  perform public.complete_tutor_session(current_setting('test.done')::uuid, 'completed');
  perform public.complete_tutor_session(current_setting('test.gone')::uuid, 'no_show');
  begin
    perform public.complete_tutor_session(current_setting('test.done')::uuid, 'completed');
    raise exception 'FAIL 18: a session was closed twice';
  exception when raise_exception then null;
  end;
  begin
    perform public.complete_tutor_session(current_setting('test.booking_b')::uuid, 'completed');
    raise exception 'FAIL 18: a session was closed before it ended';
  exception when raise_exception then null;
  end;
end $$;

reset role;

do $$
declare
  b public.tutor_bookings;
begin
  select * into b from public.tutor_bookings where id = current_setting('test.done')::uuid;
  if (select count(*) from public.tutor_ledger where booking_id = b.id) <> 1 then
    raise exception 'FAIL 18: completing did not write exactly one ledger row';
  end if;
  if (select rate_cents from public.tutor_ledger where booking_id = b.id) <> public.tutor_rate_cents(b.tutor_id, b.ends_at) then
    raise exception 'FAIL 18: the ledger rate is not the trigger''s rate';
  end if;
  if (select amount_cents from public.tutor_ledger where booking_id = b.id)
     <> (select rate_cents from public.tutor_ledger where booking_id = b.id) then
    raise exception 'FAIL 18: an hour was not paid one hour''s rate';
  end if;
  if exists (select 1 from public.tutor_ledger where booking_id = current_setting('test.gone')::uuid) then
    raise exception 'FAIL 18: a no-show wrote a ledger row';
  end if;
  raise notice 'ok 18: completing writes one ledger row at the trigger''s rate; a no-show writes none';
end $$;

-- The student rates the completed session; nobody else can.
set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.claims.b'), true);

do $$
begin
  begin
    perform public.rate_tutor_session(current_setting('test.done')::uuid, 5, 'not mine');
    raise exception 'FAIL 19: a student rated someone else''s session';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.claims.a'), true);

do $$
begin
  perform public.rate_tutor_session(current_setting('test.done')::uuid, 4, 'Clear on aldols');
  if (select stars from public.my_tutor_bookings() where id = current_setting('test.done')::uuid) <> 4 then
    raise exception 'FAIL 19: the student''s rating did not save';
  end if;
  raise notice 'ok 19: the student rates their own completed session, and nobody else can';
  raise notice 'tutoring RLS: all checks passed';
end $$;

reset role;

rollback;
