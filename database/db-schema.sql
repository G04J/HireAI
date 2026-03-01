-- PostgreSQL schema for hireLens (hackathon-friendly)

-- Jobs table: stores job profiles and pipeline configuration
create table if not exists jobs (
  id text primary key, -- can be any string (e.g. 'job-1' or a uuid)
  title text not null,
  company_name text not null,
  location text,
  description text not null,
  seniority text not null,
  must_have_skills text[] default '{}'::text[],
  stages jsonb, -- stores StageConfig[] from the UI wizard
  created_at timestamptz not null default now()
);

-- Candidates table: stores applications and interview outcomes
create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  job_id text not null references jobs(id) on delete cascade,
  name text not null,
  email text not null,
  education text,
  experience_summary text,
  resume_text text,
  status text not null default 'applied',
  fit_score integer,
  fit_justification text,
  matched_skills text[] default '{}'::text[],
  missing_skills text[] default '{}'::text[],
  stage_results jsonb, -- stores final stage results/evaluation input
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Indexes for common queries
create index if not exists idx_candidates_job_id on candidates(job_id);
create index if not exists idx_candidates_email on candidates(email);

