-- Run this in the Supabase SQL Editor after the main schema.sql
-- Requires: pgvector extension

create extension if not exists vector;

-- ─── Wellness Streaks ────────────────────────────────────────────────────────
create table if not exists wellness_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer default 1,
  last_checkin date default current_date,
  updated_at timestamptz default now()
);

alter table wellness_streaks enable row level security;
create policy "Users manage own streak" on wellness_streaks
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Wellness Check-in Log ────────────────────────────────────────────────────
create table if not exists wellness_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  message text,
  mood text,
  created_at timestamptz default now()
);

alter table wellness_checkins enable row level security;
create policy "Users manage own checkins" on wellness_checkins
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Scholarships / Funding Opportunities ───────────────────────────────────
create table if not exists scholarships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text default '',
  amount numeric default 0,
  deadline text default '',
  description text default '',
  requirements text[] default '{}',
  field_tags text[] default '{}',
  url text default '',
  embedding vector(384),
  scraped_at timestamptz default now()
);

-- ─── Jobs ────────────────────────────────────────────────────────────────────
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text default '',
  salary_range text default 'Competitive',
  salary_min numeric,
  salary_max numeric,
  remote boolean default true,
  childcare_benefits boolean default false,
  description text default '',
  tags text[] default '{}',
  url text default '',
  embedding vector(384),
  scraped_at timestamptz default now()
);

-- ─── Courses ─────────────────────────────────────────────────────────────────
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text default '',
  credits numeric default 3,
  online boolean default true,
  field text default '',
  description text default '',
  duration_weeks integer,
  url text default '',
  embedding vector(384),
  scraped_at timestamptz default now()
);

-- ─── Wellness Resources ──────────────────────────────────────────────────────
create table if not exists wellness_resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text default '',
  description text default '',
  contact text default '',
  url text default '',
  state text,
  embedding vector(384),
  scraped_at timestamptz default now()
);

-- ─── Vector Similarity Search Functions ─────────────────────────────────────

create or replace function match_scholarships(
  query_embedding vector(384),
  match_count int default 5
)
returns table(
  id uuid, name text, source text, amount numeric, deadline text,
  description text, requirements text[], url text, similarity float
)
language plpgsql as $$
begin
  return query
  select s.id, s.name, s.source, s.amount, s.deadline,
    s.description, s.requirements, s.url,
    (1 - (s.embedding <=> query_embedding))::float as similarity
  from scholarships s
  where s.embedding is not null
  order by s.embedding <=> query_embedding
  limit match_count;
end;
$$;

create or replace function match_jobs(
  query_embedding vector(384),
  match_count int default 5
)
returns table(
  id uuid, title text, company text, salary_range text,
  remote boolean, childcare_benefits boolean,
  description text, tags text[], url text, similarity float
)
language plpgsql as $$
begin
  return query
  select j.id, j.title, j.company, j.salary_range,
    j.remote, j.childcare_benefits, j.description, j.tags, j.url,
    (1 - (j.embedding <=> query_embedding))::float as similarity
  from jobs j
  where j.embedding is not null
  order by j.embedding <=> query_embedding
  limit match_count;
end;
$$;

create or replace function match_courses(
  query_embedding vector(384),
  match_count int default 6
)
returns table(
  id uuid, name text, provider text, credits numeric,
  online boolean, field text, description text, url text, similarity float
)
language plpgsql as $$
begin
  return query
  select c.id, c.name, c.provider, c.credits, c.online,
    c.field, c.description, c.url,
    (1 - (c.embedding <=> query_embedding))::float as similarity
  from courses c
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;

create or replace function match_wellness_resources(
  query_embedding vector(384),
  match_count int default 4
)
returns table(
  id uuid, name text, type text, description text,
  contact text, url text, similarity float
)
language plpgsql as $$
begin
  return query
  select w.id, w.name, w.type, w.description, w.contact, w.url,
    (1 - (w.embedding <=> query_embedding))::float as similarity
  from wellness_resources w
  where w.embedding is not null
  order by w.embedding <=> query_embedding
  limit match_count;
end;
$$;
