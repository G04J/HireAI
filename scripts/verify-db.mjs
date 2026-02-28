#!/usr/bin/env node
/**
 * Verifies Supabase database connection and schema.
 * Loads .env.local from project root. Run: node scripts/verify-db.mjs
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

const requiredTables = [
  'users',
  'user_roles',
  'employer_profiles',
  'job_profiles',
  'job_stages',
  'stage_question_bank',
  'job_distribution_status',
  'public_job_views',
  'job_applications',
  'focus_events',
  'interview_sessions',
  'tool_usage_logs',
  'stage_scores',
  'question_scores',
];

async function main() {
  console.log('Checking environment...');
  if (!url || !serviceKey) {
    console.error('\n❌ Missing Supabase config.');
    console.error('  Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    console.error('  (Use Project Settings → API in your Supabase dashboard.)');
    process.exit(1);
  }
  const urlDisplay = url.includes('YOUR_PROJECT_REF') ? url : url.replace(/https:\/\/([^.]+)\./, 'https://***.');
  console.log('  SUPABASE_URL:', urlDisplay);
  if (url.includes('YOUR_PROJECT_REF')) {
    console.error('\n❌ Replace YOUR_PROJECT_REF in .env.local with your Supabase project ref (from Project Settings → API).');
    process.exit(1);
  }
  console.log('  Keys: present\n');

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log('Checking core tables (select 1 row each)...');
  const missing = [];
  const errors = [];

  for (const table of requiredTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      const msg = error.message || String(error);
      if (msg.includes('relation') || error.code === 'PGRST204') {
        missing.push(table);
      } else {
        errors.push({ table, message: msg });
      }
    }
  }

  if (missing.length) {
    console.error('\n❌ Schema not applied. These tables are missing or not accessible:');
    missing.forEach((t) => console.error('   -', t));
    console.error('\n  Run supabase-schema.sql in Supabase SQL Editor (Project → SQL Editor).');
    process.exit(1);
  }

  if (errors.length) {
    console.error('\n❌ Errors querying tables:');
    errors.forEach(({ table, message }) => console.error('   -', table, ':', message));
    process.exit(1);
  }

  console.log('  All required tables exist and are readable.\n');

  // Optional: check reports (used by employer review)
  const { error: reportError } = await supabase.from('reports').select('id').limit(1);
  if (reportError && (reportError.message?.includes('relation') || reportError.code === 'PGRST204')) {
    console.log('⚠️  Table "reports" not found. Run supabase-schema.sql to enable report generation.');
  } else if (!reportError) {
    console.log('  Table "reports" exists.');
  }

  console.log('\n✅ Database is correctly set up.');
}

main().catch((err) => {
  console.error('\n❌ Verification failed:', err.message);
  process.exit(1);
});
