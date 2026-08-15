-- ============================================================
-- GRANTS
-- ============================================================
--
-- RLS and GRANT are two separate permission systems and both are required.
-- GRANT decides whether a role may touch the table at all; RLS decides which
-- rows it sees once it is allowed in. The first migration enabled RLS and wrote
-- correct policies, but granted nothing, so Postgres refused before the policy
-- was ever consulted: a signed-in user got "42501 permission denied" rather
-- than an empty result. That is a confusing failure, because the policy looks
-- right and never runs.
--
-- Narrow on purpose, matching the policies already written. No insert or delete
-- on profiles -- the signup trigger owns that. No update or delete on attempts:
-- a practice record is a fact about what happened, and a student editing their
-- own history is not a feature. `anon` gets nothing at all; a signed-out
-- visitor has no business in either table.

grant select, update on public.profiles to authenticated;
grant select, insert on public.mechanism_attempts to authenticated;
grant usage, select on sequence public.mechanism_attempts_id_seq to authenticated;


-- ============================================================
-- STAFF ROSTER
-- ============================================================
--
-- Who is staff, as data rather than as code. The site currently hardcodes four
-- addresses in `useSession.ts`, which means adding a TA is a code change, a
-- rebuild and a deploy. Here it is an insert.
--
-- Keyed by email because that is what we know before somebody has ever signed
-- in. A TA can be added to the roster today and is an admin the moment they
-- first authenticate, with no second step to forget.

create table public.staff_roster (
  email      text primary key,
  role       text not null check (role in ('admin', 'owner')),
  note       text,
  added_at   timestamptz not null default now()
);

alter table public.staff_roster enable row level security;

-- Readable by signed-in users, writable by nobody through the API. Changing who
-- is staff is a migration or a dashboard action, never something the app can be
-- talked into doing. Deliberately no insert, update or delete policy.
create policy "staff_roster_select"
  on public.staff_roster for select
  to authenticated
  using (true);

grant select on public.staff_roster to authenticated;

insert into public.staff_roster (email, role, note) values
  ('zeus.andrewliu@gmail.com', 'owner', 'Andrew Liu'),
  ('andliu@terpmail.umd.edu',  'owner', 'Andrew Liu, university account'),
  ('kaiwalsh@umd.edu',         'admin', 'Kai Walsh, TA'),
  ('vwedekin@umd.edu',         'admin', 'Vince Wedekind, TA');


-- ============================================================
-- ROLE ON SIGNUP
-- ============================================================
--
-- Replaces the trigger from the first migration so a new user's role comes from
-- the roster instead of always defaulting to 'student'.
--
-- The email is lowercased on both sides. Addresses are case-insensitive in
-- practice and "KaiWalsh@umd.edu" signing in as a student because of a capital
-- letter is exactly the kind of bug that takes an afternoon to find.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned text;
begin
  select r.role into assigned
  from public.staff_roster r
  where lower(r.email) = lower(new.email);

  insert into public.profiles (id, email, full_name, institution, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'institution',
    coalesce(assigned, 'student')
  );
  return new;
end;
$$;

-- Anyone who signed up before the roster existed. Without this, the test user
-- created a moment ago stays a student forever, and so would anyone who
-- registered between the two migrations.
update public.profiles p
set role = r.role, updated_at = now()
from public.staff_roster r
where lower(p.email) = lower(r.email)
  and p.role is distinct from r.role;


-- ============================================================
-- ASKING WHO SOMEBODY IS, FROM INSIDE A POLICY
-- ============================================================
--
-- `security definer` is not a shortcut here, it is the fix for a specific
-- failure: a policy on `profiles` that reads `profiles` to decide who you are
-- re-enters the same policy and recurses until Postgres gives up. Running as
-- the owner means this reads the table without triggering RLS again.
--
-- `stable` lets Postgres call it once per statement rather than once per row.

create function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = (select auth.uid())),
    'student'
  );
$$;

create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_role() in ('admin', 'owner');
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_staff() to authenticated;

-- Staff can see the whole roll. A TA running office hours needs to know who
-- booked a slot, and the existing policy showed them only themselves.
create policy "profiles_select_staff"
  on public.profiles for select
  to authenticated
  using (public.is_staff());

-- Staff can see every attempt, which is the point of having a TA: spotting that
-- eleven people failed the same mechanism is worth more than any one student's
-- own history.
create policy "attempts_select_staff"
  on public.mechanism_attempts for select
  to authenticated
  using (public.is_staff());
