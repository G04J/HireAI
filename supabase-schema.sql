-- Supabase Postgres schema for the multi-stage interview platform
-- This file can be run in Supabase SQL editor or as a migration.

-- Enable UUIDs if not already enabled
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =========================
-- Enums
-- =========================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'job_publish_state') then
    create type job_publish_state as enum ('draft', 'published', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'job_stage_type') then
    create type job_stage_type as enum ('behavioral', 'coding', 'case', 'leadership');
  end if;
  if not exists (select 1 from pg_type where typname = 'ai_usage_policy') then
    create type ai_usage_policy as enum ('allowed', 'not_allowed', 'limited');
  end if;
  if not exists (select 1 from pg_type where typname = 'proctoring_policy') then
    create type proctoring_policy as enum ('relaxed', 'moderate', 'strict', 'exam');
  end if;
  if not exists (select 1 from pg_type where typname = 'question_source') then
    create type question_source as enum ('employer_only', 'hybrid', 'ai_only');
  end if;
  if not exists (select 1 from pg_type where typname = 'distribution_channel') then
    create type distribution_channel as enum ('linkedin', 'seek', 'aegishire_public');
  end if;
  if not exists (select 1 from pg_type where typname = 'distribution_status') then
    create type distribution_status as enum ('draft', 'queued', 'posted', 'updated', 'closed', 'error');
  end if;
  if not exists (select 1 from pg_type where typname = 'focus_event_type') then
    create type focus_event_type as enum ('focus_lost', 'focus_gained', 'visibility_hidden', 'visibility_visible');
  end if;
  if not exists (select 1 from pg_type where typname = 'interview_session_status') then
    create type interview_session_status as enum ('active', 'completed', 'abandoned', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'stage_session_status') then
    create type stage_session_status as enum ('not_started', 'running', 'completed', 'abandoned');
  end if;
  if not exists (select 1 from pg_type where typname = 'employer_role') then
    create type employer_role as enum ('admin', 'recruiter', 'hiring_manager');
  end if;
  if not exists (select 1 from pg_type where typname = 'tool_type') then
    create type tool_type as enum ('scratchpad', 'reference_summarizer', 'code_helper', 'prompt_coach');
  end if;
  if not exists (select 1 from pg_type where typname = 'application_status') then
    create type application_status as enum (
      'invited', 'applied', 'screening', 'in_interview', 'completed', 'offered', 'rejected', 'withdrawn'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('employer', 'candidate');
  end if;
end $$;

-- =========================
-- Single users table (replaces separate employer/candidate identities)
-- =========================

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  avatar_url text,
  phone text,
  profile_summary text,
  resume_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);

-- User roles: one user can have both 'employer' and 'candidate'
create table if not exists public.user_roles (
  user_id uuid not null references public.users (id) on delete cascade,
  role user_role not null,
  primary key (user_id, role)
);

create index if not exists user_roles_user_id_idx on public.user_roles (user_id);

-- Employer profile: company affiliation for users with employer role
-- job_profiles.employer_id points here (replaces old employer_users)
create table if not exists public.employer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  company_name text not null,
  role employer_role not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists employer_profiles_user_company_idx
  on public.employer_profiles (user_id, company_name);
create index if not exists employer_profiles_user_id_idx on public.employer_profiles (user_id);

