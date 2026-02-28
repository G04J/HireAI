import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { getEmployerIdForRequest } from '@/server/employer';
import { buildStageRow } from '@/server/jobs/mappers';

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
      category,
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
    if (category !== undefined) updates.category = category;
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

      const stageRows = stages.map((s: any, index: number) => buildStageRow(s, index, jobId));

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

