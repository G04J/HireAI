import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { generateInterviewQuestions } from '@/ai/flows/generate-interview-questions';

export async function POST(req: NextRequest) {
  try {
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { jobDescription, stageFocusAreas, numQuestions } = body;

    if (!jobDescription || !stageFocusAreas) {
      return NextResponse.json({ error: 'jobDescription and stageFocusAreas are required' }, { status: 400 });
    }

    const result = await generateInterviewQuestions({
      jobDescription,
      stageFocusAreas,
      numQuestions: numQuestions ?? 3,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('POST /api/ai/generate-questions', err);
    // Return fallback questions so the interview can still proceed
    return NextResponse.json({
      questions: [
        { question: 'Tell me about your most relevant experience for this role.', difficulty: 'easy' },
        { question: 'Describe a challenging situation you faced and how you handled it.', difficulty: 'medium' },
        { question: 'What is your approach to continuous learning and skill development?', difficulty: 'medium' },
      ],
    });
  }
}
