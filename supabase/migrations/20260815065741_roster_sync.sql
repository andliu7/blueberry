-- ============================================================
-- KEEPING PROFILES IN STEP WITH THE ROSTER
-- ============================================================
--
-- The signup trigger reads the roster once, at the moment someone registers,
-- and never runs again for that person. That leaves a trap: add a TA to the
-- roster after they have already signed up and nothing promotes them. They stay
-- a student while the roster insists they are staff, and the only clue is that
-- the buttons are missing.
--
-- The backfill in the previous migration fixed the rows that existed when it
-- ran, which is a one-time repair, not a rule. This makes it a rule: the roster
-- is the source of truth, and a change to it takes effect immediately whether
-- or not the person has an account yet.
--
-- Now both orders work:
--
--   roster first, then signup  ->  handle_new_user() reads the roster
--   signup first, then roster  ->  this trigger promotes the existing profile
--
-- Removing somebody demotes them to 'student' for the same reason. A TA who
-- finishes the course should stop being an admin without anyone remembering to
-- edit a second table.

create function public.sync_roster_to_profiles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'DELETE') then
    update public.profiles
    set role = 'student', updated_at = now()
    where lower(email) = lower(old.email)
      and role is distinct from 'student';
    return old;
  end if;

  update public.profiles
  set role = new.role, updated_at = now()
  where lower(email) = lower(new.email)
    and role is distinct from new.role;
  return new;
end;
$$;

create trigger staff_roster_sync
  after insert or update or delete on public.staff_roster
  for each row execute function public.sync_roster_to_profiles();


-- ============================================================
-- KAI'S PERSONAL ADDRESS
-- ============================================================
--
-- A second row rather than a change to the first: he may sign in with either,
-- and Supabase treats them as two separate identities because they are two
-- separate Google accounts. Both need to resolve to admin, and the roster is
-- keyed by email precisely so this costs one insert.

insert into public.staff_roster (email, role, note) values
  ('kwalshfb0416@gmail.com', 'admin', 'Kai Walsh, personal account')
on conflict (email) do update set role = excluded.role, note = excluded.note;
