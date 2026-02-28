import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

/**
 * Redirect gateway: /employer/jobs/new → /employer/[employerId]/jobs/new
 * Used by generic CTA links on the home page.
 */
export default async function NewJobGateway() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/employer/jobs/new');
  }

  const db = createServerSupabaseClient();
  const { data: ep } = await db
    .from('employer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (ep?.id) {
    redirect(`/employer/${ep.id}/jobs/new`);
  }

  redirect('/login?next=/employer/jobs/new');
}
