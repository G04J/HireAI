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
    const supabase = createServerSupabaseClient();

    const { data: session } = await supabase
      .from('interview_sessions')
      .select('id, user_id')
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

    const { data: row, error } = await supabase
      .from('case_submissions')
      .insert({
        stage_session_id: stageSessionId,
        response_transcript: body?.responseTranscript ?? null,
        score: body?.score ?? null,
      })
      .select('id')
      .single();

    if (error || !row?.id) {
      console.error('Error creating case_submission', error);
      return NextResponse.json({ error: 'Failed to save case response' }, { status: 500 });
    }

    return NextResponse.json({ caseSubmissionId: row.id });
  } catch (err) {
    console.error('POST /api/sessions/[sessionId]/stages/[stageSessionId]/case', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

