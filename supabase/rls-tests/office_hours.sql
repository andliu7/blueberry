-- ============================================================
-- RLS TEST: office hours and bookings
-- (migration 20261007120000_office_hours.sql)
-- ============================================================
--
-- Proves, on the database itself, the rule the owner set on 2026-10-07: a tutor
-- on the roster posts slots, any signed-in student books one, and nobody else
-- can. The headline case is the first one: a booking written with no session is
-- refused by Postgres, not by the browser.
--
-- Plain SQL, not pgTAP, so it runs anywhere a migrated database does. Every
-- check raises an exception when it fails, so the run stops at the first broken
-- rule. Everything happens inside one transaction that is rolled back, so it
-- leaves nothing behind.
--
-- How to run it against a local stack (never against the live project):
--
--   npx supabase start
--   npx supabase db reset
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/rls-tests/office_hours.sql
--
-- It ends with the notice "office hours RLS: all checks passed".
--
-- How a request looks to Postgres: PostgREST switches to the role in the token
-- (`anon` with no session, `authenticated` with one) and puts the token's claims
-- in `request.jwt.claims`, which is what `auth.uid()` and `auth.jwt()` read. The
-- `set local` lines below do exactly that, by hand. Slot ids are handed from one
-- caller to the next in `test.*` settings, because no caller may choose an id.

begin;

-- ------------------------------------------------------------
-- Fixtures, as the database owner
-- ------------------------------------------------------------
-- The tutor's address is on `staff_roster` (seeded by an earlier migration), so
-- the signup trigger makes them admin. The students are not on it.

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000a1', 'kaiwalsh@umd.edu',       '{}'),
  ('00000000-0000-4000-8000-0000000000b1', 'student.one@test.local', '{}'),
  ('00000000-0000-4000-8000-0000000000b2', 'student.two@test.local', '{}'),
  ('00000000-0000-4000-8000-0000000000c1', null,                     '{}');

do $$
begin
  if (select role from public.profiles where id = '00000000-0000-4000-8000-0000000000a1') <> 'admin' then
    raise exception 'FIXTURE: the roster did not make the tutor staff';
  end if;
  if (select role from public.profiles where id = '00000000-0000-4000-8000-0000000000b1') <> 'student' then
    raise exception 'FIXTURE: student one is not a student';
  end if;
end $$;


-- ------------------------------------------------------------
-- The tutor posts two slots: one tomorrow, one yesterday
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","email":"kaiwalsh@umd.edu","role":"authenticated"}';

do $$
declare
  future_id uuid;
  past_id   uuid;
begin
  insert into public.office_hours (tutor_name, starts_at, location)
  values ('Kai Walsh', date_trunc('hour', now()) + interval '1 day', 'CHM 2201')
  returning id into future_id;

  insert into public.office_hours (tutor_name, starts_at, location)
  values ('Kai Walsh', date_trunc('hour', now()) - interval '1 day', 'CHM 2201')
  returning id into past_id;

  perform set_config('test.future_slot', future_id::text, true);
  perform set_config('test.past_slot',   past_id::text,   true);
end $$;

reset role;


-- ------------------------------------------------------------
-- 1. THE PHASE CHECK: no session, no booking
-- ------------------------------------------------------------
-- A visitor with no session is the `anon` role with no `sub` claim.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
begin
  begin
    insert into public.office_hour_bookings (slot_id, note)
    values (current_setting('test.future_slot')::uuid, 'no session');
    raise exception 'FAIL 1: a booking with no session was accepted';
  exception when insufficient_privilege then
    raise notice 'ok 1: a booking with no session is refused (42501)';
  end;
end $$;

do $$
begin
  begin
    perform 1 from public.office_hours;
    raise exception 'FAIL 2: a visitor with no session can read the slots';
  exception when insufficient_privilege then
    raise notice 'ok 2: a visitor with no session cannot read slots';
  end;
end $$;

reset role;


-- ------------------------------------------------------------
-- Student one, signed in
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000b1","email":"student.one@test.local","role":"authenticated"}';

do $$
begin
  begin
    insert into public.office_hours (tutor_name, starts_at)
    values ('Not a tutor', now() + interval '2 days');
    raise exception 'FAIL 3: a student posted an office-hour slot';
  exception when insufficient_privilege then
    raise notice 'ok 3: a student cannot post a slot';
  end;
end $$;

do $$
declare
  b public.office_hour_bookings;