-- Migrate from old employer_users if present (preserve ids so job_profiles.employer_id is valid)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'employer_users') then
    insert into public.users (id, email, full_name, avatar_url, phone, created_at, updated_at)
    select id, email, coalesce(full_name, company_name), avatar_url, phone, created_at, coalesce(updated_at, created_at)
    from public.employer_users on conflict (id) do nothing;
    insert into public.employer_profiles (id, user_id, company_name, role, created_at, updated_at)
    select id, id, company_name, role, created_at, coalesce(updated_at, created_at) from public.employer_users
    on conflict (id) do nothing;
    insert into public.user_roles (user_id, role) select id, 'employer'::user_role from public.employer_users
    on conflict (user_id, role) do nothing;
    alter table public.job_profiles drop constraint if exists job_profiles_employer_id_fkey;
    alter table public.job_profiles add constraint job_profiles_employer_id_fkey
      foreign key (employer_id) references public.employer_profiles (id) on delete cascade;
    alter table public.stage_question_bank drop constraint if exists stage_question_bank_employer_id_fkey;
    alter table public.stage_question_bank add constraint stage_question_bank_employer_id_fkey
      foreign key (employer_id) references public.employer_profiles (id) on delete cascade;
    drop table if exists public.employer_users cascade;
  end if;
end $$;

-- =========================
-- Core job schema (employer_id → employer_profiles.id)
-- =========================

create table if not exists public.job_profiles (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employer_profiles (id) on delete cascade,
  title text not null,
  company_name text not null,
  location text,
  description text not null,
  seniority text not null,
  category text,
  must_have_skills text[] default '{}'::text[],
  pipeline_config jsonb,
  publish_state job_publish_state not null default 'draft',
  public_slug text unique,
  rubric_json jsonb,
  stage_plan_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_profiles add column if not exists category text;

create index if not exists job_profiles_employer_id_idx
  on public.job_profiles (employer_id);

create table if not exists public.job_stages (
  id uuid primary key default gen_random_uuid(),
  job_profile_id uuid not null references public.job_profiles (id) on delete cascade,
  index integer not null,
  type job_stage_type not null,
  duration_minutes integer,
  ai_usage_policy ai_usage_policy not null default 'allowed',
  proctoring_policy proctoring_policy not null default 'relaxed',
  competencies text[],
  stage_weights jsonb,
  interviewer_voice_id text,
  question_source question_source not null default 'employer_only',
  created_at timestamptz not null default now(),
  unique (job_profile_id, index)
);

create index if not exists job_stages_job_profile_id_idx
  on public.job_stages (job_profile_id);

create table if not exists public.stage_question_bank (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employer_profiles (id) on delete cascade,
  job_stage_id uuid references public.job_stages (id) on delete set null,
  job_profile_id uuid references public.job_profiles (id) on delete set null,
  question_text text not null,
  category text,
  difficulty text,
  mandatory boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stage_question_bank_employer_idx
  on public.stage_question_bank (employer_id);

create index if not exists stage_question_bank_job_stage_idx
  on public.stage_question_bank (job_stage_id);

create table if not exists public.job_distribution_status (
  id uuid primary key default gen_random_uuid(),
  job_profile_id uuid not null references public.job_profiles (id) on delete cascade,
  channel distribution_channel not null,
  status distribution_status not null default 'draft',
  external_job_id text,
  last_payload jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_profile_id, channel)
);

create index if not exists job_distribution_status_job_profile_idx
  on public.job_distribution_status (job_profile_id);

create table if not exists public.public_job_views (
  id uuid primary key default gen_random_uuid(),
  job_profile_id uuid not null references public.job_profiles (id) on delete cascade,
  public_id text not null unique,
  last_viewed_at timestamptz,
  view_count integer default 0,
  analytics jsonb,
  created_at timestamptz not null default now()
);

create index if not exists public_job_views_job_profile_idx
  on public.public_job_views (job_profile_id);

-- =========================
-- Job applications: links user (as candidate) to job with status and stage
-- (invited, applied, in interview, selected, rejected, etc.)
-- =========================

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  job_profile_id uuid not null references public.job_profiles (id) on delete cascade,
  status application_status not null default 'applied',
  current_stage_index integer,
  fit_score numeric,
  fit_decision text,
  recommendation text,
  resume_text text,
  resume_url text,
  matched_skills text[] default '{}'::text[],
  missing_skills text[] default '{}'::text[],
  invited_at timestamptz,
  applied_at timestamptz,
  rejected_at timestamptz,
  offered_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_profile_id)
);

