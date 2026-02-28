import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

/**
 * Redirect gateway: /employer → /employer/[employerId]
 * Used by generic links (e.g. home page "For Employers" button).
 * If the user is not authenticated or not an employer, redirect to login.
 */
export default async function EmployerGateway() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/employer');
  }

  const db = createServerSupabaseClient();
  const { data: ep } = await db
    .from('employer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (ep?.id) {
    redirect(`/employer/${ep.id}`);
  }

  // User is logged in but has no employer profile — send to login as employer
  redirect('/login?next=/employer');
}