begin
  insert into public.office_hour_bookings (slot_id, student_name, note)
  values (current_setting('test.future_slot')::uuid, 'Student One', 'Aldol, step 2')
  returning * into b;
  if b.student_id <> '00000000-0000-4000-8000-0000000000b1' or b.student_email <> 'student.one@test.local' then
    raise exception 'FAIL 4: the booking did not take the caller''s own id and email';
  end if;
  if not (select booked from public.office_hours where id = current_setting('test.future_slot')::uuid) then
    raise exception 'FAIL 4: the slot was not marked booked';
  end if;
  raise notice 'ok 4: a signed-in student books an open slot as themselves, and it reads as booked';
end $$;

do $$
begin
  begin
    insert into public.office_hour_bookings (slot_id) values (current_setting('test.past_slot')::uuid);
    raise exception 'FAIL 5: a slot in the past was booked';
  exception when insufficient_privilege then
    raise notice 'ok 5: a slot that has started cannot be booked';
  end;
end $$;

do $$
begin
  begin
    update public.office_hours set booked = false where id = current_setting('test.future_slot')::uuid;
    raise exception 'FAIL 6: a student wrote the booked flag';
  exception when insufficient_privilege then
    raise notice 'ok 6: a student cannot write the booked flag';
  end;
end $$;

reset role;


-- ------------------------------------------------------------
-- Student two, signed in
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000b2","email":"student.two@test.local","role":"authenticated"}';

do $$
begin
  begin
    insert into public.office_hour_bookings (slot_id) values (current_setting('test.future_slot')::uuid);
    raise exception 'FAIL 7: a slot was booked twice';
  exception when unique_violation then
    raise notice 'ok 7: a booked slot cannot be booked again (23505)';
  end;
end $$;

do $$
begin
  if exists (select 1 from public.office_hour_bookings) then
    raise exception 'FAIL 8: a student can read another student''s booking';
  end if;
  raise notice 'ok 8: a student cannot read another student''s booking';
end $$;

do $$
begin
  begin
    insert into public.office_hour_bookings (slot_id, student_id)
    values (current_setting('test.future_slot')::uuid, '00000000-0000-4000-8000-0000000000b1');
    raise exception 'FAIL 9: a student booked in someone else''s name';
  exception when insufficient_privilege then
    raise notice 'ok 9: a student cannot book in someone else''s name';
  end;
end $$;

do $$
declare n int;
begin
  delete from public.office_hour_bookings;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL 10: a student cancelled someone else''s booking';
  end if;
  raise notice 'ok 10: a student cannot cancel someone else''s booking';
end $$;

reset role;


-- ------------------------------------------------------------
-- An anonymous sign-in carries the authenticated role, and is still refused
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated","is_anonymous":true}';

do $$
begin
  begin
    insert into public.office_hour_bookings (slot_id) values (current_setting('test.past_slot')::uuid);
    raise exception 'FAIL 11: an anonymous sign-in booked a slot';
  exception when insufficient_privilege then
    raise notice 'ok 11: an anonymous sign-in cannot book';
  end;
end $$;

reset role;


-- ------------------------------------------------------------
-- The tutor sees and can cancel bookings on their own slots, and cannot book them
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","email":"kaiwalsh@umd.edu","role":"authenticated"}';

do $$
begin
  if (select count(*) from public.office_hour_bookings) <> 1 then
    raise exception 'FAIL 12: the tutor cannot see the booking on their slot';
  end if;
  raise notice 'ok 12: the tutor sees the booking on their own slot';
end $$;

reset role;


-- ------------------------------------------------------------
-- Student one cancels; the slot opens again
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000b1","email":"student.one@test.local","role":"authenticated"}';

do $$
declare n int;
begin
  delete from public.office_hour_bookings where slot_id = current_setting('test.future_slot')::uuid;
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'FAIL 13: a student could not cancel their own booking';
  end if;
  if (select booked from public.office_hours where id = current_setting('test.future_slot')::uuid) then
    raise exception 'FAIL 13: the slot still reads as booked after cancelling';
  end if;
  raise notice 'ok 13: a student cancels their own booking and the slot opens again';
end $$;

reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","email":"kaiwalsh@umd.edu","role":"authenticated"}';

do $$
begin
  begin
    insert into public.office_hour_bookings (slot_id) values (current_setting('test.future_slot')::uuid);
    raise exception 'FAIL 14: a tutor booked their own slot';
  exception when insufficient_privilege then
    raise notice 'ok 14: a tutor cannot book their own slot';
  end;
  raise notice 'office hours RLS: all checks passed';
end $$;

reset role;

rollback;
