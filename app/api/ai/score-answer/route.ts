import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { scoreCandidateAnswer } from '@/ai/flows/score-candidate-answer';

export async function POST(req: NextRequest) {
  try {
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { jobProfile, stageConfig, question, answer } = body;

    if (!question || !answer) {
      return NextResponse.json({ error: 'question and answer are required' }, { status: 400 });
    }

    const result = await scoreCandidateAnswer({ jobProfile, stageConfig, question, answer });
    return NextResponse.json(result);
  } catch (err) {
    console.error('POST /api/ai/score-answer', err);
    return NextResponse.json({ score: 0, feedback: 'Scoring unavailable at this time.' });
  }
}
