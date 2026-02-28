import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  CheckCircle2, 
  ArrowRight, 
  Star, 
  Target,
  MessageSquare,
  FileText,
  TrendingUp,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

type ReportJson = {
  overallSummary?: string;
  hiringRecommendation?: string;
  overallConfidenceScore?: number;
  jobFitAnalysis?: {
    fitLevel?: string;
    matchedCompetencies?: string[];
    gapAreas?: string[];
    growthPotential?: string;
  };
  communicationAssessment?: {
    clarity?: number;
    articulation?: number;
    confidence?: number;
    overallCommunicationScore?: number;
    feedback?: string;
  };
  resumeAnalysis?: {
    fitScore?: number;
    matchedSkills?: string[];
    missingSkills?: string[];
    justification?: string;
  };
  stageEvaluations?: Array<{
    stageId?: string;
    stageType?: string;
    performanceSummary?: string;
    score?: number;
    strengths?: string[];
    areasForImprovement?: string[];
  }>;
  humanReadableReport?: string;
};

async function getCompletedData(candidateId: string, jobId: string) {
  const supabase = createServerSupabaseClient();

  const [jobRes, appRes] = await Promise.all([
    supabase
      .from('job_profiles')
      .select('title, company_name')
      .eq('id', jobId)
      .maybeSingle(),
    supabase
      .from('job_applications')
      .select('id, status, fit_score, recommendation')
      .eq('user_id', candidateId)
      .eq('job_profile_id', jobId)
      .maybeSingle(),
  ]);

  let report: { recommendation?: string; overall_score?: number; report_json?: ReportJson; human_readable_report?: string } | null = null;
  if (appRes.data?.id) {
    const { data: rep } = await supabase
      .from('reports')
      .select('recommendation, overall_score, report_json, human_readable_report')
      .eq('application_id', appRes.data.id)
      .maybeSingle();
    report = rep ?? null;
  }

  return { job: jobRes.data, application: appRes.data, report };
}

