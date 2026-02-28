import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { getEmployerIdForRequest } from '@/lib/employer-default';

type Params = Promise<{ jobId: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const { jobId } = await params;
    const employerId = await getEmployerIdForRequest();
    if (!employerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = createServerSupabaseClient();

    const { data: profile, error: profileError } = await supabase
      .from('job_profiles')
      .select('*')
      .eq('id', jobId)
      .eq('employer_id', employerId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const { data: stages, error: stagesError } = await supabase
      .from('job_stages')
      .select('*')
      .eq('job_profile_id', jobId)
      .order('index');

    if (stagesError) {
      console.error('Error fetching stages', stagesError);
    }

    return NextResponse.json({
      job: profile,
      stages: stages ?? [],
    });
  } catch (err) {
    console.error('GET /api/employer/jobs/[jobId]', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const { jobId } = await params;
    const employerId = await getEmployerIdForRequest();
    if (!employerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const supabase = createServerSupabaseClient();

    const { data: existing } = await supabase
      .from('job_profiles')
      .select('id')
      .eq('id', jobId)
      .eq('employer_id', employerId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const {
      title,
      companyName,
      location,
      description,
      seniority,
      mustHaveSkills,
      pipelineConfig,
      publishState,
      publicSlug,
      stages,
    } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (companyName !== undefined) updates.company_name = companyName;
    if (location !== undefined) updates.location = location;
    if (description !== undefined) updates.description = description;
    if (seniority !== undefined) updates.seniority = seniority;
    if (mustHaveSkills !== undefined) updates.must_have_skills = mustHaveSkills;
    if (pipelineConfig !== undefined) updates.pipeline_config = pipelineConfig;
    if (publishState !== undefined) {
      updates.publish_state = publishState;
      if (publishState === 'published' && publicSlug === undefined) {
        const { data: current } = await supabase.from('job_profiles').select('public_slug').eq('id', jobId).single();
        if (!current?.public_slug) {
          updates.public_slug = `job-${jobId.slice(0, 8)}`;
        }
      }
    }
    if (publicSlug !== undefined) updates.public_slug = publicSlug;

    if (Object.keys(updates).length > 1) {
      const { error: updateError } = await supabase
        .from('job_profiles')
        .update(updates)
        .eq('id', jobId);

      if (updateError) {
        console.error('Error updating job_profile', updateError);
        return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
      }
    }

    if (Array.isArray(stages)) {
      const { error: delError } = await supabase
        .from('job_stages')
        .delete()
        .eq('job_profile_id', jobId);

      if (delError) {
        console.error('Error deleting old stages', delError);
      }

      const stageRows = stages.map((s: any, index: number) => ({
        job_profile_id: jobId,
        index,
        type: mapStageType(s.type),
        duration_minutes: s.durationMinutes ?? s.duration_minutes ?? null,
        ai_usage_policy: mapAiPolicy(s.aiAllowed, s.ai_usage_policy),
        proctoring_policy: mapProctoring(s.proctoring_policy),
        competencies: s.competencies ?? s.focusAreas ?? null,
        stage_weights: s.stage_weights ?? null,
        interviewer_voice_id: s.interviewer_voice_id ?? s.voicePreset ?? s.voice ?? null,
        question_source: mapQuestionSource(s.question_source),
      }));

      if (stageRows.length > 0) {
        const { error: insertError } = await supabase.from('job_stages').insert(stageRows);
        if (insertError) {
          console.error('Error inserting stages', insertError);
          return NextResponse.json({ error: 'Failed to update stages' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/employer/jobs/[jobId]', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

function mapStageType(t: string): 'behavioral' | 'coding' | 'case' | 'leadership' {
  const v = (t || '').toLowerCase();
  if (v.includes('behavioral') || v.includes('culture')) return 'behavioral';
  if (v.includes('cod') || v.includes('technical')) return 'coding';
  if (v.includes('case')) return 'case';
  if (v.includes('leadership')) return 'leadership';
  return 'behavioral';
}

function mapAiPolicy(aiAllowed: boolean | undefined, policy: string | undefined): 'allowed' | 'not_allowed' | 'limited' {
  if (policy === 'not_allowed' || policy === 'limited') return policy;
  return aiAllowed ? 'allowed' : 'not_allowed';
}

function mapProctoring(p: string | undefined): 'relaxed' | 'moderate' | 'strict' | 'exam' {
  const v = (p || 'relaxed').toLowerCase();
  if (['moderate', 'strict', 'exam'].includes(v)) return v as 'moderate' | 'strict' | 'exam';
  return 'relaxed';
}

function mapQuestionSource(s: string | undefined): 'employer_only' | 'hybrid' | 'ai_only' {
  const v = (s || 'employer_only').toLowerCase();
  if (v === 'hybrid' || v === 'ai_only') return v;
  return 'employer_only';
}
