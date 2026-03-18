-- SequenceFlow Lead Gen — Supabase Schema
-- Run this in your Supabase SQL editor

-- LEADS TABLE
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  job_id text unique,
  title text,
  company text,
  location text,
  salary text,
  description text,
  url text,
  pub_date timestamptz,
  search_label text,
  sequenceflow_flow text,
  sequenceflow_pitch text,
  sequenceflow_angle text,
  -- AI qualification
  ai_score int2,
  ai_tier text check (ai_tier in ('hot','warm','cold')),
  ai_reasoning text,
  ai_key_selling_point text,
  ai_monthly_cost_est text,
  ai_company_size text,
  ai_best_flow text,
  ai_best_pitch text,
  qualified_at timestamptz,
  -- Email
  status text default 'new' check (status in ('new','qualified','email_ready','sent','rejected')),
  draft_subject text,
  draft_email text,
  contact_email text,
  email_confidence text,
  email_sent_at timestamptz,
  followup_sent_at timestamptz,
  -- Metadata
  scraped_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table leads enable row level security;
create policy "authenticated users can access leads"
  on leads for all
  to authenticated
  using (true)
  with check (true);

-- Indexes
create index if not exists leads_status_idx on leads(status);
create index if not exists leads_ai_score_idx on leads(ai_score);
create index if not exists leads_scraped_at_idx on leads(scraped_at desc);
create index if not exists leads_ai_tier_idx on leads(ai_tier);

-- SEARCH QUERIES TABLE
create table if not exists search_queries (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  location text default 'Netherlands',
  label text,
  flow text,
  pitch text,
  angle text,
  active boolean default true,
  created_at timestamptz default now()
);

alter table search_queries enable row level security;
create policy "authenticated users can access search_queries"
  on search_queries for all
  to authenticated
  using (true)
  with check (true);

-- SETTINGS TABLE
create table if not exists settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

alter table settings enable row level security;
create policy "authenticated users can access settings"
  on settings for all
  to authenticated
  using (true)
  with check (true);

-- Auto-update updated_at on leads
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at
  before update on leads
  for each row
  execute procedure update_updated_at_column();
