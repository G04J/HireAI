import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { getEmployerIdForRequest } from '@/lib/employer-default';

export async function GET() {
  try {
    const employerId = await getEmployerIdForRequest();
    if (!employerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = createServerSupabaseClient();

    const { data: profiles, error: profileError } = await supabase
      .from('job_profiles')
      .select('*')
      .eq('employer_id', employerId)
      .order('updated_at', { ascending: false });

    if (profileError) {
      console.error('Error fetching job_profiles', profileError);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length === 0) {
      return NextResponse.json({ jobs: [] });
    }

    const { data: stages, error: stagesError } = await supabase
      .from('job_stages')
      .select('id, job_profile_id, index, type')
      .in('job_profile_id', ids)
      .order('job_profile_id')
      .order('index');

    if (stagesError) {
      console.error('Error fetching job_stages', stagesError);
    }

    const stagesByJob = (stages ?? []).reduce<Record<string, unknown[]>>((acc, s) => {
      const jid = s.job_profile_id;
      if (!acc[jid]) acc[jid] = [];
      acc[jid].push(s);
      return acc;
    }, {});

    const jobs = (profiles ?? []).map((p) => ({
      ...p,
      stages: stagesByJob[p.id] ?? [],
    }));

    return NextResponse.json({ jobs });
  } catch (err) {
    console.error('GET /api/employer/jobs', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const employerId = await getEmployerIdForRequest();
    if (!employerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();

    const {
      title,
      companyName,
      location,
      description,
      seniority,
      mustHaveSkills,
      pipelineConfig,
      publishState,
      stages,
    } = body;

    if (!title || !companyName || !description || !seniority) {
      return NextResponse.json(
        { error: 'Missing required fields: title, companyName, description, seniority' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const profilePayload = {
      employer_id: employerId,
      title,
      company_name: companyName,
      location: location ?? null,
      description,
      seniority,
      must_have_skills: Array.isArray(mustHaveSkills) ? mustHaveSkills : [],
      pipeline_config: pipelineConfig ?? null,
      publish_state: publishState ?? 'draft',
      public_slug: null,
    };

    const { data: profile, error: profileError } = await supabase
      .from('job_profiles')
      .insert(profilePayload)
      .select('id')
      .single();

    if (profileError || !profile?.id) {
      console.error('Error creating job_profile', profileError);
      return NextResponse.json({ error: 'Failed to create job profile' }, { status: 500 });
    }

    const stageRows = Array.isArray(stages)
      ? stages.map((s: any, index: number) => ({
          job_profile_id: profile.id,
          index,
          type: mapStageType(s.type),
          duration_minutes: s.durationMinutes ?? s.duration_minutes ?? null,
          ai_usage_policy: mapAiPolicy(s.aiAllowed, s.ai_usage_policy),
          proctoring_policy: mapProctoring(s.proctoring_policy),
          competencies: s.competencies ?? s.focusAreas ?? null,
          stage_weights: s.stage_weights ?? null,
          interviewer_voice_id: s.interviewer_voice_id ?? s.voicePreset ?? s.voice ?? null,
          question_source: mapQuestionSource(s.question_source),
        }))
      : [];

    if (stageRows.length > 0) {
      const { error: stagesError } = await supabase.from('job_stages').insert(stageRows);
      if (stagesError) {
        console.error('Error creating job_stages', stagesError);
        // Profile already created; optionally roll back or leave stages for later
      }
    }

    return NextResponse.json({
      success: true,
      jobId: profile.id,
      job: { id: profile.id, ...profilePayload, stages: stageRows.length },
    });
  } catch (err) {
    console.error('POST /api/employer/jobs', err);
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
  if (['moderate', 'strict', 'exam'].includes(v)) return v as any;
  return 'relaxed';
}

function mapQuestionSource(s: string | undefined): 'employer_only' | 'hybrid' | 'ai_only' {
  const v = (s || 'employer_only').toLowerCase();
  if (v === 'hybrid' || v === 'ai_only') return v;
  return 'employer_only';
}
