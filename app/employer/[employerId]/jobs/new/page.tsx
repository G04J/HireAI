import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { NewJobWizard } from './wizard';

export default async function NewJobPage({
  params,
}: {
  params: Promise<{ employerId: string }>;
}) {
  const { employerId } = await params;

  // Auth gate: must be logged in and own this employer profile
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/employer/${employerId}/jobs/new`);
  }

  // Verify the logged-in user actually owns this employer profile
  const db = createServerSupabaseClient();
  const { data: ep } = await db
    .from('employer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('id', employerId)
    .maybeSingle();

  if (!ep) {
    // Logged in, but wrong employer — redirect to their own dashboard
    const { data: myEp } = await db
      .from('employer_profiles')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (myEp?.id) {
      redirect(`/employer/${myEp.id}/jobs/new`);
    }
    redirect('/login?next=/employer/jobs/new');
  }

  return <NewJobWizard employerId={employerId} />;
}
