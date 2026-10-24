-- ============================================================
-- LOCAL SEED. NEVER RUN THIS AGAINST THE LIVE PROJECT.
-- ============================================================
--
-- `npx supabase db reset` runs this after the migrations on the LOCAL stack
-- (supabase/config.toml, [db.seed]). It creates test accounts on test.local
-- with the password "password", and rows that would be nonsense in production.
-- `supabase db push` does not run seed files; do not paste this into the live
-- SQL editor.
--
-- Sections are headed per feature so a later feature appends its own.


-- ============================================================
-- TUTORING (migration 20261024120000_tutoring.sql)
-- ============================================================
--
-- The model tutors of src/lib/tutoring/modelCases.ts, one per edge of the pay
-- rule, judged at AT = 2026-11-02T17:00Z:
--
--   tutor.full          6.0 months, 10 ratings avg 4.5, 20 lessons, 2 referrals  -> 3000
--   tutor.months59      the same, but started 3 days later (about 5.9 months)    -> 2500
--   tutor.rating44      10 ratings averaging 4.4                                  -> 2500
--   tutor.ratingcount4  4 ratings averaging 4.5 (5 needed)                        -> 2500
--   tutor.lessons19     19 lessons                                                -> 2500
--   tutor.referrals1    1 credited referral, 1 with no completed session          -> 2500
--   tutor.new           started 2026-10-01, nothing yet                           -> 2500
--
-- Historical lessons: lesson i of each tutor starts 2026-08-01T14:00Z plus
-- (i - 1) days and lasts an hour; they are inserted already 'completed', so the
-- ledger trigger writes their rows. A tutor's referred students take that
-- tutor's lessons 1, 2, ... which is what credits the referral. Ratings go on
-- the first lessons, an hour after each ends. Then the full tutor's next
-- session (2026-11-03 17:00Z) goes in last, priced 3000: the raise, visible.
--
-- Ids are md5(email)::uuid, so they are fixed and anyone can recompute one.
-- Accounts: admin@test.local (admin), the seven tutors, 12 referred students,
-- student01..06@test.local.

do $$
declare
  spec record;
  i integer;
  s timestamptz;
  b uuid;
  stu uuid;
  pool text[] := array['student01@test.local','student02@test.local','student03@test.local',
                       'student04@test.local','student05@test.local','student06@test.local'];
  addr text;
