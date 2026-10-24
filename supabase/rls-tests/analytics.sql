-- ============================================================
-- RLS TEST: analytics events, marketing spend and the report views
-- (migration 20261024140000_analytics.sql)
-- ============================================================
--
-- Proves on the database itself: anyone may insert an event but nobody but
-- staff may read one; the client cannot choose user_id; the shape checks and
-- the rate limit hold; marketing_spend is staff only; the views are closed to
-- every API role and compute the right numbers for the owner.
--
-- Same shape as office_hours.sql: plain SQL, each check raises on failure, one
-- transaction rolled back at the end. Needs the local seed (supabase/seed.sql)
-- for admin@test.local and student03@test.local. Never against the live project.
--
--   npx supabase db reset
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/rls-tests/analytics.sql
--
-- It ends with the notice "analytics RLS: all checks passed".

begin;

do $$
begin
  perform set_config('test.claims.student',
    jsonb_build_object('sub', md5('student03@test.local')::uuid::text, 'email', 'student03@test.local', 'role', 'authenticated')::text, true);
  perform set_config('test.claims.admin',
    jsonb_build_object('sub', (select id::text from public.profiles where email = 'admin@test.local'), 'email', 'admin@test.local', 'role', 'authenticated')::text, true);
end $$;


-- ------------------------------------------------------------
-- 1. A visitor with no session inserts; user_id stays null
-- ------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

insert into public.analytics_events (anon_id, session_id, name, props, path, utm_source, device, tz, occurred_at)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'screen_view', '{}', '#/', 'instagram', 'phone', 'Not/AZone', now() - interval '9 days');

do $$
begin
  begin
    insert into public.analytics_events (anon_id, session_id, name, user_id)
    values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'click', md5('student03@test.local')::uuid);
    raise exception 'FAIL 1: a visitor wrote user_id';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.analytics_events (anon_id, session_id, name) values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'Bad Name!');
    raise exception 'FAIL 1: a malformed name was accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.analytics_events (anon_id, session_id, name, props)
    values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'click', jsonb_build_object('pad', repeat('x', 2100)));
    raise exception 'FAIL 1: 2 KB of props was accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.analytics_events;
    raise exception 'FAIL 1: a visitor read events';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.analytics_daily_active;
    raise exception 'FAIL 1: a visitor read a report view';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok 1: a visitor inserts, cannot set user_id, break the shape, or read anything';
end $$;


-- ------------------------------------------------------------
-- 2. A student inserts as themselves and reads nothing
-- ------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.claims.student'), true);

-- The same device signs in: these rows join the anon rows above into one person.
insert into public.analytics_events (anon_id, session_id, name, props, path, utm_source)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'click', '{"target":"hero.start","cta":true}', '#/', 'instagram'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'click', '{"target":"pro.checkout","cta":true}', '#/d/subscriptions', 'instagram'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'choice', '{"question":"onboarding.goal","option":"exam"}', '#/start', 'instagram'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'screen_time', '{"ms":30000}', '#/app', 'instagram');

do $$
begin
  if exists (select 1 from public.analytics_events) then
    raise exception 'FAIL 2: a student can read events';
  end if;
  begin
    insert into public.marketing_spend (day, channel, amount_usd) values (current_date, 'instagram', 10);
    raise exception 'FAIL 2: a student wrote marketing spend';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.analytics_funnel_weekly;
    raise exception 'FAIL 2: a student read a report view';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok 2: a student inserts but reads no event, no spend, no view';
end $$;


-- ------------------------------------------------------------
-- 3. Staff read events and keep the spend table
-- ------------------------------------------------------------
select set_config('request.jwt.claims', current_setting('test.claims.admin'), true);

insert into public.marketing_spend (day, channel, amount_usd, note) values (current_date, 'instagram', 40, 'test');

do $$
begin
  if (select count(*) from public.analytics_events where anon_id = '00000000-0000-4000-8000-000000000001') <> 5 then
    raise exception 'FAIL 3: staff do not see the five events';
  end if;
  if (select count(*) from public.marketing_spend where note = 'test') <> 1 then
    raise exception 'FAIL 3: staff cannot read the spend they wrote';
  end if;
  raise notice 'ok 3: staff read every event and write spend';
