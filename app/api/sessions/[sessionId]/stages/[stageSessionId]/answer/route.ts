import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; stageSessionId: string }> }
) {
  try {
    const { sessionId, stageSessionId } = await params;
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const questionResponseId = body?.questionResponseId as string | undefined;
    if (!questionResponseId) {
      return NextResponse.json({ error: 'questionResponseId is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data: session } = await supabase
      .from('interview_sessions')
      .select('id, user_id, last_activity_at')
      .eq('id', sessionId)
      .maybeSingle();
    if (!session?.id) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: stageSession } = await supabase
      .from('stage_sessions')
      .select('id, session_id')
      .eq('id', stageSessionId)
      .maybeSingle();
    if (!stageSession?.id || stageSession.session_id !== sessionId) {
      return NextResponse.json({ error: 'Stage session not found' }, { status: 404 });
    }

    const { data: qr } = await supabase
      .from('question_responses')
      .select('id, stage_session_id')
      .eq('id', questionResponseId)
      .maybeSingle();
    if (!qr?.id || qr.stage_session_id !== stageSessionId) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('question_responses')
      .update({
        transcript_text: body?.transcriptText ?? null,
        candidate_audio_url: body?.candidateAudioUrl ?? null,
        score: body?.score ?? null,
        updated_at: now,
      })
      .eq('id', questionResponseId);

    if (error) {
      console.error('Error updating question_response', error);
      return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 });
    }

    await supabase
      .from('interview_sessions')
      .update({ last_activity_at: now })
      .eq('id', sessionId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/sessions/[sessionId]/stages/[stageSessionId]/answer', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

