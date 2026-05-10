-- ============================================================
-- PathLight: profiles table
-- Run this in Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Profiles table (linked 1:1 to auth.users)
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  name             text,
  state            text,
  income_bracket   text,
  family_size      integer      default 0,
  child_ages       integer[]    default '{}',
  education_level  text,
  field_of_study   text,
  skills           text[]       default '{}',
  hours_per_week   integer      default 0,
  childcare_needed boolean      default false,
  created_at       timestamptz  default now(),
  updated_at       timestamptz  default now()
);

-- 2. Row Level Security — users can only access their own row
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 3. Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Keep updated_at current on every update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
