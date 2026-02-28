import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const supabase = createServerSupabaseClient();

    const { data: session } = await supabase
      .from('interview_sessions')
      .select('id, user_id, job_profile_id')
      .eq('id', sessionId)
      .maybeSingle();
    if (!session?.id) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('focus_events')
      .insert({
        candidate_id: user.id,
        job_profile_id: session.job_profile_id,
        stage_id: body?.stageId ?? null,
        stage_session_id: body?.stageSessionId ?? null,
        event_type: body?.eventType,
        started_at: body?.startedAt ?? now,
        ended_at: body?.endedAt ?? null,
        duration_ms: body?.durationMs ?? null,
        policy: body?.policy ?? 'relaxed',
        explanation: body?.explanation ?? null,
        created_at: now,
      });

    if (error) {
      console.error('Error inserting focus_event', error);
      return NextResponse.json({ error: 'Failed to log focus event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/sessions/[sessionId]/focus-event', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

