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
      .select('id, user_id')
      .eq('id', sessionId)
      .maybeSingle();
    if (!session?.id) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { error } = await supabase
      .from('tool_usage_logs')
      .insert({
        session_id: sessionId,
        stage_id: body?.stageId ?? null,
        stage_session_id: body?.stageSessionId ?? null,
        tool_type: body?.toolType,
        prompt: body?.prompt,
        response_excerpt: body?.responseExcerpt ?? null,
        full_response_ref: body?.fullResponseRef ?? null,
        validation_note: body?.validationNote ?? null,
      });

    if (error) {
      console.error('Error inserting tool_usage_log', error);
      return NextResponse.json({ error: 'Failed to log tool usage' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/sessions/[sessionId]/tool-usage', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

