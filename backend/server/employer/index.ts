/**
 * Server-side employer identity resolution.
 *
 * Resolves the authenticated employer's profile ID from the current request,
 * or falls back to creating/returning a default demo employer when running
 * without real auth (development / demo mode).
 */
import { createServerSupabaseClient } from '@/lib/supabase/service';
import { createClient as createAuthClient } from '@/lib/supabase/server';

type AnyRow = Record<string, any>;

const DEFAULT_EMAIL = 'employer@hirelens.demo';
const DEFAULT_COMPANY = 'hireLens Demo';

/**
 * Returns the employer_profile.id for the currently authenticated user,
 * or `null` if the user is not logged in or has no employer profile.
 */
export async function getEmployerIdForRequest(): Promise<string | null> {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  return getDefaultEmployerId(user.id);
}

/**
 * Resolves an employer profile ID:
 *   - Returns `DEFAULT_EMPLOYER_ID` env var when set (useful for CI / seeded demos).
 *   - Otherwise queries the `employer_profiles` table for the given `userId`.
 *   - Falls back to auto-creating a demo employer when no profile exists.
 */
export async function getDefaultEmployerId(userId?: string): Promise<string | null> {
  const envId = process.env.DEFAULT_EMPLOYER_ID;
  if (envId) return envId;

  let supabase;
  try {
    supabase = createServerSupabaseClient();
  } catch {
    throw new Error(
      'Supabase server client failed. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in ' +
      '.env.local (Project Settings → API in Supabase).'
    );
  }

  if (userId) {
    const { data: profile } = await supabase
      .from('employer_profiles')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle() as { data: AnyRow | null };
    return profile?.id ?? null;
  }

  const { data: existing, error: selectError } = await supabase
    .from('employer_profiles')
    .select('id')
    .limit(1)
    .maybeSingle() as { data: AnyRow | null; error: any };

  if (selectError) {
    const msg = selectError.code === 'PGRST204' || selectError.message?.includes('relation')
      ? 'Database schema not applied. Run supabase-schema.sql in the Supabase SQL Editor first.'
      : `Could not load employer_profiles: ${selectError.message}`;
    throw new Error(msg);
  }

  if (existing?.id) return existing.id;

  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({ email: DEFAULT_EMAIL, full_name: DEFAULT_COMPANY } as any)
    .select('id')
    .single() as { data: AnyRow | null; error: any };

  if (userError || !user?.id) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', DEFAULT_EMAIL)
      .maybeSingle() as { data: AnyRow | null };

    if (existingUser?.id) {
      const { data: profile } = await supabase
        .from('employer_profiles')
        .insert({ user_id: existingUser.id, company_name: DEFAULT_COMPANY } as any)
        .select('id')
        .single() as { data: AnyRow | null };
      if (profile?.id) return profile.id;
    }

    throw new Error(
      `Could not create default employer. Run supabase-schema.sql first. ` +
      `Details: ${userError?.message ?? 'unknown'}`
    );
  }

  await supabase.from('user_roles').insert({ user_id: user.id, role: 'employer' } as any);

  const { data: profile, error: profileError } = await supabase
    .from('employer_profiles')
    .insert({ user_id: user.id, company_name: DEFAULT_COMPANY } as any)
    .select('id')
    .single() as { data: AnyRow | null; error: any };

  if (profileError || !profile?.id) {
    throw new Error(
      `Could not create default employer profile. Run supabase-schema.sql first. ` +
      `Details: ${profileError?.message ?? 'unknown'}`
    );
  }

  return profile.id;
}

/**
 * Like `getEmployerIdForRequest` but throws when not authenticated,
 * so callers can propagate a 401 without an extra null-check.
 */
export async function requireEmployerId(): Promise<string> {
  const id = await getEmployerIdForRequest();
  if (id) return id;
  throw new Error('UNAUTHORIZED');
}
