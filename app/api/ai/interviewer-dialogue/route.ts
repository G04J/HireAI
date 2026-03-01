import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { generateInterviewerDialogue } from '@/ai/flows/interviewer-dialogue';

export async function POST(req: NextRequest) {
  try {
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('[API interviewer-dialogue] request', { intent: body?.intent });
    const result = await generateInterviewerDialogue(body);
    console.log('[API interviewer-dialogue] response', { intent: body?.intent, dialogueLen: result?.dialogue?.length });
    return NextResponse.json(result);
  } catch (err) {
    console.error('POST /api/ai/interviewer-dialogue', err);
    return NextResponse.json({ dialogue: '' });
  }
}
