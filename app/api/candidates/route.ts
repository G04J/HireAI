import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { createClient as createAuthClient } from '@/lib/supabase/server';

// Back-compat: candidate application now maps to job_applications (per-user)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, formData, fitResult } = body;

    if (!jobId || !formData?.name || !formData?.email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('job_applications')
      .upsert(
        {
          user_id: user.id,
          job_profile_id: jobId,
          status: 'applied',
          current_stage_index: 0,
          applied_at: now,
          updated_at: now,
          resume_text: formData?.resumeText ?? null,
          fit_score: fitResult?.fitScore ?? null,
          fit_decision: typeof fitResult?.fitScore === 'number'
            ? (fitResult.fitScore >= 70 ? 'eligible' : fitResult.fitScore >= 40 ? 'borderline' : 'ineligible')
            : null,
          matched_skills: fitResult?.matchedSkills ?? [],
          missing_skills: fitResult?.missingSkills ?? [],
        },
        { onConflict: 'user_id,job_profile_id' }
      )
      .select('id')
      .single();

    if (error) {
      console.error('Error creating application (legacy /api/candidates)', error);
      return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
    }

    // Preserve old key for older clients, but prefer applicationId.
    return NextResponse.json({ applicationId: data.id, candidateId: data.id });
  } catch (err) {
    console.error('Unexpected error in POST /api/candidates', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

// Deprecated: completion should go through /api/sessions/[sessionId]/complete
export async function PATCH(req: NextRequest) {
  void req;
  return NextResponse.json(
    { error: 'Deprecated. Use /api/sessions/[sessionId]/complete.' },
    { status: 410 }
  );
}

