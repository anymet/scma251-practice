-- =====================================================================
--  SCMA 251 · Linear Algebra Practice  —  database schema
--  Run this ONCE in Supabase → SQL Editor on a NEW project of its own.
--  DO NOT run it in the SCIM 105 project: the two courses would share the
--  weeks / problems / attempts tables and their cards and scores would mix.
--  (Same shape as scim105-practice, plus:  weeks.label / weeks.chapter,
--   problems.type / problems.spec  for the non-code question types.)
-- =====================================================================

-- ---------- people ----------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  student_id    text,
  is_admin      boolean not null default false,
  last_login_at timestamptz,
  created_at    timestamptz not null default now()
);

-- Create the profile row the first time somebody signs in (the pages also
-- upsert it themselves, so this is a belt-and-braces measure).
create or replace function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do update
     set email = excluded.email,
         full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.logins (
  id            bigint generated always as identity primary key,
  user_id       uuid references auth.users(id) on delete cascade,
  email         text,
  full_name     text,
  user_agent    text,
  logged_in_at  timestamptz not null default now()
);

-- ---------- content ----------
-- One row = one SECTION of the lecture notes (2.1, 2.2, ...). The table keeps
-- the name "weeks" so the admin code stays compatible with scim105-practice.
create table if not exists public.weeks (
  id          bigint generated always as identity primary key,
  week_no     int  not null unique,          -- hidden key, e.g. 21 for section 2.1
  display_no  int,                            -- unused here, kept for compatibility
  label       text,                           -- what students see: "2.1"
  chapter     int,                            -- 2, 3, 4  (groups the cards)
  title       text not null,
  subtitle    text,
  sort_order  int  not null default 0,
  is_open     boolean not null default false,
  updated_at  timestamptz not null default now()
);

create table if not exists public.problems (
  id             bigint generated always as identity primary key,
  week_no        int  not null references public.weeks(week_no) on delete cascade,
  level          int  not null default 1,
  level_title    text,
  level_subtitle text,
  slug           text not null unique,
  title          text not null,
  statement      text,                        -- HTML, may contain $LaTeX$
  example        text,
  type           text not null default 'code', -- code | order | cloze | spot | mcq | axioms
  entry_name     text,
  starter_code   text,
  setup_code     text,
  tests          jsonb not null default '[]'::jsonb,   -- code problems
  spec           jsonb,                                -- every other type
  points         int  not null default 10,
  sort_order     int  not null default 1,
  is_active      boolean not null default true,
  updated_at     timestamptz not null default now()
);
create index if not exists problems_week_idx on public.problems (week_no, level, sort_order);

-- If the two tables above already existed (a project made for scim105-practice,
-- or an earlier run of this file), "create table if not exists" leaves them as
-- they were - so add the new columns explicitly.
alter table public.weeks    add column if not exists label   text;
alter table public.weeks    add column if not exists chapter int;
alter table public.problems add column if not exists type    text not null default 'code';
alter table public.problems add column if not exists spec    jsonb;
alter table public.weeks    add column if not exists updated_at timestamptz not null default now();
alter table public.problems add column if not exists updated_at timestamptz not null default now();

-- ---------- work ----------
create table if not exists public.attempts (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  week_no     int,
  problem_id  text,                           -- the problem slug
  level       int,
  passed      boolean not null default false,
  score       int,
  total_tests int,
  code        text,                           -- code, or the JSON answer of a quiz item
  created_at  timestamptz not null default now()
);
create index if not exists attempts_user_idx    on public.attempts(user_id);
create index if not exists attempts_problem_idx on public.attempts(problem_id);

-- ---------- class list (registrar file, imported from the Admin page) ----------
create table if not exists public.roster (
  email       text primary key,
  student_id  text,
  full_name   text,
  thai_name   text,
  term        text,
  section     text,
  is_active   boolean not null default true,
  added_at    timestamptz not null default now()
);

-- =====================================================================
--  Row level security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.logins   enable row level security;
alter table public.weeks    enable row level security;
alter table public.problems enable row level security;
alter table public.attempts enable row level security;
alter table public.roster   enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- profiles: you see and edit yourself; admins see everyone
drop policy if exists "profiles self read"   on public.profiles;
drop policy if exists "profiles self write"  on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
drop policy if exists "profiles admin read"  on public.profiles;
create policy "profiles self read"   on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "profiles self write"  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- logins: you add your own; admins read all
drop policy if exists "logins self insert" on public.logins;
drop policy if exists "logins admin read"  on public.logins;
create policy "logins self insert" on public.logins for insert with check (auth.uid() = user_id);
create policy "logins admin read"  on public.logins for select using (public.is_admin());

-- content: every signed-in student reads; admins write
drop policy if exists "weeks read"     on public.weeks;
drop policy if exists "weeks admin"    on public.weeks;
drop policy if exists "problems read"  on public.problems;
drop policy if exists "problems admin" on public.problems;
create policy "weeks read"     on public.weeks    for select to authenticated using (true);
create policy "weeks admin"    on public.weeks    for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "problems read"  on public.problems for select to authenticated using (true);
create policy "problems admin" on public.problems for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- attempts: you write and read your own; admins read all
drop policy if exists "attempts self insert" on public.attempts;
drop policy if exists "attempts self read"   on public.attempts;
create policy "attempts self insert" on public.attempts for insert with check (auth.uid() = user_id);
create policy "attempts self read"   on public.attempts for select using (auth.uid() = user_id or public.is_admin());

-- roster: admins only
drop policy if exists "roster admin" on public.roster;
create policy "roster admin" on public.roster for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
--  keep updated_at fresh
-- =====================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists weeks_touch    on public.weeks;
drop trigger if exists problems_touch on public.problems;
create trigger weeks_touch    before update on public.weeks
  for each row execute function public.touch_updated_at();
create trigger problems_touch before update on public.problems
  for each row execute function public.touch_updated_at();

-- =====================================================================
--  DONE.  Next: 02_seed_sections.sql, then sign in once, then
--  03_make_me_admin.sql
-- =====================================================================
