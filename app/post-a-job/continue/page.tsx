import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

/**
 * After login from post-a-job flow: send user to employer job form with restore=1
 * so the wizard can restore their draft from sessionStorage.
 */
export default async function PostAJobContinuePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/post-a-job/continue');
  }

  const db = createServerSupabaseClient();
  const { data: ep } = await db
    .from('employer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (ep?.id) {
    redirect(`/employer/${ep.id}/jobs/new?restore=1`);
  }

  redirect('/login?next=/post-a-job/continue');
}
