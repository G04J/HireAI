import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { getEmployerIdForRequest } from '@/server/employer';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const employerId = await getEmployerIdForRequest();
    if (!employerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { applicationId } = await params;
    const supabase = createServerSupabaseClient();

    const { data: app, error: appError } = await supabase
      .from('job_applications')
      .select('id, job_profile_id')
      .eq('id', applicationId)
      .maybeSingle();

    if (appError || !app?.id) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const { data: job } = await supabase
      .from('job_profiles')
      .select('id, employer_id')
      .eq('id', app.job_profile_id)
      .maybeSingle();

    if (!job?.id || job.employer_id !== employerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: report } = await supabase
      .from('reports')
      .select('*')
      .eq('application_id', applicationId)
      .maybeSingle();

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (err) {
    console.error('GET /api/employer/applications/[applicationId]/report', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