alter table public.job_applications add column if not exists user_id uuid references public.users (id) on delete cascade;
alter table public.job_applications add column if not exists fit_score numeric;
alter table public.job_applications add column if not exists fit_decision text;
alter table public.job_applications add column if not exists recommendation text;
alter table public.job_applications add column if not exists resume_text text;
alter table public.job_applications add column if not exists resume_url text;
alter table public.job_applications add column if not exists matched_skills text[] default '{}'::text[];
alter table public.job_applications add column if not exists missing_skills text[] default '{}'::text[];

create index if not exists job_applications_user_id_idx on public.job_applications (user_id);
create index if not exists job_applications_job_profile_id_idx on public.job_applications (job_profile_id);
create index if not exists job_applications_status_idx on public.job_applications (status);

-- Candidate saved jobs (bookmarks for job board)
create table if not exists public.candidate_saved_jobs (
  user_id uuid not null references public.users (id) on delete cascade,
  job_profile_id uuid not null references public.job_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_profile_id)
);
create index if not exists candidate_saved_jobs_user_id_idx on public.candidate_saved_jobs (user_id);
create index if not exists candidate_saved_jobs_job_profile_id_idx on public.candidate_saved_jobs (job_profile_id);

-- Migrate from candidate_users: backfill users, set job_applications.user_id, drop candidate_users
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'candidate_users') then
    insert into public.users (id, email, full_name, phone, profile_summary, resume_url, created_at, updated_at)
    select id, email, full_name, phone, profile_summary, resume_url, created_at, updated_at from public.candidate_users
    on conflict (id) do nothing;
    insert into public.user_roles (user_id, role) select id, 'candidate'::user_role from public.candidate_users
    on conflict (user_id, role) do nothing;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'job_applications' and column_name = 'candidate_user_id') then
      update public.job_applications set user_id = candidate_user_id where candidate_user_id is not null;
      alter table public.job_applications drop column candidate_user_id;
    end if;
    alter table public.candidates drop constraint if exists candidates_candidate_user_id_fkey;
    alter table public.candidates add column if not exists user_id uuid references public.users (id);
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'candidates' and column_name = 'candidate_user_id') then
      update public.candidates set user_id = candidate_user_id where candidate_user_id is not null;
      alter table public.candidates drop column candidate_user_id;
    end if;
    drop table if exists public.candidate_users cascade;
  end if;
end $$;

-- =========================
-- Legacy jobs table (for candidates.job_id; app also has job_profiles)
-- =========================

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company_name text not null,
  location text,
  description text not null,
  seniority text not null,
  must_have_skills text[] default '{}'::text[],
  stages jsonb,
  created_at timestamptz not null default now()
);

-- =========================
-- Candidate + interview side
-- =========================

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  job_profile_id uuid references public.job_profiles (id),
  name text not null,
  email text not null,
  education text,
  experience_summary text,
  resume_text text,
  status text not null default 'applied',
  fit_score numeric,
  fit_justification text,
  matched_skills text[],
  missing_skills text[],
  stage_results jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Add job_profile_id if table already existed without it
alter table public.candidates
  add column if not exists job_profile_id uuid references public.job_profiles (id);
-- Link legacy candidate row to users (replaces candidate_user_id)
alter table public.candidates
  add column if not exists user_id uuid references public.users (id);

create table if not exists public.focus_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidates (id) on delete set null,
  job_profile_id uuid references public.job_profiles (id) on delete set null,
  stage_id uuid references public.job_stages (id) on delete set null,
  event_type focus_event_type not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_ms bigint,
  policy proctoring_policy not null,
  explanation text,
  created_at timestamptz not null default now()
);

create index if not exists focus_events_candidate_idx
  on public.focus_events (candidate_id);

create index if not exists focus_events_job_profile_idx
  on public.focus_events (job_profile_id);