begin
  -- The tutors, as modelCases.ts has them.
  create temporary table seed_tutors (
    email text, name text, started_at timestamptz, stars integer[], lessons integer,
    credited text[], uncredited text[]
  ) on commit drop;
  insert into seed_tutors values
    ('tutor.full@test.local',         'Fiona Full',     '2026-05-02T17:00:00Z', '{5,5,5,5,5,4,4,4,4,4}', 20,
      '{student.ref.full.1@test.local,student.ref.full.2@test.local}', '{}'),
    ('tutor.months59@test.local',     'Mona Fivenine',  '2026-05-05T17:00:00Z', '{5,5,5,5,5,4,4,4,4,4}', 20,
      '{student.ref.months59.1@test.local,student.ref.months59.2@test.local}', '{}'),
    ('tutor.rating44@test.local',     'Rory Fourfour',  '2026-03-01T17:00:00Z', '{5,5,5,5,4,4,4,4,4,4}', 20,
      '{student.ref.rating44.1@test.local,student.ref.rating44.2@test.local}', '{}'),
    ('tutor.ratingcount4@test.local', 'Cora Four',      '2026-03-01T17:00:00Z', '{5,5,4,4}',             20,
      '{student.ref.ratingcount4.1@test.local,student.ref.ratingcount4.2@test.local}', '{}'),
    ('tutor.lessons19@test.local',    'Leo Nineteen',   '2026-03-01T17:00:00Z', '{5,5,5,5,5,4,4,4,4,4}', 19,
      '{student.ref.lessons19.1@test.local,student.ref.lessons19.2@test.local}', '{}'),
    ('tutor.referrals1@test.local',   'Remy One',       '2026-03-01T17:00:00Z', '{5,5,5,5,5,4,4,4,4,4}', 20,
      '{student.ref.referrals1.1@test.local}', '{student.ref.referrals1.2@test.local}'),
    ('tutor.new@test.local',          'Nell New',       '2026-10-01T17:00:00Z', '{}',                    0,
      '{}', '{}');

  -- Every account, with a password and an email identity so it can sign in locally.
  -- GoTrue reads the token columns as strings, so they are '' rather than null.
  for addr in
    select 'admin@test.local'
    union select email from seed_tutors
    union select unnest(credited || uncredited) from seed_tutors
    union select unnest(pool)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', md5(addr)::uuid, 'authenticated', 'authenticated', addr,
      extensions.crypt('password', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', initcap(replace(split_part(addr, '@', 1), '.', ' '))),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), md5(addr)::uuid, md5(addr)::uuid::text, 'email',
            jsonb_build_object('sub', md5(addr)::uuid::text, 'email', addr, 'email_verified', true),
            now(), now(), now());
  end loop;

  -- The admin fixture. Not on staff_roster (test addresses never go there), so
  -- the role is set directly, as the database owner.
  update public.profiles set role = 'admin' where id = md5('admin@test.local')::uuid;

  -- Tutors. The insert trigger links each to its account by email.
  insert into public.tutors (id, email, display_name, started_at, invited_by, onboarded_at)
  select md5('tutor-row:' || t.email)::uuid, t.email, t.name, t.started_at,
         md5('admin@test.local')::uuid, case when t.lessons > 0 then t.started_at end
  from seed_tutors t;

  -- Weekly hours: weekdays 14:00-18:00 New York time for everyone, plus
  -- Sunday afternoons for the new tutor.
  insert into public.tutor_availability (tutor_id, weekday, start_minute, end_minute)
  select tu.id, wd, 840, 1080
  from public.tutors tu cross join generate_series(1, 5) wd;
  insert into public.tutor_availability (tutor_id, weekday, start_minute, end_minute)
  select tu.id, 0, 780, 960 from public.tutors tu where tu.email = 'tutor.new@test.local';

  -- A week off for the months59 tutor, a fortnight from whenever this runs.
  insert into public.tutor_availability_exceptions (tutor_id, starts_at, ends_at, reason)
  select tu.id, date_trunc('day', now()) + interval '14 days', date_trunc('day', now()) + interval '21 days', 'Conference'
  from public.tutors tu where tu.email = 'tutor.months59@test.local';

  -- Historical lessons, ratings and referrals.
  for spec in select st.*, tu.id as tutor_id from seed_tutors st join public.tutors tu on tu.email = st.email loop
    for i in 1 .. spec.lessons loop
      s := '2026-08-01T14:00:00Z'::timestamptz + make_interval(days => i - 1);
      if i <= coalesce(array_length(spec.credited, 1), 0) then
        stu := md5(spec.credited[i])::uuid;
      else
        stu := md5(pool[1 + (i % 6)])::uuid;
      end if;
      insert into public.tutor_bookings (tutor_id, student_id, starts_at, ends_at, status, created_at, completed_at, completed_by)
      values (spec.tutor_id, stu, s, s + interval '1 hour', 'completed', s - interval '3 days', s + interval '1 hour', spec.tutor_id)
      returning id into b;
      insert into public.tutor_booking_answers (booking_id, course, stuck_on, exam_date, preferred_style)
      values (b, 'CHEM241', 'Practice set ' || i, null, 'practice_problems');
      if i <= coalesce(array_length(spec.stars, 1), 0) then
        insert into public.tutor_ratings (booking_id, tutor_id, student_id, stars, created_at)
        values (b, spec.tutor_id, stu, spec.stars[i], s + interval '2 hours');
      end if;
    end loop;

    insert into public.tutor_referrals (tutor_id, referred_email, created_at)
    select spec.tutor_id, r, '2026-07-15T12:00:00Z'
    from unnest(spec.credited || spec.uncredited) r;
  end loop;

  -- The full tutor's next session, after AT, priced by the trigger at 3000.
  -- It sits in the future of today's real clock; it is a model row, not a
  -- session anyone attended.
  insert into public.tutor_bookings (tutor_id, student_id, starts_at, ends_at, status, completed_at)
  select tu.id, md5('student01@test.local')::uuid, '2026-11-03T17:00:00Z', '2026-11-03T18:00:00Z', 'completed', '2026-11-03T18:00:00Z'
  from public.tutors tu where tu.email = 'tutor.full@test.local';

  -- The owner has paid the full tutor's first five sessions.
  update public.tutor_ledger l
  set paid_at = '2026-09-01T12:00:00Z', paid_note = 'Venmo, August batch', paid_by = md5('admin@test.local')::uuid
  where l.id in (
    select l2.id from public.tutor_ledger l2
    join public.tutors tu on tu.id = l2.tutor_id
    where tu.email = 'tutor.full@test.local'
    order by l2.session_ends_at
    limit 5
  );
end $$;

-- Upcoming sessions with questionnaires, for the tutor desk and the booking
-- page. Booked the way a student would, through the rpc, as that student; each
-- picks the tutor's first open hour at least two days out.
do $$
declare
  slot record;
  who  text;
  n    integer := 0;
begin
  foreach who in array array['student01@test.local', 'student02@test.local', 'student03@test.local'] loop
    perform set_config('request.jwt.claims',
      jsonb_build_object('sub', md5(who)::uuid::text, 'email', who, 'role', 'authenticated')::text, true);
    select o.tutor_id, o.starts_at into slot
    from public.tutor_open_slots(now() + interval '2 days', now() + interval '16 days') o
    join public.tutors tu on tu.id = o.tutor_id
    where tu.email = 'tutor.new@test.local'
    order by o.starts_at
    offset n limit 1;
    perform public.book_tutor_slot(
      slot.tutor_id, slot.starts_at,
      (array['CHEM241', 'CHEM241', 'CHEM231'])[n + 1],
      (array['Aldol condensation, which carbon attacks',
             'Grignard on esters, why two equivalents',
             'E1 versus E2 when the base is weak'])[n + 1],
      (now() + make_interval(days => 10 + n))::date,
      (array['walk_me_through', 'practice_problems', 'mix'])[n + 1]
    );
    n := n + 1;
  end loop;
  perform set_config('request.jwt.claims', '', true);
end $$;
