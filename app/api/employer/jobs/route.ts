import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { getEmployerIdForRequest } from '@/server/employer';
import { buildStageRow } from '@/server/jobs/mappers';

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
      category,
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
      category: category ?? null,
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
      ? stages.map((s: any, index: number) => buildStageRow(s, index, profile.id))
      : [];

    let insertedStages: { id: string; index: number }[] = [];

    if (stageRows.length > 0) {
      const { data: stageData, error: stagesError } = await supabase
        .from('job_stages')
        .insert(stageRows)
        .select('id, index');
      if (stagesError) {
        console.error('Error creating job_stages', stagesError);
      }
      insertedStages = stageData ?? [];
    }

    if (insertedStages.length > 0 && Array.isArray(stages)) {
      const questionRows: any[] = [];
      for (const inserted of insertedStages) {
        const srcStage = stages[inserted.index];
        const questions = srcStage?.questions ?? [];
        for (const q of questions) {
          questionRows.push({
            employer_id: employerId,
            job_stage_id: inserted.id,
            job_profile_id: profile.id,
            question_text: q.question ?? q.question_text,
            difficulty: q.difficulty ?? null,
            category: null,
            mandatory: false,
          });
        }
      }
      if (questionRows.length > 0) {
        const { error: qError } = await supabase
          .from('stage_question_bank')
          .insert(questionRows);
        if (qError) {
          console.error('Error saving stage questions', qError);
        }
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