function ScoreRing({ score, size = 120, label }: { score: number; size?: number; label?: string }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const getColor = (s: number) => {
    if (s >= 80) return 'text-green-400';
    if (s >= 60) return 'text-blue-400';
    if (s >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-slate-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-1000 ${getColor(score)}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-3xl font-bold ${getColor(score)}`}>{score}</span>
        </div>
      </div>
      {label && <span className="text-sm text-slate-400">{label}</span>}
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return 'bg-green-500';
    if (s >= 60) return 'bg-blue-500';
    if (s >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="font-medium text-white">{score}/100</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${getColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default async function CompletedPage({
  params,
}: {
  params: Promise<{ candidateId: string; jobId: string }>;
}) {
  const { candidateId, jobId } = await params;
  const { job, application, report } = await getCompletedData(candidateId, jobId);

  const reportJson = report?.report_json as ReportJson | undefined;
  const overallScore = report?.overall_score ?? reportJson?.overallConfidenceScore ?? 0;
  const recommendation = report?.recommendation ?? reportJson?.hiringRecommendation ?? null;
  const isPositive = recommendation && ['Strong Hire', 'Hire'].some((r) => recommendation.includes(r));
  const isNegative = recommendation && ['No Hire'].some((r) => recommendation.includes(r));

  const jobFit = reportJson?.jobFitAnalysis;
  const communication = reportJson?.communicationAssessment;
  const resumeAnalysis = reportJson?.resumeAnalysis;
  const stageEvaluations = reportJson?.stageEvaluations ?? [];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-white">
      <header className="px-6 h-20 flex items-center border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <Link href={`/candidate/${candidateId}`} className="flex items-center gap-2 group">
          <div className="p-2 bg-blue-600 rounded-xl text-white group-hover:scale-105 transition-transform shadow-lg shadow-blue-600/40">
            <Shield className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">AegisHire</span>
        </Link>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 lg:p-10">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-white">Interview Complete!</h1>
          {job && (
            <p className="text-slate-400 text-lg">
              Assessment for <span className="font-semibold text-white">{job.title}</span> at{' '}
              <span className="font-semibold text-white">{job.company_name}</span>
            </p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <Card className={`lg:col-span-1 border-2 ${isPositive ? 'border-green-500/30 bg-green-500/10' : isNegative ? 'border-red-500/30 bg-red-500/10' : 'border-blue-500/30 bg-blue-500/10'}`}>
            <CardContent className="pt-6 flex flex-col items-center gap-4">
              <ScoreRing score={overallScore} label="Confidence Score" />
              {recommendation && (
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">AI Recommendation</p>
                  <Badge
                    className={`text-base px-4 py-1 ${isPositive ? 'bg-green-500/20 text-green-400 border-green-500/30' : isNegative ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-slate-700 text-slate-300'}`}
                  >
                    {recommendation}
                  </Badge>
                </div>
              )}
              {jobFit?.fitLevel && (
                <Badge variant="outline" className="mt-2 border-white/20 text-slate-300">
                  {jobFit.fitLevel}
                </Badge>
              )}
            </CardContent>
          </Card>

          {jobFit && (
            <Card className="lg:col-span-2 bg-slate-900/60 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <Target className="w-5 h-5 text-blue-400" />
                  Job Fit Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {jobFit.matchedCompetencies && jobFit.matchedCompetencies.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-2">Matched Competencies</p>
                    <div className="flex flex-wrap gap-2">
                      {jobFit.matchedCompetencies.map((comp, i) => (
                        <Badge key={i} className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {comp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {jobFit.gapAreas && jobFit.gapAreas.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-2">Gap Areas</p>
                    <div className="flex flex-wrap gap-2">
                      {jobFit.gapAreas.map((gap, i) => (
                        <Badge key={i} className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {gap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {jobFit.growthPotential && (
                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-2">
                      <TrendingUp className="w-4 h-4 inline mr-1" />
                      Growth Potential
                    </p>
                    <p className="text-sm text-slate-300">{jobFit.growthPotential}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {communication && (
            <Card className="bg-slate-900/60 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                  Communication Quality
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScoreBar label="Clarity" score={communication.clarity ?? 0} />
                <ScoreBar label="Articulation" score={communication.articulation ?? 0} />
                <ScoreBar label="Confidence" score={communication.confidence ?? 0} />
                <div className="pt-2 border-t border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-white">Overall Communication</span>
                    <span className="text-xl font-bold text-white">{communication.overallCommunicationScore ?? 0}/100</span>
                  </div>
                  {communication.feedback && (
                    <p className="text-sm text-slate-400">{communication.feedback}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {resumeAnalysis && (
            <Card className="bg-slate-900/60 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Resume Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Resume Fit Score</span>
                  <span className="text-2xl font-bold text-white">{resumeAnalysis.fitScore ?? 0}/100</span>
                </div>
                <Progress value={resumeAnalysis.fitScore ?? 0} className="h-2 bg-slate-700" />
                
                {resumeAnalysis.matchedSkills && resumeAnalysis.matchedSkills.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-2">Matched Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {resumeAnalysis.matchedSkills.map((skill, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-green-500/10 border-green-500/30 text-green-400">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {resumeAnalysis.missingSkills && resumeAnalysis.missingSkills.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-2">Missing Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {resumeAnalysis.missingSkills.map((skill, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-red-500/10 border-red-500/30 text-red-400">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {resumeAnalysis.justification && (
                  <p className="text-sm text-slate-400 pt-2 border-t border-white/10">{resumeAnalysis.justification}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {stageEvaluations.length > 0 && (
          <Card className="mb-8 bg-slate-900/60 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-blue-400" />
                Stage-by-Stage Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stageEvaluations.map((stage, i) => (
                <div key={i} className="p-4 rounded-lg bg-slate-800/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize bg-slate-700 text-slate-200">{stage.stageType}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Score:</span>
                      <span className={`font-bold ${(stage.score ?? 0) >= 70 ? 'text-green-400' : (stage.score ?? 0) >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {stage.score ?? 0}/100
                      </span>
                    </div>
                  </div>
                  {stage.performanceSummary && (
                    <p className="text-sm text-slate-300">{stage.performanceSummary}</p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {stage.strengths && stage.strengths.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-400 mb-1">Strengths</p>
                        <ul className="text-xs space-y-1 text-slate-300">
                          {stage.strengths.map((s, j) => (
                            <li key={j} className="flex items-start gap-1">
                              <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {stage.areasForImprovement && stage.areasForImprovement.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-amber-400 mb-1">Areas for Improvement</p>
                        <ul className="text-xs space-y-1 text-slate-300">
                          {stage.areasForImprovement.map((a, j) => (
                            <li key={j} className="flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {reportJson?.overallSummary && (
          <Card className="mb-8 bg-slate-900/60 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <Star className="w-5 h-5 text-blue-400" />
                Overall Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-slate-300">{reportJson.overallSummary}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-600/30">
            <Link href={`/candidate/${candidateId}`}>
              Back to dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
            <Link href="/candidate/jobs">Browse more jobs</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
