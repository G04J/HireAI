import { NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

/**
 * Advances the interview session to the next stage.
 * Creates a new stage_session row and updates current_stage_index on the session.
 * Returns { stageSessionId, stageIndex, jobStageId, isLastStage }.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseClient();

    // Load session
    const { data: session } = await supabase
      .from('interview_sessions')
      .select('id, user_id, job_profile_id, current_stage_index, status')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session?.id) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (session.status !== 'active') return NextResponse.json({ error: 'Session is not active' }, { status: 400 });

    // Load all stages for this job in order
    const { data: allStages } = await supabase
      .from('job_stages')
      .select('id, index')
      .eq('job_profile_id', session.job_profile_id)
      .order('index', { ascending: true });

    const stages = allStages ?? [];
    const nextIndex = (session.current_stage_index ?? 0) + 1;

    if (nextIndex >= stages.length) {
      return NextResponse.json({ isLastStage: true, stageSessionId: null, stageIndex: nextIndex });
    }

    const nextStage = stages[nextIndex];
    const now = new Date().toISOString();

    // Create stage_session for the next stage
    const { data: stageSession, error: ssError } = await supabase
      .from('stage_sessions')
      .insert({
        session_id: sessionId,
        job_stage_id: nextStage.id,
        status: 'running',
        current_question_index: 0,
        started_at: now,
      })
      .select('id')
      .single();

    if (ssError || !stageSession?.id) {
      console.error('Error creating stage_session for next stage', ssError);
      return NextResponse.json({ error: 'Failed to advance stage' }, { status: 500 });
    }

    // Update session's current stage index
    await supabase
      .from('interview_sessions')
      .update({ current_stage_index: nextIndex, last_activity_at: now })
      .eq('id', sessionId);

    return NextResponse.json({
      stageSessionId: stageSession.id,
      stageIndex: nextIndex,
      jobStageId: nextStage.id,
      isLastStage: nextIndex === stages.length - 1,
    });
  } catch (err) {
    console.error('POST /api/sessions/[sessionId]/stages/next', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
