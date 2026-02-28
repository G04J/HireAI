import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

/**
 * Syncs the current auth user to public.users and user_roles.
 * Call after sign up or sign in. Returns primary role for redirect.
 */
export async function POST() {
  const supabaseAuth = await createClient();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized', role: null }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const email = user.email ?? '';
  const fullName = (user.user_metadata?.full_name as string) ?? (user.user_metadata?.name as string) ?? email.split('@')[0];
  const role = (user.user_metadata?.role as 'employer' | 'candidate') ?? 'candidate';

  await supabase.from('users').upsert(
    {
      id: user.id,
      email,
      full_name: fullName || null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  await supabase.from('user_roles').upsert(
    { user_id: user.id, role },
    { onConflict: 'user_id,role' }
  );

  if (role === 'employer') {
    const companyName = (user.user_metadata?.company_name as string) ?? 'My Company';
    const { data: existing } = await supabase
      .from('employer_profiles')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    if (!existing) {
      await supabase.from('employer_profiles').insert({
        user_id: user.id,
        company_name: companyName,
      });
    }
  }

  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);
  const roleList = (roles?.map((r) => r.role) ?? [role]) as ('employer' | 'candidate')[];
  const primaryRole = roleList.includes('employer') ? 'employer' : 'candidate';

  return NextResponse.json({ role: primaryRole, roles: roleList });
}
