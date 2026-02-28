import { NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const { data: app, error: appError } = await supabase
      .from('job_applications')
      .select('id, user_id, job_profile_id, status')
      .eq('id', applicationId)
      .maybeSingle();

    if (appError || !app?.id) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    if (app.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If an active session exists, reuse it.
    const existingSession = await supabase
      .from('interview_sessions')
      .select('id')
      .eq('application_id', applicationId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();
    const sessionId = existingSession.data?.id ?? null;
    let finalSessionId = sessionId;

    if (!finalSessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('interview_sessions')
        .insert({
          application_id: applicationId,
          user_id: user.id,
          job_profile_id: app.job_profile_id,
          current_stage_index: 0,
          current_question_index: 0,
          status: 'active',
          started_at: now,
          last_activity_at: now,
        })
        .select('id')
        .single();

      if (sessionError || !session?.id) {
        console.error('Error creating interview_session', sessionError);
        return NextResponse.json({ error: 'Failed to start session' }, { status: 500 });
      }
      finalSessionId = session.id;
    }

    // Ensure first stage session exists.
    const { data: firstStage } = await supabase
      .from('job_stages')
      .select('id')
      .eq('job_profile_id', app.job_profile_id)
      .order('index', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!firstStage?.id) {
      return NextResponse.json({ error: 'Job has no stages configured' }, { status: 400 });
    }

    const existingStageSession = await supabase
      .from('stage_sessions')
      .select('id')
      .eq('session_id', finalSessionId)
      .eq('job_stage_id', firstStage.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let stageSessionId = existingStageSession.data?.id ?? null;
    if (!stageSessionId) {
      const { data: stageSession, error: stageSessionError } = await supabase
        .from('stage_sessions')
        .insert({
          session_id: finalSessionId,
          job_stage_id: firstStage.id,
          status: 'running',
          current_question_index: 0,
          started_at: now,
        })
        .select('id')
        .single();

      if (stageSessionError || !stageSession?.id) {
        console.error('Error creating stage_session', stageSessionError);
        return NextResponse.json({ error: 'Failed to start stage' }, { status: 500 });
      }
      stageSessionId = stageSession.id;
    }

    // Update application status as in_interview.
    await supabase
      .from('job_applications')
      .update({ status: 'in_interview', updated_at: now })
      .eq('id', applicationId);

    return NextResponse.json({ sessionId: finalSessionId, stageSessionId });
  } catch (err) {
    console.error('POST /api/applications/[applicationId]/session/start', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

