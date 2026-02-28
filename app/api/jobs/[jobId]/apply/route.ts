import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const formData = body?.formData ?? {};
    const fitResult = body?.fitResult ?? null;

    const supabase = createServerSupabaseClient();

    // Ensure job exists (and is published) before creating an application.
    const { data: job, error: jobError } = await supabase
      .from('job_profiles')
      .select('id, publish_state')
      .eq('id', jobId)
      .maybeSingle();

    if (jobError || !job?.id) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (job.publish_state !== 'published') {
      return NextResponse.json({ error: 'Job is not accepting applications' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data: app, error: appError } = await supabase
      .from('job_applications')
      .upsert(
        {
          user_id: user.id,
          job_profile_id: jobId,
          status: 'applied',
          current_stage_index: 0,
          applied_at: now,
          updated_at: now,
          resume_text: formData?.resumeText ?? null,
          fit_score: fitResult?.fitScore ?? null,
          fit_decision: typeof fitResult?.fitScore === 'number'
            ? (fitResult.fitScore >= 70 ? 'eligible' : fitResult.fitScore >= 40 ? 'borderline' : 'ineligible')
            : null,
          recommendation: null,
          matched_skills: fitResult?.matchedSkills ?? [],
          missing_skills: fitResult?.missingSkills ?? [],
        },
        { onConflict: 'user_id,job_profile_id' }
      )
      .select('id')
      .single();

    if (appError || !app?.id) {
      console.error('Error upserting job_application', appError);
      return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
    }

    // Keep the public.users profile in sync with the application form.
    const candidateName = (formData?.name as string | undefined) ?? null;
    const phone = (formData?.phone as string | undefined) ?? null;
    const profileSummary = (formData?.profileSummary as string | undefined) ?? null;
    const hasUserUpdates = candidateName != null || phone != null || profileSummary != null;
    if (hasUserUpdates) {
      const userUpdates: Record<string, unknown> = { updated_at: now };
      if (candidateName != null) userUpdates.full_name = candidateName;
      if (phone != null) userUpdates.phone = phone;
      if (profileSummary != null) userUpdates.profile_summary = profileSummary;
      await supabase.from('users').update(userUpdates).eq('id', user.id);
    }

    return NextResponse.json({ applicationId: app.id });
  } catch (err) {
    console.error('POST /api/jobs/[jobId]/apply', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

