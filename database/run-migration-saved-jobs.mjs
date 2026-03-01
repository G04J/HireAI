#!/usr/bin/env node
/**
 * Creates the candidate_saved_jobs table if missing.
 *
 * Uses (in order):
 * 1. DATABASE_URL or DIRECT_URL – run SQL via Postgres (npm install pg)
 * 2. exec_sql RPC if available
 * 3. Otherwise prints SQL to run in Supabase Dashboard → SQL Editor
 *
 * Run: node database/run-migration-saved-jobs.mjs
 * Or:  npm run db:migrate:saved-jobs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

const migrationSql = `
create table if not exists public.candidate_saved_jobs (
  user_id uuid not null references public.users (id) on delete cascade,
  job_profile_id uuid not null references public.job_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_profile_id)
);
create index if not exists candidate_saved_jobs_user_id_idx on public.candidate_saved_jobs (user_id);
create index if not exists candidate_saved_jobs_job_profile_id_idx on public.candidate_saved_jobs (job_profile_id);
`.trim();

function printManualInstructions() {
  console.log('⚠️  Could not run SQL remotely.');
  console.log('   Run the following in Supabase Dashboard → SQL Editor:\n');
  console.log('─'.repeat(60));
  console.log(migrationSql);
  console.log('─'.repeat(60));
  console.log('\n   Or copy from: database/migrations/add-candidate-saved-jobs.sql');
  console.log('\n   To run from CLI: add DATABASE_URL to .env.local (Supabase → Settings → Database → Connection string), then run this script again.');
  process.exit(1);
}

async function runViaPg() {
  const pg = await import('pg');
  const client = new pg.default.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(migrationSql);
    console.log('✅ Migration ran successfully (via DATABASE_URL).');
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('Running migration: add candidate_saved_jobs table\n');

  // 1. Prefer direct Postgres if DATABASE_URL is set
  if (databaseUrl) {
    try {
      await runViaPg();
      return;
    } catch (err) {
      console.warn('⚠️  DATABASE_URL connection failed:', err.message);
      console.warn('   Falling back to Supabase API…\n');
    }
  }

  if (!url || !serviceKey) {
    console.error('❌ Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    console.log('\nOr set DATABASE_URL (Supabase → Settings → Database → Connection string) to run from CLI.');
    console.log('\nOr run the SQL manually in Supabase → SQL Editor:\n');
    console.log(migrationSql);
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 2. Try RPC exec_sql if it exists
  const { error: rpcError } = await supabase.rpc('exec_sql', { sql: migrationSql }).maybeSingle();
  if (!rpcError) {
    console.log('✅ Migration ran successfully (via exec_sql).');
    return;
  }

  // 3. Try REST endpoint
  const resp = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ sql: migrationSql }),
  });
  if (resp.ok) {
    console.log('✅ Migration ran successfully.');
    return;
  }

  printManualInstructions();
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
