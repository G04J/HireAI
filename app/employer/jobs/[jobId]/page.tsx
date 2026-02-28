import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

/**
 * Redirect gateway: /employer/jobs/[jobId] → /employer/[employerId]/[jobId]
 * Handles bookmarks or old links pointing to the legacy URL shape.
 */
export default async function JobGateway({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/employer/jobs/${jobId}`);
  }

  const db = createServerSupabaseClient();
  const { data: ep } = await db
    .from('employer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (ep?.id) {
    redirect(`/employer/${ep.id}/${jobId}`);
  }

  redirect('/login');
}
