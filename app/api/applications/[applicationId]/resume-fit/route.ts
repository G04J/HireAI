import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const fitResult = body?.fitResult ?? null;

    const supabase = createServerSupabaseClient();
    const { data: existing, error: existingError } = await supabase
      .from('job_applications')
      .select('id, user_id')
      .eq('id', applicationId)
      .maybeSingle();

    if (existingError || !existing?.id) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('job_applications')
      .update({
        fit_score: fitResult?.fitScore ?? null,
        fit_decision: typeof fitResult?.fitScore === 'number'
          ? (fitResult.fitScore >= 70 ? 'eligible' : fitResult.fitScore >= 40 ? 'borderline' : 'ineligible')
          : null,
        matched_skills: fitResult?.matchedSkills ?? [],
        missing_skills: fitResult?.missingSkills ?? [],
        updated_at: now,
      })
      .eq('id', applicationId);

    if (error) {
      console.error('Error updating resume fit', error);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/applications/[applicationId]/resume-fit', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