end $$;


-- ------------------------------------------------------------
-- 4. The guard: server identity, clock, time zone, rate
-- ------------------------------------------------------------
reset role;

do $$
declare
  i int;
begin
  if exists (select 1 from public.analytics_events where name = 'screen_view' and user_id is not null) then
    raise exception 'FAIL 4: the visitor row has a user_id';
  end if;
  if (select count(*) from public.analytics_events where name = 'click' and user_id = md5('student03@test.local')::uuid) <> 2 then
    raise exception 'FAIL 4: the student rows do not carry auth.uid()';
  end if;
  if (select occurred_at < now() - interval '1 day' or tz is not null from public.analytics_events where name = 'screen_view') then
    raise exception 'FAIL 4: a 9-day-old timestamp or an unknown time zone got through';
  end if;
  for i in 1..130 loop
    insert into public.analytics_events (anon_id, session_id, name) values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a2', 'click');
  end loop;
  if (select count(*) from public.analytics_events where anon_id = '00000000-0000-4000-8000-000000000002') <> 120 then
    raise exception 'FAIL 4: the 120 a minute limit did not hold';
  end if;
  raise notice 'ok 4: user_id from the token, clock clamped, bad zone dropped, 120 a minute';
end $$;


-- ------------------------------------------------------------
-- 5. The views, read as the owner reads them (postgres, via the MCP)
-- ------------------------------------------------------------
do $$
declare
  student constant uuid := md5('student03@test.local')::uuid;
begin
  -- The visitor row and the signed-in rows are one person.
  if (select count(distinct person_key) from public.analytics_events_people
      where anon_id = '00000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'FAIL 5: one device signing in counted as two people';
  end if;
  if (select sum(clicks) from public.analytics_cta_daily where target = 'hero.start' and is_cta) <> 1 then
    raise exception 'FAIL 5: the hero CTA click is not counted';
  end if;
  if (select sum(picks) from public.analytics_choice_daily where question = 'onboarding.goal' and option = 'exam') <> 1 then
    raise exception 'FAIL 5: the onboarding choice is not counted';
  end if;
  if (select sum(total_minutes) from public.analytics_attention_daily where screen = '#/app') <> 0.5 then
    raise exception 'FAIL 5: 30 seconds on #/app is not half a minute';
  end if;
  if (select sum(landed) from public.analytics_funnel_weekly) < 1
     or (select sum(started_checkout) from public.analytics_funnel_weekly) <> 1 then
    raise exception 'FAIL 5: the funnel lost the landing or the checkout start';
  end if;
  -- CAC: $40 on instagram over the signups instagram brought this month.
  if (select spend_usd from public.analytics_acquisition_monthly
      where channel = 'instagram' and month = date_trunc('month', current_date)::date) <> 40 then
    raise exception 'FAIL 5: the instagram spend is not on this month';
  end if;
  -- Study hour: three days at 19:00 New York and one at 08:00 give 19.
  insert into public.progress_events (user_id, id, kind, at, event)
  select student, 'analytics-test-' || n, 'node_cleared',
         ((current_date - n) + time '19:30') at time zone 'America/New_York',
         jsonb_build_object('kind', 'node_cleared')
  from generate_series(1, 3) n;
  insert into public.progress_events (user_id, id, kind, at, event)
  values (student, 'analytics-test-am', 'node_cleared',
          ((current_date - 4) + time '08:10') at time zone 'America/New_York',
          jsonb_build_object('kind', 'node_cleared'));
  if (select usual_hour from public.analytics_study_hour where user_id = student) <> 19 then
    raise exception 'FAIL 5: usual study hour is not 19';
  end if;
  raise notice 'ok 5: one person per device, CTA, choice, attention, funnel, spend and study hour';
end $$;

do $$ begin raise notice 'analytics RLS: all checks passed'; end $$;

rollback;
