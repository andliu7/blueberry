-- ============================================================
-- COURSE CONTENT: lesson edits and calendar dates
--
-- These two lived only in a Google Sheet behind Apps Script, which verifies a
-- Google ID token and has never heard of Supabase. So staff signed in through
-- Supabase resolved as `owner`, saw every editing control, and had every save
-- refused. That is the "sign-in cannot be verified" message: not a broken
-- sign-in, a correct sign-in that the *other* backend cannot read.
--
-- Moving the data here removes the second backend from the path rather than
-- teaching it a second token format.
-- ============================================================


-- ------------------------------------------------------------
-- COURSE OVERRIDES
-- ------------------------------------------------------------
--
-- One row per edited field, not one row per topic. The editor writes a single
-- field at a time, and this shape matches that exactly: no read-modify-write,
-- so two TAs editing different fields of the same topic cannot clobber each
-- other. The alternative — a jsonb blob per topic — makes every save a
-- whole-object write and the last one wins.
--
-- `value` is text and never null. An empty string is meaningful: it is how the
-- editor clears an override and falls back to the shipped content.

create table public.course_overrides (
  kind        text not null check (kind in ('topic', 'reaction')),
  entity_id   text not null,
  field       text not null,
  value       text not null default '',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null,
  primary key (kind, entity_id, field)
);

alter table public.course_overrides enable row level security;

-- Lessons are readable without an account, so the read policy has to include
-- `anon`. This is content the site publishes, not user data.
create policy "course_overrides_read_all"
  on public.course_overrides for select
  to anon, authenticated
  using (true);

-- Three separate policies rather than `for all`, because `for all` needs both
-- `using` and `with check` to be right and it is easy to leave one off.
create policy "course_overrides_insert_staff"
  on public.course_overrides for insert
  to authenticated
  with check (public.is_staff());

create policy "course_overrides_update_staff"
  on public.course_overrides for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "course_overrides_delete_staff"
  on public.course_overrides for delete
  to authenticated
  using (public.is_staff());


-- ------------------------------------------------------------
-- COURSE DATES
-- ------------------------------------------------------------
--
-- `start_at` and `end_at` are `timestamp` without a time zone, deliberately.
--
-- A 9am exam is 9am on the syllabus. Stored as `timestamptz` it becomes an
-- instant in UTC, and College Park reads it back as 4am in the autumn and 5am
-- in the spring. There is no zone attached to the number the syllabus printed,
-- so attaching one loses information rather than adding it.

create table public.course_dates (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  kind        text not null default 'assignment'
              check (kind in ('exam','quiz','assignment','lecture','lab','office-hours')),
  start_at    timestamp not null,
  end_at      timestamp,
  detail      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);

create index course_dates_start_idx on public.course_dates (start_at);

alter table public.course_dates enable row level security;

create policy "course_dates_read_all"
  on public.course_dates for select
  to anon, authenticated
  using (true);

create policy "course_dates_insert_staff"
  on public.course_dates for insert
  to authenticated
  with check (public.is_staff());

create policy "course_dates_update_staff"
  on public.course_dates for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "course_dates_delete_staff"
  on public.course_dates for delete
  to authenticated
  using (public.is_staff());


-- ------------------------------------------------------------
-- GRANTS
-- ------------------------------------------------------------
--
-- Separate from the policies, and both are required. RLS with no grant returns
-- `42501 permission denied` before a policy is ever consulted — the failure
-- that cost an evening the first time round.

grant select on public.course_overrides to anon, authenticated;
grant select on public.course_dates     to anon, authenticated;

grant insert, update, delete on public.course_overrides to authenticated;
grant insert, update, delete on public.course_dates     to authenticated;
