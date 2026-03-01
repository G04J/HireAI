import { NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

/**
 * Returns a job profile + stages for a given jobId.
 * Public users only see published jobs.
 * Authenticated users who have an application can always see the job
 * (even if it's been archived after they applied).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const supabase = createServerSupabaseClient();

    const [jobRes, stagesRes] = await Promise.all([
      supabase
        .from('job_profiles')
        .select('id, title, company_name, location, description, seniority, category, must_have_skills, publish_state')
        .eq('id', jobId)
        .maybeSingle(),
      supabase
        .from('job_stages')
        .select('id, index, type, competencies, duration_minutes, ai_usage_policy, question_source')
        .eq('job_profile_id', jobId)
        .order('index', { ascending: true }),
    ]);

    if (!jobRes.data) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobRes.data as Record<string, any>;

    if (job.publish_state !== 'published') {
      let hasAccess = false;
      try {
        const auth = await createAuthClient();
        const { data: { user } } = await auth.auth.getUser();
        if (user) {
          const { data: app } = await supabase
            .from('job_applications')
            .select('id')
            .eq('user_id', user.id)
            .eq('job_profile_id', jobId)
            .limit(1)
            .maybeSingle();
          hasAccess = Boolean(app);
        }
      } catch {
        // Auth unavailable — treat as unauthenticated
      }
      if (!hasAccess) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
    }

    const stages = stagesRes.data ?? [];
    const stageIds = stages.map((s: any) => s.id);

    let questionsByStage: Record<string, any[]> = {};
    if (stageIds.length > 0) {
      const { data: questions } = await supabase
        .from('stage_question_bank')
        .select('id, job_stage_id, question_text, difficulty, mandatory')
        .in('job_stage_id', stageIds)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      for (const q of questions ?? []) {
        const sid = q.job_stage_id;
        if (!questionsByStage[sid]) questionsByStage[sid] = [];
        questionsByStage[sid].push({
          question: q.question_text,
          difficulty: q.difficulty ?? 'medium',
          mandatory: q.mandatory,
          id: q.id,
        });
      }
    }

    const stagesWithQuestions = stages.map((s: any) => ({
      ...s,
      questions: questionsByStage[s.id] ?? [],
    }));

    return NextResponse.json({ job, stages: stagesWithQuestions });
  } catch (err) {
    console.error('GET /api/jobs/[jobId]', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
