-- ============================================================
-- FIRST-PARTY BUSINESS ANALYTICS (owner, 24 Oct)
-- ============================================================
--
-- What the owner asked for: customer attention, how often each button is
-- clicked (calls to action above all), which options people choose, and
-- customer acquisition cost (CAC). Read by the blueberry-analytics skill
-- (.claude/skills/blueberry-analytics/SKILL.md) through SQL, never by the site.
--
-- No third party. The browser (src/lib/analytics.ts) posts batches of events
-- straight to PostgREST with the public key, only after the visitor agreed and
-- never under Do Not Track.
--
-- NOT LOCATION. The owner floated tracking phones to know when a student is
-- home, to time reminders. That is not built. analytics_study_hour below derives
-- each signed-in student's usual study hour from their own lesson activity
-- (progress_events), which is what a reminder needs.
--
-- Who may do what:
--
--   anon, authenticated   insert events (column grant, checked by RLS and a
--                         trigger); read nothing
--   staff (is_staff())    read events; read and write marketing_spend
--   the views             no API role at all. They are read from the SQL
--                         editor or the Supabase MCP (postgres), so no browser
--                         can ask for them, whoever is signed in
--
-- Report days are America/New_York days: the course runs on Eastern time.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Events
-- ------------------------------------------------------------
--
-- One row per thing a visitor did. `name` is a short code (screen_view,
-- screen_time, click, choice); everything specific goes in `props`.
--
-- `user_id` is never written by the client: the insert grant leaves it out, so
-- it is always its default, auth.uid(), the account in the request's token
-- (null for a visitor who is not signed in).
--
-- utm_* and referrer are the visitor's FIRST visit, kept on their device and
-- sent with every event, so a signup can be traced to the channel that brought
-- the person even when they sign up a week later.

create table public.analytics_events (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null default now(),
  received_at  timestamptz not null default now(),
  anon_id      uuid not null,
  user_id      uuid default auth.uid() references auth.users (id) on delete cascade,
  session_id   uuid not null,
  name         text not null,
  props        jsonb not null default '{}'::jsonb,
  path         text check (char_length(path) <= 200),
  referrer     text check (char_length(referrer) <= 300),
  utm_source   text check (char_length(utm_source) <= 100),
  utm_medium   text check (char_length(utm_medium) <= 100),
  utm_campaign text check (char_length(utm_campaign) <= 100),
  device       text check (device in ('phone', 'tablet', 'desktop')),
  tz           text check (char_length(tz) <= 64)
);

create index analytics_events_occurred_idx on public.analytics_events (occurred_at);
create index analytics_events_anon_received_idx on public.analytics_events (anon_id, received_at);
create index analytics_events_user_idx on public.analytics_events (user_id) where user_id is not null;


-- ------------------------------------------------------------
-- 2. The insert guard
-- ------------------------------------------------------------
--
-- Runs before every insert, as the table owner (security definer) so it can
-- count rows the inserting role is not allowed to read.
--
--   - received_at is the server's clock, whatever was sent;
--   - occurred_at more than 2 days old or 5 minutes ahead becomes now(), so a
--     wrong device clock cannot scatter rows across the reports;
--   - a time zone Postgres does not know becomes null, so the study-hour view
--     can never fail on `at time zone`;
--   - more than 120 events from one anon_id in a minute are dropped quietly
--     (returning null skips the row without failing the rest of the batch).
--     anon_id is client-chosen, so this is a sanity limit, not security.

create function public.analytics_events_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.received_at := now();
  new.user_id := auth.uid();
  if new.occurred_at < now() - interval '2 days' or new.occurred_at > now() + interval '5 minutes' then
    new.occurred_at := now();
  end if;
  if new.tz is not null then
    begin
      perform now() at time zone new.tz;
    exception when others then
      new.tz := null;
    end;
  end if;
  if (
    select count(*) from public.analytics_events e
    where e.anon_id = new.anon_id and e.received_at > now() - interval '1 minute'
  ) >= 120 then
    return null;
  end if;
  return new;
end;
$$;

revoke all on function public.analytics_events_guard() from public, anon, authenticated;

create trigger analytics_events_guard
  before insert on public.analytics_events
  for each row execute function public.analytics_events_guard();


-- ------------------------------------------------------------
-- 3. Row level security and grants
-- ------------------------------------------------------------
--
-- Insert only, for visitors and students alike. The policy holds the shape
-- checks: a name is a lowercase code of at most 40 characters, and props is
-- one JSON object of at most 2 KB. Staff read every row; nobody updates or
-- deletes through the API.

alter table public.analytics_events enable row level security;

create policy "analytics_events_insert_any" on public.analytics_events
  for insert to anon, authenticated
  with check (
    name ~ '^[a-z][a-z0-9_]{0,39}$'
    and jsonb_typeof(props) = 'object'
    and octet_length(props::text) <= 2048
  );
create policy "analytics_events_select_staff" on public.analytics_events
  for select to authenticated using ((select public.is_staff()));

revoke all on public.analytics_events from anon, authenticated;

