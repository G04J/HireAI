/**
 * Resolves the effective employer_id for API routes.
 * When userId is provided (auth), returns that user's employer_profile id or null.
 * When no userId (e.g. no auth), uses DEFAULT_EMPLOYER_ID env, or first in DB, or creates default.
 */
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { createClient as createAuthClient } from '@/lib/supabase/server';

const DEFAULT_EMAIL = 'employer@aegishire.demo';
const DEFAULT_COMPANY = 'AegisHire Demo';

/**
 * Returns employer_id for the current request: auth user's employer profile if logged in,
 * otherwise fallback (env / first in DB / default). Returns null if user is logged in but has no employer profile.
 */
export async function getEmployerIdForRequest(): Promise<string | null> {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (user) {
    const id = await getDefaultEmployerId(user.id);
    return id;
  }
  return getDefaultEmployerId();
}

export async function getDefaultEmployerId(userId?: string): Promise<string | null> {
  const envId = process.env.DEFAULT_EMPLOYER_ID;
  if (envId) return envId;

  let supabase;
  try {
    supabase = createServerSupabaseClient();
  } catch (e) {
    throw new Error(
      'Supabase server client failed. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (Project Settings → API in Supabase).'
    );
  }

  if (userId) {
    const { data: profile } = await supabase
      .from('employer_profiles')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    return profile?.id ?? null;
  }

  const { data: existing, error: selectError } = await supabase
    .from('employer_profiles')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (selectError) {
    const msg = selectError.code === 'PGRST204' || selectError.message?.includes('relation')
      ? 'Database schema not applied. Run supabase-schema.sql in the Supabase SQL Editor first (Project → SQL Editor).'
      : `Could not load employer_profiles: ${selectError.message}`;
    throw new Error(msg);
  }

  if (existing?.id) return existing.id;

  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({ email: DEFAULT_EMAIL, full_name: DEFAULT_COMPANY })
    .select('id')
    .single();

  if (userError || !user?.id) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', DEFAULT_EMAIL)
      .maybeSingle();
    if (existingUser?.id) {
      const { data: profile } = await supabase
        .from('employer_profiles')
        .insert({ user_id: existingUser.id, company_name: DEFAULT_COMPANY })
        .select('id')
        .single();
      if (profile?.id) return profile.id;
    }
    throw new Error(
      `Could not create default employer. Run supabase-schema.sql in Supabase SQL Editor first. Details: ${userError?.message ?? 'unknown'}`
    );
  }

  await supabase.from('user_roles').insert({ user_id: user.id, role: 'employer' });

  const { data: profile, error: profileError } = await supabase
    .from('employer_profiles')
    .insert({ user_id: user.id, company_name: DEFAULT_COMPANY })
    .select('id')
    .single();

  if (profileError || !profile?.id) {
    throw new Error(
      `Could not create default employer profile. Run supabase-schema.sql in Supabase SQL Editor first. Details: ${profileError?.message ?? 'unknown'}`
    );
  }
  return profile.id;
}

export async function requireEmployerId(): Promise<string> {
  const id = await getEmployerIdForRequest();
  if (id) return id;
  throw new Error('UNAUTHORIZED'); // Caller can check message and return 401
}
