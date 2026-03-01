import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { generateEvaluationReport, type GenerateEvaluationReportInput } from '@/ai/flows/generate-evaluation-report-flow';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const clientStageResults = body?.stageResults ?? [];
    const candidateData = body?.candidateData ?? null;
    const resumeFitCheckResult = body?.resumeFitCheckResult ?? null;

    const supabase = createServerSupabaseClient();
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('id, user_id, application_id, job_profile_id, status')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError || !session?.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!session.application_id) {
      return NextResponse.json({ error: 'Session is not linked to an application' }, { status: 400 });
    }

    const { data: application } = await supabase
      .from('job_applications')
      .select('fit_score, matched_skills, missing_skills, resume_text')
      .eq('id', session.application_id)
      .maybeSingle();

    const { data: job } = await supabase
      .from('job_profiles')
      .select('id, title, company_name, description, seniority, must_have_skills')
      .eq('id', session.job_profile_id)
      .single();

    const { data: stages } = await supabase
      .from('job_stages')
      .select('id, type, ai_usage_policy')
      .eq('job_profile_id', session.job_profile_id)
      .order('index', { ascending: true });

    const stagesList = stages ?? [];
    const stageResults: GenerateEvaluationReportInput['stageResults'] = clientStageResults.flatMap(
      (clientStage: { stageType?: string; answers?: Array<{ question?: string; answer?: string; score?: number }> }, idx: number) => {
        const stage = stagesList[idx];
        const stageId = stage?.id ?? '';
        const stageType = clientStage.stageType ?? stage?.type ?? '';
        const aiAllowed = stage ? stage.ai_usage_policy !== 'not_allowed' : false;
        const answers = Array.isArray(clientStage.answers) ? clientStage.answers : [];
        return answers.map((a) => ({
          stageId,
          stageType,
          question: a.question ?? '',
          candidateAnswer: a.answer ?? '',
          aiAllowed,
        }));
      }
    );

    const jobProfile: GenerateEvaluationReportInput['jobProfile'] = {
      title: job?.title ?? 'Job',
      company: job?.company_name ?? 'Company',
      description: job?.description ?? '',
      seniority: job?.seniority ?? '',
      mustHaveSkills: job?.must_have_skills ?? [],
      interviewPipelineConfig: (stages ?? []).map((s) => ({
        stageId: s.id,
        stageType: s.type,
        focusAreas: ['Technical', 'Communication'],
        aiAllowed: s.ai_usage_policy !== 'not_allowed',
      })),
    };

    const userEmail = user.email ?? '';
    const appFitScore = application?.fit_score != null ? Number(application.fit_score) : null;
    const appMatched = application?.matched_skills ?? [];
    const appMissing = application?.missing_skills ?? [];
    const useApplicationResumeFit =
      (resumeFitCheckResult == null || typeof resumeFitCheckResult?.fitScore !== 'number') &&
      appFitScore != null;

    const resumeFit = useApplicationResumeFit
      ? {
          fitScore: Math.min(100, Math.max(0, appFitScore)),
          matchedSkills: Array.isArray(appMatched) ? appMatched : [],
          missingSkills: Array.isArray(appMissing) ? appMissing : [],
          justification: '',
        }
      : {
          fitScore: resumeFitCheckResult?.fitScore ?? 0,
          matchedSkills: resumeFitCheckResult?.matchedSkills ?? [],
          missingSkills: resumeFitCheckResult?.missingSkills ?? [],
          justification: resumeFitCheckResult?.justification ?? '',
        };

    const input: GenerateEvaluationReportInput = {
      jobProfile,
      candidateData: {
        name: candidateData?.name ?? (user.user_metadata?.full_name as string | undefined) ?? userEmail.split('@')[0] ?? 'Candidate',
        email: candidateData?.email ?? userEmail,
        education: candidateData?.education ?? '',
        experienceSummary: candidateData?.experienceSummary ?? '',
        resumeText: candidateData?.resumeText ?? application?.resume_text ?? '',
      },
      resumeFitCheckResult: resumeFit,
      stageResults,
    };

    const report = await generateEvaluationReport(input);

    const now = new Date().toISOString();
    await Promise.all([
      supabase.from('interview_sessions').update({ status: 'completed', last_activity_at: now }).eq('id', sessionId),
      supabase.from('job_applications').update({ status: 'completed', updated_at: now }).eq('id', session.application_id),
      supabase.from('reports').upsert(
        {
          application_id: session.application_id,
          overall_score: report.overallConfidenceScore ?? null,
          recommendation: report.hiringRecommendation,
          report_json: report as unknown as Record<string, unknown>,
          human_readable_report: report.humanReadableReport,
          generated_at: now,
        },
        { onConflict: 'application_id' }
      ),
    ]);

    return NextResponse.json({ 
      success: true, 
      recommendation: report.hiringRecommendation,
      overallConfidenceScore: report.overallConfidenceScore,
    });
  } catch (err) {
    console.error('POST /api/sessions/[sessionId]/complete', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