grant insert (occurred_at, anon_id, session_id, name, props, path, referrer,
              utm_source, utm_medium, utm_campaign, device, tz)
  on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;


-- ------------------------------------------------------------
-- 4. Marketing spend, for CAC
-- ------------------------------------------------------------
--
-- One row per amount spent: a day, a channel, dollars. `channel` must match the
-- utm_source the ad links carry (lowercase, e.g. "instagram"), because CAC is
-- spend on a channel divided by the people that channel brought. Staff only,
-- read and write. Entered by the owner through the skill, after a confirm.

create table public.marketing_spend (
  id          bigint generated always as identity primary key,
  day         date not null,
  channel     text not null check (channel ~ '^[a-z0-9_.-]{1,60}$'),
  amount_usd  numeric(10, 2) not null check (amount_usd >= 0),
  note        text check (char_length(note) <= 300),
  created_at  timestamptz not null default now()
);

create index marketing_spend_day_idx on public.marketing_spend (day);

alter table public.marketing_spend enable row level security;

create policy "marketing_spend_select_staff" on public.marketing_spend
  for select to authenticated using ((select public.is_staff()));
create policy "marketing_spend_insert_staff" on public.marketing_spend
  for insert to authenticated with check ((select public.is_staff()));
create policy "marketing_spend_update_staff" on public.marketing_spend
  for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "marketing_spend_delete_staff" on public.marketing_spend
  for delete to authenticated using ((select public.is_staff()));

revoke all on public.marketing_spend from anon, authenticated;
grant select, insert (day, channel, amount_usd, note), update (day, channel, amount_usd, note), delete
  on public.marketing_spend to authenticated;


-- ------------------------------------------------------------
-- 5. Views
-- ------------------------------------------------------------
--
-- security_invoker, so a view never reads more than its reader could read
-- from the tables. Every view is then revoked from anon and authenticated at
-- the end: they are for the SQL editor and the MCP only.
--
-- One person, not one device: analytics_identity maps each anon_id to the
-- account it was last seen signed in as, and person_key is that account, or
-- the anon_id for someone who never signed in. A visitor who browses signed
-- out and then signs in counts once.

create view public.analytics_identity with (security_invoker = true) as
select
  anon_id,
  (array_agg(user_id order by occurred_at desc) filter (where user_id is not null))[1] as user_id
from public.analytics_events
group by anon_id;

create view public.analytics_events_people with (security_invoker = true) as
select
  e.*,
  i.user_id as person_user_id,
  coalesce(i.user_id::text, e.anon_id::text) as person_key,
  (e.occurred_at at time zone 'America/New_York')::date as day
from public.analytics_events e
join public.analytics_identity i on i.anon_id = e.anon_id;

-- Daily active people.
create view public.analytics_daily_active with (security_invoker = true) as
select
  day,
  count(distinct person_key) as active_people,
  count(distinct person_user_id) as signed_in_people,
  count(distinct session_id) as sessions,
  count(*) as events
from public.analytics_events_people
group by day;

-- Clicks per data-track target per day. is_cta marks calls to action.
create view public.analytics_cta_daily with (security_invoker = true) as
select
  day,
  props->>'target' as target,
  coalesce((props->>'cta')::boolean, false) as is_cta,
  count(*) as clicks,
  count(distinct person_key) as people
from public.analytics_events_people
where name = 'click'
group by day, props->>'target', coalesce((props->>'cta')::boolean, false);

-- The funnel, per cohort week (the week a person was first seen). Each column
-- counts people who reached that step at any time, not strictly in order.
--   landed            any screen view
--   clicked_cta       any click on a call to action
--   signed_in         any event sent while signed in
--   finished_lesson   a node_cleared in the account's synced game progress
--   started_checkout  a click on a Pro checkout button (target pro.checkout*)
--   bought_pro        any Stripe entitlement row (billing migration)
create view public.analytics_funnel_weekly with (security_invoker = true) as
with people as (
  select
    person_key,
    (array_agg(person_user_id) filter (where person_user_id is not null))[1] as user_id,
    date_trunc('week', min(day))::date as week,
    bool_or(name = 'screen_view') as landed,
    bool_or(name = 'click' and props->>'cta' = 'true') as clicked_cta,
    bool_or(name = 'click' and props->>'target' like 'pro.checkout%') as started_checkout
  from public.analytics_events_people
  group by person_key
),
lesson_users as (
  select distinct user_id from public.progress_events where kind = 'node_cleared'
),
buyers as (
  select distinct user_id from public.entitlements
)
select
  p.week,
  count(*) filter (where p.landed) as landed,
  count(*) filter (where p.clicked_cta) as clicked_cta,
  count(*) filter (where p.user_id is not null) as signed_in,
  count(*) filter (where l.user_id is not null) as finished_lesson,
  count(*) filter (where p.started_checkout) as started_checkout,
  count(*) filter (where b.user_id is not null) as bought_pro
from people p
left join lesson_users l on l.user_id = p.user_id
left join buyers b on b.user_id = p.user_id
group by p.week;

