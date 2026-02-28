import { NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { generateEvaluationReport, type GenerateEvaluationReportInput } from '@/ai/flows/generate-evaluation-report-flow';

/**
 * Abandon an active interview session.
 * Mirrors traditional hiring: leaving mid-interview ends the session permanently.
 * Candidate is evaluated on completed portion only. No rejoin allowed.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
    }
    if (!session.application_id) {
      return NextResponse.json({ error: 'Session is not linked to an application' }, { status: 400 });
    }

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

    const { data: stageSessions } = await supabase
      .from('stage_sessions')
      .select('id, job_stage_id')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    const stageResults: GenerateEvaluationReportInput['stageResults'] = [];

    for (const ss of stageSessions ?? []) {
      const jobStage = (stages ?? []).find((s) => s.id === ss.job_stage_id);
      const { data: responses } = await supabase
        .from('question_responses')
        .select('id, question_text, transcript_text')
        .eq('stage_session_id', ss.id)
        .order('question_index', { ascending: true });

      for (const qr of responses ?? []) {
        if (qr.transcript_text) {
          stageResults.push({
            stageId: ss.job_stage_id,
            stageType: jobStage?.type ?? 'behavioral',
            question: qr.question_text ?? '',
            candidateAnswer: qr.transcript_text,
            aiAllowed: jobStage?.ai_usage_policy !== 'not_allowed',
          });
        }
      }
    }

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
    const input: GenerateEvaluationReportInput = {
      jobProfile,
      candidateData: {
        name: (user.user_metadata?.full_name as string | undefined) ?? userEmail.split('@')[0] ?? 'Candidate',
        email: userEmail,
        education: '',
        experienceSummary: '',
        resumeText: '',
      },
      resumeFitCheckResult: {
        fitScore: 0,
        matchedSkills: [],
        missingSkills: [],
        justification: 'Resume not evaluated during partial interview.',
      },
      stageResults,
    };

    let report;
    if (stageResults.length === 0) {
      report = {
        overallSummary: 'Candidate left the interview before completing any questions. No evaluation possible.',
        hiringRecommendation: 'No Hire' as const,
        overallConfidenceScore: 0,
        jobFitAnalysis: { fitLevel: 'Weak Fit' as const, matchedCompetencies: [], gapAreas: ['Incomplete interview'], growthPotential: 'Unable to assess.' },
        communicationAssessment: { clarity: 0, articulation: 0, confidence: 0, overallCommunicationScore: 0, feedback: 'No responses recorded.' },
        resumeAnalysis: { fitScore: 0, matchedSkills: [], missingSkills: [], justification: 'Interview abandoned before completion.' },
        stageEvaluations: [],
        humanReadableReport: '## Interview Abandoned\n\nThe candidate left the interview before completing any questions. No evaluation is available.',
      };
    } else {
      report = await generateEvaluationReport(input);
    }

    const now = new Date().toISOString();
    await Promise.all([
      supabase.from('interview_sessions').update({ status: 'abandoned', last_activity_at: now }).eq('id', sessionId),
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
    console.error('POST /api/sessions/[sessionId]/abandon', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
