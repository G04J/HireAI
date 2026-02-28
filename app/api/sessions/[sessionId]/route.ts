import { NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

/** Returns the current session state + the most recent active stageSessionId. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseClient();

    const { data: session } = await supabase
      .from('interview_sessions')
      .select('id, user_id, job_profile_id, application_id, current_stage_index, status')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session?.id) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Find the active stage_session for the current stage index
    const { data: stages } = await supabase
      .from('job_stages')
      .select('id, index')
      .eq('job_profile_id', session.job_profile_id)
      .order('index', { ascending: true });

    const stageIdx = session.current_stage_index ?? 0;
    const currentJobStage = (stages ?? [])[stageIdx];

    let stageSessionId: string | null = null;
    if (currentJobStage?.id) {
      const { data: ss } = await supabase
        .from('stage_sessions')
        .select('id')
        .eq('session_id', sessionId)
        .eq('job_stage_id', currentJobStage.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      stageSessionId = ss?.id ?? null;
    }

    return NextResponse.json({
      sessionId: session.id,
      stageSessionId,
      currentStageIndex: session.current_stage_index ?? 0,
      status: session.status,
    });
  } catch (err) {
    console.error('GET /api/sessions/[sessionId]', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
