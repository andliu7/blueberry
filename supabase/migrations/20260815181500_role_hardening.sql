-- ============================================================
-- ROLE HARDENING
--
-- Three things, all provoked by one report: an account that is `owner` in
-- `staff_roster` signed in and the site called it a member.
-- ============================================================


-- ------------------------------------------------------------
-- 1. A signup with no top-level email
-- ------------------------------------------------------------
--
-- The most likely cause of the wrong role, and the one that is invisible.
--
-- `handle_new_user` matched the roster on `new.email`. For most sign-ups that
-- is the address. For some OAuth flows it is null on the initial insert and the
-- address only exists inside `raw_user_meta_data`, because the identity row is
-- written after the user row. `lower(null)` matches no roster entry, so the
-- profile is created as a student, and `profiles.email` is left null — which
-- means the re-sync below could never repair it either. Two silent failures
-- that look exactly like "the roster did not work".
--
-- Falling back through the metadata fixes both: the role is found, and the
-- address is stored so every later lookup keyed on it works.
--
-- `on conflict do nothing` because this trigger firing twice should not take
-- the whole sign-up down with a duplicate key. A profile that already exists is
-- the desired end state, not an error.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  addr     text;
  assigned text;
begin
  addr := lower(trim(coalesce(
    new.email,
    new.raw_user_meta_data ->> 'email',
    ''
  )));

  select r.role into assigned
  from public.staff_roster r
  where lower(r.email) = addr
    and addr <> '';

  insert into public.profiles (id, email, full_name, institution, role)
  values (
    new.id,
    nullif(addr, ''),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'institution',
    coalesce(assigned, 'student')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


-- ------------------------------------------------------------
-- 2. Repair every profile that already exists
-- ------------------------------------------------------------
--
-- Backfills the address from auth.users first, so a profile written with a null
-- email by the old function becomes matchable, then re-derives the role for
-- everybody from the roster.
--
-- Idempotent on purpose: it is the same statement whether it runs against a
-- database with the bug or one without, so it is safe to keep in the history
-- and safe to have run twice.

update public.profiles p
set email = lower(trim(coalesce(u.email, u.raw_user_meta_data ->> 'email'))),
    updated_at = now()
from auth.users u
where u.id = p.id
  and coalesce(u.email, u.raw_user_meta_data ->> 'email') is not null
  and p.email is distinct from lower(trim(coalesce(u.email, u.raw_user_meta_data ->> 'email')));

-- Promotions.
update public.profiles p
set role = r.role, updated_at = now()
from public.staff_roster r
where lower(p.email) = lower(r.email)
  and p.role is distinct from r.role;

-- Demotions. Anyone holding staff who is no longer on the roster loses it.
-- Without this the table only ever ratchets upward, and a role granted for one
-- semester is permanent.
update public.profiles p
set role = 'student', updated_at = now()
where p.role in ('admin', 'owner')
  and not exists (
    select 1 from public.staff_roster r
    where lower(r.email) = lower(p.email)
  );


-- ------------------------------------------------------------
-- 3. Stop anyone promoting themselves
-- ------------------------------------------------------------
--
-- A real hole, unrelated to the report above and worse than it.
--
-- `profiles_update_own` lets you update your own row, which is correct for a
-- display name. The grant behind it was `update on public.profiles` with no
-- column list, which includes `role` — so any signed-in student could run
-- `update profiles set role = 'owner' where id = auth.uid()` and the policy
-- would allow it, because the row is genuinely theirs. RLS decides *which
-- rows*; only a column grant decides *which columns*.
--
-- Roles are set by the roster and its trigger, both of which run as the table
-- owner and are unaffected by this.

revoke update on public.profiles from authenticated;
grant  update (full_name, institution) on public.profiles to authenticated;
