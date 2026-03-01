import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { generateFollowUp } from '@/ai/flows/generate-followup-question';

export async function POST(req: NextRequest) {
  try {
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = await generateFollowUp(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error('POST /api/ai/generate-followup', err);
    return NextResponse.json({ shouldFollowUp: false });
  }
}
