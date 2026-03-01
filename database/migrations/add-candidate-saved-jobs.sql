-- Add candidate_saved_jobs table if missing (for job board "Save" feature)
-- Run this in Supabase SQL Editor if the table doesn't exist yet.

create table if not exists public.candidate_saved_jobs (
  user_id uuid not null references public.users (id) on delete cascade,
  job_profile_id uuid not null references public.job_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_profile_id)
);
create index if not exists candidate_saved_jobs_user_id_idx on public.candidate_saved_jobs (user_id);
create index if not exists candidate_saved_jobs_job_profile_id_idx on public.candidate_saved_jobs (job_profile_id);
