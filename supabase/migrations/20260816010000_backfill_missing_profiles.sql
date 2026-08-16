-- ============================================================
-- BACKFILL PROFILES FOR ACCOUNTS THAT NEVER GOT ONE
--
-- Two accounts signed up before `on_auth_user_created` existed, so no profile
-- row was ever written for them. The app reads the role from `profiles`; a
-- missing row reads as no role at all, which falls back to student. Both an
-- owner and a TA were locked out of every editing control by this, and it
-- looked exactly like the roster not working.
--
-- The previous repair migration only *updated* profiles that already existed.
-- That fixed wrong roles and did nothing at all for missing rows, which is the
-- case that actually bit. This inserts them.
-- ============================================================


-- Every auth user without a profile gets one, with the role the roster says.
--
-- `left join ... where p.id is null` rather than `on conflict do nothing`, so
-- the statement touches only the rows that are genuinely absent and the
-- `updated_at` of everybody else is left alone.
insert into public.profiles (id, email, full_name, institution, role)
select
  u.id,
  lower(trim(coalesce(u.email, u.raw_user_meta_data ->> 'email'))),
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name'
  ),
  u.raw_user_meta_data ->> 'institution',
  coalesce(
    (
      select r.role
      from public.staff_roster r
      where lower(r.email) = lower(trim(coalesce(u.email, u.raw_user_meta_data ->> 'email')))
    ),
    'student'
  )
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
  and coalesce(u.email, u.raw_user_meta_data ->> 'email') is not null;


-- And re-derive every role from the roster, so a profile written before an
-- address was added to the roster is promoted rather than left behind.
update public.profiles p
set role = r.role, updated_at = now()
from public.staff_roster r
where lower(p.email) = lower(r.email)
  and p.role is distinct from r.role;


-- ------------------------------------------------------------
-- STOP THIS CLASS OF BUG RATHER THAN FIXING IT AGAIN
-- ------------------------------------------------------------
--
-- The trigger covers everyone who signs up from now on, and this migration
-- covers everyone who already had. What neither covers is the same thing
-- happening again for some reason nobody predicted, and the failure is silent:
-- the account works, the site loads, and the person is quietly the wrong role
-- with no error anywhere to search for.
--
-- So the client can ask for its own profile to be created if it is missing.
-- `security definer` because a user has no insert policy on `profiles` and
-- should not be given one: this function decides what goes in the row, so the
-- caller cannot choose their own role. It reads the roster the same way the
-- signup trigger does.
--
-- Returns the role either way, so the caller can use it directly.

create or replace function public.ensure_profile()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid   uuid := (select auth.uid());
  addr  text;
  meta  jsonb;
  found text;
begin
  if uid is null then
    return 'student';
  end if;

  select lower(trim(coalesce(u.email, u.raw_user_meta_data ->> 'email'))),
         u.raw_user_meta_data
    into addr, meta
  from auth.users u
  where u.id = uid;

  select r.role into found
  from public.staff_roster r
  where addr is not null and addr <> '' and lower(r.email) = addr;

  insert into public.profiles (id, email, full_name, institution, role)
  values (
    uid,
    nullif(addr, ''),
    coalesce(meta ->> 'full_name', meta ->> 'name'),
    meta ->> 'institution',
    coalesce(found, 'student')
  )
  on conflict (id) do update
    -- An existing row keeps its own details and only has its role re-derived,
    -- so this is safe to call on every sign-in.
    set role = coalesce(found, public.profiles.role),
        email = coalesce(public.profiles.email, excluded.email),
        updated_at = now();

  return coalesce(found, (select role from public.profiles where id = uid));
end;
$$;

grant execute on function public.ensure_profile() to authenticated;
