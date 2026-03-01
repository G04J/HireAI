/**
 * One-shot script: creates the candidate_profiles table (if missing) and
 * populates Anna Mark's profile directly in the database.
 *
 * Usage:  node database/setup-anna.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ────────────────────────────────────────────────────────
const envVars = {};
readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
  .split('\n')
  .forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim();
  });

const SUPABASE_URL = envVars['SUPABASE_URL'] || envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Step 1: Create candidate_profiles table via SQL ────────────────────────
console.log('🏗   Creating candidate_profiles table if it does not exist…');

const createTableSQL = `
create table if not exists public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade unique,
  date_of_birth date,
  location text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  career_objective text,
  current_title text,
  years_of_experience integer,
  industry text,
  preferred_roles text[] default '{}'::text[],
  preferred_locations text[] default '{}'::text[],
  technical_skills text[] default '{}'::text[],
  soft_skills text[] default '{}'::text[],
  languages text[] default '{}'::text[],
  education jsonb default '[]'::jsonb,
  work_experience jsonb default '[]'::jsonb,
  projects jsonb default '[]'::jsonb,
  certifications jsonb default '[]'::jsonb,
  extracurriculars jsonb default '[]'::jsonb,
  achievements jsonb default '[]'::jsonb,
  leadership jsonb default '[]'::jsonb,
  persona_summary text,
  persona_json jsonb,
  persona_generated_at timestamptz,
  completeness_score integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists candidate_profiles_user_id_idx on public.candidate_profiles (user_id);
`;

const { error: ddlError } = await supabase.rpc('exec_sql', { sql: createTableSQL }).maybeSingle();

// exec_sql RPC may not exist – fall back to a direct REST call with the service role
if (ddlError) {
  // Try via the raw Postgres REST endpoint
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql: createTableSQL }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    console.warn(`⚠️   Could not auto-create table via RPC (${resp.status}): ${body}`);
    console.warn('   → Run the DDL below manually in the Supabase SQL editor, then re-run this script.\n');
    console.warn(createTableSQL);
    // Don't exit – we'll try the upsert anyway; if the table was already created it will work.
  } else {
    console.log('   Table created (or already existed).\n');
  }
} else {
  console.log('   Table created (or already existed).\n');
}

// ── Step 2: Look up Anna's user_id by email ────────────────────────────────
console.log('🔍  Looking up Anna Mark by email…');

const { data: annaUser, error: lookupError } = await supabase
  .from('users')
  .select('id, full_name, email')
  .eq('email', 'anna.mark@email.com')
  .maybeSingle();

if (lookupError || !annaUser) {
  // Also try auth admin list
  const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const authUser = authList?.users?.find((u) => u.email === 'anna.mark@email.com');

  if (!authUser) {
    console.error('❌  Anna Mark not found in auth.users or public.users.');
    console.error('   Run `node database/run-seed.mjs` first to create her auth account, then re-run this script.');
    process.exit(1);
  }

  // Insert into public.users if missing
  const { error: insertUserErr } = await supabase.from('users').upsert({
    id: authUser.id,
    email: 'anna.mark@email.com',
    full_name: 'Anna Mark',
    profile_summary: 'Junior software engineer with a few years of experience; steady growth in web and backend development.',
    phone: '+1-555-0131',
  }, { onConflict: 'id', ignoreDuplicates: false });

  if (insertUserErr) {
    console.error('❌  Failed to insert Anna into public.users:', insertUserErr.message);
    process.exit(1);
  }

  await supabase.from('user_roles').upsert({ user_id: authUser.id, role: 'candidate' }, { onConflict: 'user_id,role', ignoreDuplicates: true });

  console.log(`   Created public.users row for Anna: ${authUser.id}\n`);
  annaUser.id = authUser.id;
} else {
  console.log(`   Found Anna: ${annaUser.id}\n`);
}

const annaId = annaUser.id;

// ── Step 3: Upsert the full candidate_profile ──────────────────────────────
console.log('📝  Upserting Anna Mark candidate_profile…');

const profile = {
  user_id: annaId,
  location: 'Austin, TX',
  linkedin_url: 'https://linkedin.com/in/annamark',
  github_url: 'https://github.com/annamark',
  career_objective:
    'Seeking a role where I can grow as a software engineer and contribute to meaningful products. Interested in full-stack and backend development.',
  current_title: 'Junior Software Engineer',
  years_of_experience: 3,
  industry: 'Technology',
  preferred_roles: ['Software Engineer', 'Full Stack Developer', 'Backend Developer'],
  preferred_locations: ['Austin, TX', 'Remote', 'San Francisco, CA'],
  technical_skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL', 'Git', 'REST APIs'],
  soft_skills: ['Communication', 'Problem solving', 'Teamwork', 'Adaptability'],
  languages: ['English'],
  education: [
    {
      institution: 'University of Texas at Austin',
      degree: 'B.S.',
      field_of_study: 'Computer Science',
      start_date: '2017-09',
      end_date: '2021-05',
      gpa: '3.4',
      description: 'Relevant coursework: Data structures, algorithms, web development, databases.',
    },
  ],
  work_experience: [
    {
      company: 'TechStart Solutions',
      title: 'Junior Software Engineer',
      location: 'Austin, TX',
      start_date: '2021-06',
      end_date: '2024-01',
      description:
        'Built and maintained internal tools and customer-facing features. Worked in an Agile team on a React/Node.js stack.',
      achievements: ['Shipped 3 production features', 'Reduced API latency by 15%', 'Mentored one intern'],
    },
    {
      company: 'Local Dev Shop',
      title: 'Software Development Intern',
      location: 'Austin, TX',
      start_date: '2020-06',
      end_date: '2020-08',
      description: 'Full-stack development and bug fixes for client projects.',
      achievements: ['Delivered 2 client projects on time'],
    },
  ],
  projects: [
    {
      title: 'Task Dashboard',
      description: 'Personal productivity app with React and Express. Auth, CRUD, and simple analytics.',
      technologies: ['React', 'Node.js', 'PostgreSQL'],
      url: 'https://github.com/annamark/task-dashboard',
      start_date: '2023-01',
      end_date: '2023-03',
    },
    {
      title: 'API Rate Limiter',
      description: 'Small library for in-memory rate limiting used in side projects.',
      technologies: ['TypeScript', 'Node.js'],
      url: 'https://github.com/annamark/rate-limiter',
      start_date: '2022-06',
      end_date: '2022-08',
    },
  ],
  certifications: [
    {
      name: 'AWS Certified Cloud Practitioner',
      issuing_organization: 'Amazon Web Services',
      date_obtained: '2023-04',
      expiry_date: '',
      credential_id: '',
    },
  ],
  extracurriculars: [],
  achievements: [
    {
      title: 'Spot bonus for delivery',
      description: 'Recognition for on-time delivery of a critical feature at TechStart Solutions.',
      date: '2023-09',
    },
  ],
  leadership: [],
  completeness_score: 85,
  updated_at: new Date().toISOString(),
};

const { data: saved, error: upsertErr } = await supabase
  .from('candidate_profiles')
  .upsert(profile, { onConflict: 'user_id' })
  .select('id, user_id, current_title, completeness_score')
  .single();

if (upsertErr) {
  console.error('❌  Failed to upsert candidate_profile:', upsertErr.message);
  console.error('   Code:', upsertErr.code);
  console.error('   Hint:', upsertErr.hint);

  if (upsertErr.code === 'PGRST205') {
    console.error('\n⚠️   The candidate_profiles table is still not in the schema cache.');
    console.error('   Run this DDL in your Supabase SQL editor, then re-run this script:\n');
    console.error(createTableSQL);
  }
  process.exit(1);
}

console.log('\n✅  Anna Mark profile saved!');
console.log(`   profile id        : ${saved.id}`);
console.log(`   user_id           : ${saved.user_id}`);
console.log(`   title             : ${saved.current_title}`);
console.log(`   completeness      : ${saved.completeness_score}%`);
console.log(`\n   Candidate URL: http://localhost:9002/candidate/${saved.user_id}/profile`);
