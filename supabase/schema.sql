-- Run this once in Supabase Dashboard → SQL Editor.
-- Each signed-in user can read and write only their own Max Cinema data.

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_profiles enable row level security;

revoke all on public.user_profiles from anon;
grant select, insert, update, delete on public.user_profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.user_profiles;
create policy "Users can read their own profile"
  on public.user_profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can insert their own profile" on public.user_profiles;
create policy "Users can insert their own profile"
  on public.user_profiles for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.user_profiles;
create policy "Users can update their own profile"
  on public.user_profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can delete their own profile" on public.user_profiles;
create policy "Users can delete their own profile"
  on public.user_profiles for delete to authenticated
  using ((select auth.uid()) = id);
