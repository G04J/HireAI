import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { getEmployerIdForRequest } from '@/server/employer';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const employerId = await getEmployerIdForRequest();
    if (!employerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { jobId } = await params;
    const supabase = createServerSupabaseClient();

    const { data: job, error: jobError } = await supabase
      .from('job_profiles')
      .select('id, employer_id, title, company_name, location, category, publish_state')
      .eq('id', jobId)
      .eq('employer_id', employerId)
      .maybeSingle();

    if (jobError || !job?.id) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const { data: apps, error: appsError } = await supabase
      .from('job_applications')
      .select('id, user_id, status, current_stage_index, fit_score, fit_decision, recommendation, applied_at, created_at, updated_at')
      .eq('job_profile_id', jobId)
      .order('created_at', { ascending: false });

    if (appsError) {
      console.error('Error fetching job_applications', appsError);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    const userIds = Array.from(new Set((apps ?? []).map((a) => a.user_id)));
    const { data: users } = userIds.length
      ? await supabase.from('users').select('id, email, full_name, phone, profile_summary').in('id', userIds)
      : { data: [] as { id: string; email: string; full_name: string | null; phone: string | null; profile_summary: string | null }[] };

    const userById = (users ?? []).reduce<Record<string, { id: string; email: string; full_name: string | null; phone: string | null; profile_summary: string | null }>>((acc, u) => {
      acc[u.id] = u;
      return acc;
    }, {});

    const applicationIds = (apps ?? []).map((a) => a.id);
    const { data: reports } = applicationIds.length
      ? await supabase.from('reports').select('application_id, recommendation, overall_score, report_json, human_readable_report, generated_at').in('application_id', applicationIds)
      : { data: [] as { application_id: string; recommendation: string | null; overall_score: number | null; report_json: any; human_readable_report: string | null; generated_at: string }[] };

    const reportByApplicationId = (reports ?? []).reduce<Record<string, { recommendation: string | null; overall_score: number | null; report_json: any; human_readable_report: string | null; generated_at: string }>>((acc, r) => {
      acc[r.application_id] = { recommendation: r.recommendation, overall_score: r.overall_score, report_json: r.report_json, human_readable_report: r.human_readable_report, generated_at: r.generated_at };
      return acc;
    }, {});

    const applications = (apps ?? []).map((a) => ({
      ...a,
      user: userById[a.user_id] ?? null,
      report: reportByApplicationId[a.id] ?? null,
    }));

    return NextResponse.json({ job, applications });
  } catch (err) {
    console.error('GET /api/employer/jobs/[jobId]/applications', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

