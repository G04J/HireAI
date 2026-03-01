import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from('candidate_saved_jobs')
      .delete()
      .eq('user_id', user.id)
      .eq('job_profile_id', jobId);

    if (error) {
      console.error('DELETE /api/candidate/saved-jobs/[jobId]', error);
      return NextResponse.json({ error: 'Failed to remove saved job' }, { status: 500 });
    }

    revalidatePath(`/candidate/${user.id}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/candidate/saved-jobs/[jobId]', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