-- Option choices: onboarding answers, plan picks and answer picks in lessons,
-- all sent as name = 'choice' with props {question, option, correct?}.
create view public.analytics_choice_daily with (security_invoker = true) as
select
  day,
  props->>'question' as question,
  props->>'option' as option,
  (props->>'correct')::boolean as correct,
  count(*) as picks,
  count(distinct person_key) as people
from public.analytics_events_people
where name = 'choice'
group by day, props->>'question', props->>'option', (props->>'correct')::boolean;

-- Attention: visible time per screen. A screen_time event is sent when a screen
-- is left or the tab is hidden, with props.ms = milliseconds it was visible.
create view public.analytics_attention_daily with (security_invoker = true) as
select
  day,
  path as screen,
  count(*) as visits,
  count(distinct person_key) as people,
  round(sum((props->>'ms')::numeric) / 60000, 1) as total_minutes,
  round((percentile_cont(0.5) within group (order by (props->>'ms')::numeric) / 1000)::numeric, 1) as median_seconds
from public.analytics_events_people
where name = 'screen_time' and jsonb_typeof(props->'ms') = 'number'
group by day, path;

-- Acquisition and CAC per channel per month. A person's channel is the
-- first-touch utm_source on their first signed-in event, else "referral" when
-- they arrived from another site, else "direct"; "unknown" is a signup that
-- never sent an event (no consent, or Do Not Track). CAC = spend / new signups
-- and spend / new paying customers on that channel that month.
create view public.analytics_acquisition_monthly with (security_invoker = true) as
with first_touch as (
  select distinct on (user_id)
    user_id,
    coalesce(
      nullif(lower(utm_source), ''),
      case when coalesce(referrer, '') <> '' then 'referral' else 'direct' end
    ) as channel
  from public.analytics_events
  where user_id is not null
  order by user_id, occurred_at
),
signups as (
  select
    date_trunc('month', u.created_at at time zone 'America/New_York')::date as month,
    coalesce(f.channel, 'unknown') as channel,
    count(*) as n
  from auth.users u
  left join first_touch f on f.user_id = u.id
  group by 1, 2
),
paying as (
  select
    date_trunc('month', p.first_paid at time zone 'America/New_York')::date as month,
    coalesce(f.channel, 'unknown') as channel,
    count(*) as n
  from (select user_id, min(created_at) as first_paid from public.entitlements group by user_id) p
  left join first_touch f on f.user_id = p.user_id
  group by 1, 2
),
spend as (
  select date_trunc('month', day)::date as month, channel, sum(amount_usd) as usd
  from public.marketing_spend
  group by 1, 2
),
keys as (
  select month, channel from signups
  union select month, channel from paying
  union select month, channel from spend
)
select
  k.month,
  k.channel,
  coalesce(s.n, 0) as new_signups,
  coalesce(p.n, 0) as new_paying,
  coalesce(sp.usd, 0) as spend_usd,
  round(sp.usd / nullif(s.n, 0), 2) as cac_per_signup,
  round(sp.usd / nullif(p.n, 0), 2) as cac_per_paying
from keys k
left join signups s on s.month = k.month and s.channel = k.channel
left join paying p on p.month = k.month and p.channel = k.channel
left join spend sp on sp.month = k.month and sp.channel = k.channel;

-- Usual study hour per signed-in student, the replacement for location
-- tracking. From the last 56 days of their own game progress: each (local day,
-- local hour) with any activity counts once, so one long session does not
-- outvote a habit, and usual_hour is the most common hour (ties go to the
-- earlier hour). Local means the device time zone last sent with an analytics
-- event; with none (no consent yet) it assumes America/New_York and says so in
-- tz_from_device. A reminder should wait for active_days >= 3.
create view public.analytics_study_hour with (security_invoker = true) as
with device_tz as (
  select distinct on (user_id) user_id, tz
  from public.analytics_events
  where user_id is not null and tz is not null
  order by user_id, occurred_at desc
),
slots as (
  select distinct
    pe.user_id,
    coalesce(t.tz, 'America/New_York') as tz,
    t.tz is not null as tz_from_device,
    (pe.at at time zone coalesce(t.tz, 'America/New_York'))::date as local_day,
    extract(hour from pe.at at time zone coalesce(t.tz, 'America/New_York'))::int as local_hour
  from public.progress_events pe
  left join device_tz t on t.user_id = pe.user_id
  where pe.at > now() - interval '56 days' and pe.at <= now() + interval '1 day'
)
select
  user_id,
  tz,
  bool_or(tz_from_device) as tz_from_device,
  mode() within group (order by local_hour) as usual_hour,
  count(distinct local_day) as active_days,
  count(*) as active_hours,
  max(local_day) as last_active_day
from slots
group by user_id, tz;

revoke all on public.analytics_identity, public.analytics_events_people,
  public.analytics_daily_active, public.analytics_cta_daily,
  public.analytics_funnel_weekly, public.analytics_choice_daily,
  public.analytics_attention_daily, public.analytics_acquisition_monthly,
  public.analytics_study_hour
  from anon, authenticated;
