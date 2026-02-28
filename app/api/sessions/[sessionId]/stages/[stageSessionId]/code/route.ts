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
      .from('code_submissions')
      .insert({
        stage_session_id: stageSessionId,
        language: body?.language ?? null,
        code_text: body?.codeText ?? null,
        run_output: body?.runOutput ?? null,
        tests_output: body?.testsOutput ?? null,
        explanation_transcript: body?.explanationTranscript ?? null,
        score: body?.score ?? null,
      })
      .select('id')
      .single();

    if (error || !row?.id) {
      console.error('Error creating code_submission', error);
      return NextResponse.json({ error: 'Failed to save code' }, { status: 500 });
    }

    return NextResponse.json({ codeSubmissionId: row.id });
  } catch (err) {
    console.error('POST /api/sessions/[sessionId]/stages/[stageSessionId]/code', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