create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidates (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  job_profile_id uuid not null references public.job_profiles (id) on delete cascade,
  application_id uuid references public.job_applications (id) on delete set null,
  current_stage_index integer,
  current_question_index integer,
  stage_statuses jsonb,
  answers jsonb,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  status interview_session_status not null default 'active'
);

alter table public.interview_sessions
  add column if not exists application_id uuid references public.job_applications (id) on delete set null;
alter table public.interview_sessions
  add column if not exists user_id uuid references public.users (id) on delete set null;
alter table public.interview_sessions alter column candidate_id drop not null;

create index if not exists interview_sessions_candidate_idx
  on public.interview_sessions (candidate_id);

create index if not exists interview_sessions_job_profile_idx
  on public.interview_sessions (job_profile_id);

create index if not exists interview_sessions_application_idx
  on public.interview_sessions (application_id);

create index if not exists interview_sessions_user_id_idx
  on public.interview_sessions (user_id);

-- =========================
-- Stage sessions & artifacts (runtime, UML-aligned)
-- =========================

create table if not exists public.stage_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions (id) on delete cascade,
  job_stage_id uuid not null references public.job_stages (id) on delete cascade,
  status stage_session_status not null default 'not_started',
  current_question_index integer,
  score numeric,
  ai_collaboration_score numeric,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists stage_sessions_session_idx
  on public.stage_sessions (session_id);

create index if not exists stage_sessions_job_stage_idx
  on public.stage_sessions (job_stage_id);

create table if not exists public.question_responses (
  id uuid primary key default gen_random_uuid(),
  stage_session_id uuid not null references public.stage_sessions (id) on delete cascade,
  question_index integer,
  question_text text not null,
  interviewer_audio_url text,
  transcript_text text,
  candidate_audio_url text,
  score numeric,
  followup boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists question_responses_stage_session_idx
  on public.question_responses (stage_session_id);

create table if not exists public.code_submissions (
  id uuid primary key default gen_random_uuid(),
  stage_session_id uuid not null references public.stage_sessions (id) on delete cascade,
  language text,
  code_text text,
  run_output text,
  tests_output text,
  explanation_transcript text,
  score numeric,
  created_at timestamptz not null default now()
);

create index if not exists code_submissions_stage_session_idx
  on public.code_submissions (stage_session_id);

create table if not exists public.case_submissions (
  id uuid primary key default gen_random_uuid(),
  stage_session_id uuid not null references public.stage_sessions (id) on delete cascade,
  response_transcript text,
  score numeric,
  created_at timestamptz not null default now()
);

create index if not exists case_submissions_stage_session_idx
  on public.case_submissions (stage_session_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications (id) on delete cascade,
  overall_score numeric,
  recommendation text,
  report_json jsonb,
  human_readable_report text,
  generated_at timestamptz not null default now(),
  unique (application_id)
);

create index if not exists reports_application_idx
  on public.reports (application_id);

-- Bridge existing logs to stage_sessions (keeps legacy columns too)
alter table public.focus_events
  add column if not exists stage_session_id uuid references public.stage_sessions (id) on delete set null;

alter table public.tool_usage_logs
  add column if not exists stage_session_id uuid references public.stage_sessions (id) on delete set null;

-- =========================
-- Tools & scoring
-- =========================

create table if not exists public.tool_usage_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions (id) on delete cascade,
  stage_id uuid references public.job_stages (id) on delete set null,
  tool_type tool_type not null,
  prompt text not null,
  response_excerpt text,
  full_response_ref text,
  validation_note text,
  created_at timestamptz not null default now()
);

create index if not exists tool_usage_logs_session_idx
  on public.tool_usage_logs (session_id);

create table if not exists public.stage_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions (id) on delete cascade,
  stage_id uuid not null references public.job_stages (id) on delete cascade,
  overall_score numeric,
  confidence numeric,
  competency_scores jsonb,
  flags jsonb,
  created_at timestamptz not null default now()
);

