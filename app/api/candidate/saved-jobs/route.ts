import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

export async function GET() {
  try {
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const { data: rows, error } = await supabase
      .from('candidate_saved_jobs')
      .select(`
        job_profile_id,
        created_at,
        job_profiles (
          id,
          title,
          company_name,
          location,
          seniority,
          category,
          publish_state
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET /api/candidate/saved-jobs', error);
      return NextResponse.json({ error: 'Failed to fetch saved jobs' }, { status: 500 });
    }

    const saved = (rows ?? []).map((r: any) => ({
      job_profile_id: r.job_profile_id,
      created_at: r.created_at,
      ...(r.job_profiles || {}),
    })).filter((s: any) => s.id && s.publish_state === 'published');

    return NextResponse.json({ saved });
  } catch (err) {
    console.error('GET /api/candidate/saved-jobs', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const jobId = body?.jobId ?? body?.job_profile_id;
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Ensure user exists in public.users (required for candidate_saved_jobs FK)
    await supabase.from('users').upsert(
      { id: user.id, email: user.email ?? '', updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );

    const { error } = await supabase
      .from('candidate_saved_jobs')
      .upsert(
        { user_id: user.id, job_profile_id: jobId },
        { onConflict: 'user_id,job_profile_id' }
      );

    if (error) {
      console.error('POST /api/candidate/saved-jobs', error);
      return NextResponse.json({ error: 'Failed to save job' }, { status: 500 });
    }

    revalidatePath(`/candidate/${user.id}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/candidate/saved-jobs', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
