-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- User profiles (extends Supabase auth.users)
create table public.users_profile (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  name        text,
  state       text,
  income_bracket text,
  family_size integer default 1,
  child_ages  jsonb default '[]',
  education_level text,
  field_of_study  text,
  skills      text[] default '{}',
  hours_per_week  integer default 10,
  childcare_needed boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- EduPath
create table public.education_plans (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete cascade,
  degree_target   text,
  credits_completed integer default 0,
  estimated_months  integer,
  recommended_courses jsonb default '[]',
  weekly_schedule jsonb default '[]',
  created_at      timestamptz default now()
);

-- FundFinder
create table public.funding_opportunities (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null,
  source      text,
  amount      numeric,
  deadline    date,
  match_score numeric(3,2),
  description text,
  requirements text[] default '{}',
  status      text default 'found', -- found | draft | pending_confirmation | submitted | awarded
  created_at  timestamptz default now()
);

-- CareerBoost
create table public.job_listings (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references auth.users(id) on delete cascade,
  title               text not null,
  company             text,
  remote              boolean default true,
  childcare_benefits  boolean default false,
  salary_range        text,
  match_score         numeric(3,2),
  description         text,
  cover_letter        text,
  status              text default 'found', -- found | draft | applied | interview | rejected
  created_at          timestamptz default now()
);

-- WellnessGuide
create table public.wellness_checkins (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete cascade,
  mood_score      integer check (mood_score between 1 and 10),
  stress_level    integer check (stress_level between 1 and 10),
  summary         text,
  therapist_recs  jsonb default '[]',
  created_at      timestamptz default now()
);

create table public.wellness_streaks (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  current_streak  integer default 0,
  last_checkin    date
);

-- Shared calendar events
create table public.events (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade,
  agent       text, -- edupath | fundfinder | careerboost | wellness
  title       text not null,
  datetime    timestamptz not null,
  type        text, -- class | deadline | appointment | reminder
  created_at  timestamptz default now()
);

-- Row-level security: users can only see their own data
alter table public.users_profile       enable row level security;
alter table public.education_plans     enable row level security;
alter table public.funding_opportunities enable row level security;
alter table public.job_listings        enable row level security;
alter table public.wellness_checkins   enable row level security;
alter table public.wellness_streaks    enable row level security;
alter table public.events              enable row level security;

-- RLS policies
create policy "own profile"  on public.users_profile       for all using (auth.uid() = user_id);
create policy "own edu"      on public.education_plans      for all using (auth.uid() = user_id);
create policy "own funding"  on public.funding_opportunities for all using (auth.uid() = user_id);
create policy "own jobs"     on public.job_listings         for all using (auth.uid() = user_id);
create policy "own checkins" on public.wellness_checkins    for all using (auth.uid() = user_id);
create policy "own streak"   on public.wellness_streaks     for all using (auth.uid() = user_id);
create policy "own events"   on public.events               for all using (auth.uid() = user_id);