create index if not exists stage_scores_session_idx
  on public.stage_scores (session_id);

create index if not exists stage_scores_stage_idx
  on public.stage_scores (stage_id);

create table if not exists public.question_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions (id) on delete cascade,
  stage_id uuid not null references public.job_stages (id) on delete cascade,
  question_id uuid,
  question_index integer,
  score numeric,
  competency_scores jsonb,
  flags jsonb,
  created_at timestamptz not null default now()
);

create index if not exists question_scores_session_idx
  on public.question_scores (session_id);

create index if not exists question_scores_stage_idx
  on public.question_scores (stage_id);

-- =========================
-- Views: per-job application stats (counts by status, stage, etc.)
-- =========================

create or replace view public.job_application_stats as
select
  jp.id as job_profile_id,
  jp.employer_id,
  jp.title,
  jp.company_name,
  jp.category,
  jp.publish_state,
  count(ja.id) as total_applications,
  count(ja.id) filter (where ja.status = 'invited') as num_invited,
  count(ja.id) filter (where ja.status = 'applied') as num_applied,
  count(ja.id) filter (where ja.status = 'screening') as num_screening,
  count(ja.id) filter (where ja.status = 'in_interview') as num_in_interview,
  count(ja.id) filter (where ja.status = 'completed') as num_completed,
  count(ja.id) filter (where ja.status = 'offered') as num_offered,
  count(ja.id) filter (where ja.status = 'rejected') as num_rejected,
  count(ja.id) filter (where ja.status = 'withdrawn') as num_withdrawn,
  count(ja.id) filter (where ja.current_stage_index = 0) as num_at_stage_0,
  count(ja.id) filter (where ja.current_stage_index = 1) as num_at_stage_1,
  count(ja.id) filter (where ja.current_stage_index = 2) as num_at_stage_2,
  count(ja.id) filter (where ja.current_stage_index = 3) as num_at_stage_3,
  count(ja.id) filter (where ja.current_stage_index >= 0) as num_in_pipeline
from public.job_profiles jp
left join public.job_applications ja on ja.job_profile_id = jp.id
group by jp.id, jp.employer_id, jp.title, jp.company_name, jp.category, jp.publish_state;

-- =========================
-- View: candidate's applications across all jobs (for candidate dashboard)
-- =========================

create or replace view public.candidate_applications_summary as
select
  u.id as user_id,
  u.email,
  u.full_name,
  ja.id as application_id,
  ja.job_profile_id,
  ja.status as application_status,
  ja.current_stage_index,
  ja.invited_at,
  ja.applied_at,
  ja.rejected_at,
  ja.offered_at,
  ja.withdrawn_at,
  ja.created_at as application_created_at,
  jp.title as job_title,
  jp.company_name as job_company_name,
  jp.category as job_category,
  jp.seniority as job_seniority,
  jp.publish_state as job_publish_state
from public.users u
join public.job_applications ja on ja.user_id = u.id
join public.job_profiles jp on jp.id = ja.job_profile_id;

-- =========================
-- View: employer's jobs with application counts (for employer dashboard)
-- =========================

create or replace view public.employer_jobs_summary as
select
  ep.id as employer_id,
  u.email as employer_email,
  ep.company_name,
  u.full_name as employer_full_name,
  jp.id as job_profile_id,
  jp.title,
  jp.category,
  jp.publish_state,
  jp.created_at as job_created_at,
  coalesce(stats.total_applications, 0) as total_applications,
  coalesce(stats.num_rejected, 0) as num_rejected,
  coalesce(stats.num_offered, 0) as num_offered,
  coalesce(stats.num_in_interview, 0) as num_in_interview,
  coalesce(stats.num_applied, 0) as num_applied
from public.employer_profiles ep
join public.users u on u.id = ep.user_id
join public.job_profiles jp on jp.employer_id = ep.id
left join public.job_application_stats stats on stats.job_profile_id = jp.id;

