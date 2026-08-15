-- ============================================================
-- PROFILES TABLE
-- One row per user, keyed to auth.users.
-- on delete cascade means deleting the auth user deletes the profile.
-- ============================================================

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  full_name    text,
  institution  text,
  role         text not null default 'student',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- RLS is OFF by default on new tables. With it off, anyone holding your
-- publishable key can read the whole table. Turning it on denies everything
-- until you write explicit policies.
alter table public.profiles enable row level security;

-- auth.uid() returns the id of the currently authenticated user, extracted
-- from the JWT that supabase-js attaches to every request.
-- Wrapping it in (select ...) lets Postgres evaluate it once per query
-- instead of once per row, which matters as the table grows.

create policy "profiles_select_own"
  on public.profiles for select
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Deliberately no INSERT or DELETE policy. Inserts happen via the trigger
-- below, which runs as the table owner and bypasses RLS. Users should never
-- be creating or deleting their own profile rows directly.


-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- This is the piece that replaces whatever you were doing manually in Clerk.
-- ============================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer          -- runs with the privileges of the function owner,
                          -- which is what lets it write past RLS
set search_path = ''      -- prevents search_path hijacking; a security-definer
                          -- function without this is a known attack surface
as $$
begin
  insert into public.profiles (id, email, full_name, institution)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'institution'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- MECHANISM ATTEMPTS
-- The pattern repeated for per-user app data.
-- ============================================================

create table public.mechanism_attempts (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  reaction_id   text not null,
  is_correct    boolean not null,
  steps_taken   int,
  attempted_at  timestamptz not null default now()
);

create index mechanism_attempts_user_id_idx
  on public.mechanism_attempts (user_id);

alter table public.mechanism_attempts enable row level security;

create policy "attempts_select_own"
  on public.mechanism_attempts for select
  using ((select auth.uid()) = user_id);

create policy "attempts_insert_own"
  on public.mechanism_attempts for insert
  with check ((select auth.uid()) = user_id);
