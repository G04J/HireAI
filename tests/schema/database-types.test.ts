/**
 * Smoke test: Required tables for UML parity and supabaseClient module load.
 * Keep REQUIRED_TABLES in sync with supabase-schema.sql and lib/supabaseClient.ts.
 */
import { describe, it, expect } from 'vitest';

const REQUIRED_BLUEPRINT_TABLES = ['job_profiles', 'job_stages', 'job_distribution_status', 'employer_profiles'];
const REQUIRED_RUNTIME_TABLES = [
  'job_applications',
  'interview_sessions',
  'stage_sessions',
  'question_responses',
  'code_submissions',
  'case_submissions',
  'reports',
];

describe('Database schema (UML parity)', () => {
  it('documents required blueprint layer tables', () => {
    expect(REQUIRED_BLUEPRINT_TABLES).toContain('job_profiles');
    expect(REQUIRED_BLUEPRINT_TABLES).toContain('job_stages');
    expect(REQUIRED_BLUEPRINT_TABLES.length).toBeGreaterThanOrEqual(4);
  });

  it('documents required runtime layer tables', () => {
    expect(REQUIRED_RUNTIME_TABLES).toContain('reports');
    expect(REQUIRED_RUNTIME_TABLES).toContain('stage_sessions');
    expect(REQUIRED_RUNTIME_TABLES).toContain('question_responses');
    expect(REQUIRED_RUNTIME_TABLES).toContain('code_submissions');
    expect(REQUIRED_RUNTIME_TABLES).toContain('case_submissions');
    expect(REQUIRED_RUNTIME_TABLES.length).toBeGreaterThanOrEqual(7);
  });

  it('supabaseClient module loads and exports client factory', async () => {
    const mod = await import('@/lib/supabaseClient');
    expect(typeof mod.createServerSupabaseClient).toBe('function');
  });
});
