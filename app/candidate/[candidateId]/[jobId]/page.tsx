import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SiteLogo } from '@/components/site-logo';
import {
  Briefcase,
  MapPin,
  Clock,
  Zap,
  Wifi,
  Volume2,
  ChevronRight,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { StartInterviewButton } from './start-interview-button';
import { ApplyButton } from './apply-button';

async function getJobAndApplication(candidateId: string, jobId: string) {
  const supabase = createServerSupabaseClient();

  const [jobRes, appRes, stagesRes] = await Promise.all([
    supabase
      .from('job_profiles')
      .select('id, title, company_name, location, description, seniority, category, must_have_skills, publish_state')
      .eq('id', jobId)
      .maybeSingle(),
    supabase
      .from('job_applications')
      .select('id, status, current_stage_index, applied_at')
      .eq('user_id', candidateId)
      .eq('job_profile_id', jobId)
      .maybeSingle(),
    supabase
      .from('job_stages')
      .select('id, index, type, competencies, duration_minutes')
      .eq('job_profile_id', jobId)
      .order('index', { ascending: true }),
  ]);

  return {
    job: jobRes.data ?? null,
    application: appRes.data ?? null,
    stages: stagesRes.data ?? [],
  };
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    applied: 'Applied',
    screening: 'Screening',
    in_interview: 'In progress',
    completed: 'Completed',
    offered: 'Offered',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
    invited: 'Invited',
  };
  return map[status] ?? status;
}

function stageTypeLabel(type: string) {
  const map: Record<string, string> = {
    behavioral: 'Behavioral Q&A',
    coding: 'Technical Coding',
    case: 'Case Simulation',
    leadership: 'Leadership',
  };
  return map[type] ?? type;
}

function ProcessStep({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-4 p-5 rounded-xl bg-slate-800/40 border border-white/10 group hover:border-blue-500/40 hover:shadow-md transition-all">
      <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
        {number}
      </div>
      <div className="space-y-1">
        <h4 className="font-bold flex items-center gap-2 text-white">
          {title}
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
        </h4>
        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default async function CandidateJobLanding({
  params,
}: {
  params: Promise<{ candidateId: string; jobId: string }>;
}) {
  const { candidateId, jobId } = await params;

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect(`/login?next=/candidate/${candidateId}/${jobId}`);
  }

  if (user.id !== candidateId) {
    redirect(`/candidate/${user.id}/${jobId}`);
  }

  const { job, application, stages } = await getJobAndApplication(candidateId, jobId);

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <Card className="max-w-md w-full text-center p-8 bg-slate-900/60 border-white/10">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-white">Job not found</h2>
          <p className="text-slate-400 mb-6">This job posting doesn&apos;t exist or has been removed.</p>
          <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white border-0"><Link href="/candidate/jobs">Browse jobs</Link></Button>
        </Card>
      </div>
    );
  }

  if (!application) {
    return <ApplyView candidateId={candidateId} jobId={jobId} job={job} stages={stages} />;
  }

  const supabase = createServerSupabaseClient();
  const { data: existingSession } = await supabase
    .from('interview_sessions')
    .select('id')
    .eq('application_id', application.id)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // If they started the interview but left midway, count it as submitted (no resume).
  if (existingSession?.id) {
    const now = new Date().toISOString();
    await supabase
      .from('job_applications')
      .update({ status: 'completed', updated_at: now })
      .eq('id', application.id);
    await supabase
      .from('interview_sessions')
      .update({ status: 'abandoned' })
      .eq('id', existingSession.id);
  }

  const isCompleted = application.status === 'completed' || Boolean(existingSession?.id);
  const isRejected = ['rejected', 'withdrawn'].includes(application.status);
  const canStart = !isCompleted && !isRejected;
  const resumeSessionId = null; // Never allow resume; leaving midway counts as submitted.

  const totalMinutes = stages.reduce((sum, s) => sum + (s.duration_minutes ?? 15), 0) || stages.length * 15;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-white">
      <header className="px-3 h-20 flex items-center border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <SiteLogo href={`/candidate/${candidateId}`} height={40} />
        <nav className="ml-auto flex items-center gap-6 text-sm">
          <Link href={`/candidate/${candidateId}`} className="font-medium text-slate-400 hover:text-white transition-colors">
            My applications
          </Link>
        </nav>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-10">
        <div className="grid lg:grid-cols-[1fr_350px] gap-8 animate-in fade-in duration-500">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                Hiring via hireLens AI
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight text-white">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-6 text-slate-400">
                <span className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> {job.company_name}
                </span>
                {job.location && (
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> {job.location}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" /> {job.seniority}
                </span>
                {job.category && <Badge variant="secondary" className="bg-slate-700 text-slate-200">{job.category}</Badge>}
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  className={
                    isCompleted ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                    : isRejected ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                    : 'bg-slate-700 text-slate-300'
                  }
                >
                  {statusLabel(application.status)}
                </Badge>
                {application.applied_at && (
                  <span className="text-xs text-slate-500">
                    Applied {new Date(application.applied_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {isCompleted ? (
              <Card className="border-green-500/30 bg-green-500/10">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-green-400">Interview Completed</h3>
                    <p className="text-sm text-green-300/80 mt-1">
                      You've completed the interview for this role. The hiring team will review your results and be in touch.
                    </p>
                    <Button asChild className="mt-4 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white" variant="outline">
                      <Link href={`/candidate/${candidateId}`}>Back to dashboard</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : isRejected ? (
              <Card className="border-red-500/30 bg-red-500/10">
                <CardContent className="p-6">
                  <h3 className="font-bold text-red-400">Application closed</h3>
                  <p className="text-sm text-slate-400 mt-1">This application is no longer active.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-white/10 overflow-hidden shadow-md bg-slate-900/60">
                <div className="h-1.5 bg-blue-600 w-full" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl text-white">Welcome to your AI Interview</CardTitle>
                  <CardDescription className="text-lg text-slate-400">
                    You have been invited to complete a multi-stage automated assessment.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-slate-300 leading-relaxed">
                    hireLens uses advanced artificial intelligence to conduct fair, efficient, and interactive interviews.
                    This process allows you to showcase your skills through behavioral questions, technical simulations,
                    and real-world scenarios.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { icon: <Wifi className="w-5 h-5" />, title: 'Stable Connection', desc: 'Ensure you have a reliable internet link.' },
                      { icon: <Volume2 className="w-5 h-5" />, title: 'Quiet Workspace', desc: 'Find a distraction-free area to focus.' },
                      { icon: <Clock className="w-5 h-5" />, title: 'Dedicated Time', desc: `Plan for about ${totalMinutes}-${totalMinutes + 15} mins. Once you start, you cannot pause or leave—similar to a traditional interview.` },
                      { icon: <Shield className="w-5 h-5" />, title: 'One Attempt', desc: 'If you leave mid-interview, you cannot rejoin. You will be evaluated on completed questions only.' },
                    ].map(({ icon, title, desc }) => (
                      <div key={title} className="p-4 rounded-xl bg-slate-800/50 border border-white/10 flex items-start gap-3">
                        <div className="mt-1 text-blue-400">{icon}</div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{title}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="bg-blue-600/10 border-t border-white/10 p-6 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    Ready whenever you are.
                  </p>
                  {user ? (
                    <StartInterviewButton
                      applicationId={application.id}
                      candidateId={candidateId}
                      jobId={jobId}
                      resumeSessionId={resumeSessionId}
                    />
                  ) : (
                    <Button size="lg" asChild className="px-10 h-12 text-lg font-bold bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-600/30">
                      <Link href={`/login?next=/candidate/${candidateId}/${jobId}`}>
                        Log in to start
                      </Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )}

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">What to expect</h2>
              <div className="grid gap-3">
                {stages.length > 0 ? (
                  stages.map((stage, i) => (
                    <ProcessStep
                      key={stage.id}
                      number={String(i + 1)}
                      title={stageTypeLabel(stage.type)}
                      description={
                        stage.competencies?.length
                          ? `Focus: ${stage.competencies.slice(0, 3).join(', ')}`
                          : `Complete the ${stageTypeLabel(stage.type).toLowerCase()} stage.`
                      }
                    />
                  ))
                ) : (
                  <>
                    <ProcessStep number="1" title="Resume Fit Check" description="Our AI will instantly review your experience against the core requirements." />
                    <ProcessStep number="2" title="Behavioral & Coding Stages" description="Answer experience-based questions and solve technical problems in our interactive workspace." />
                    <ProcessStep number="3" title="Final Evaluation" description={`A detailed AI-generated report will be sent to the hiring team at ${job.company_name}.`} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-24 border-2 border-white/10 shadow-lg bg-slate-900/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  Interview Pipeline
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {stages.length} stage{stages.length !== 1 ? 's' : ''} in this assessment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {stages.length > 0 ? (
                  stages.map((stage, idx) => {
                    const stageComplete = typeof application.current_stage_index === 'number' && idx < application.current_stage_index;
                    const stageActive = idx === (application.current_stage_index ?? 0) && application.status === 'in_interview';
                    return (
                      <div
                        key={stage.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <div
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                            stageComplete
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : stageActive
                              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                              : 'border-white/20 bg-slate-800 text-slate-400'
                          }`}
                        >
                          {stageComplete ? '✓' : idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-white">{stageTypeLabel(stage.type)}</p>
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1.5 uppercase tracking-wider bg-slate-800/50 border-white/10 text-slate-400"
                          >
                            {stageComplete ? 'done' : stageActive ? 'in progress' : 'not started'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-400 py-4 text-center">
                    Stages will be loaded when you begin.
                  </p>
                )}
              </CardContent>
              {stages.length > 0 && (
                <CardFooter className="pt-4 border-t border-white/10 px-6 flex flex-col gap-3">
                  <div className="w-full flex justify-between text-xs font-bold uppercase tracking-tighter text-slate-400">
                    <span>Overall Progress</span>
                    <span>
                      {isCompleted
                        ? '100'
                        : Math.round(((application.current_stage_index ?? 0) / stages.length) * 100)}
                      %
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{
                        width: isCompleted
                          ? '100%'
                          : `${Math.round(((application.current_stage_index ?? 0) / stages.length) * 100)}%`,
                      }}
                    />
                  </div>
                </CardFooter>
              )}
            </Card>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold">
                <Shield className="w-5 h-5" />
                <h4 className="text-sm">Secure Assessment</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                hireLens uses secure session management to protect your information and ensure a fair screening process.
                Your responses are stored safely.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-12 px-6 border-t border-white/10 bg-slate-950">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <SiteLogo href={`/candidate/${candidateId}`} height={32} />
          <p className="text-sm text-slate-500">© 2025 hireLens Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function ApplyView({
  candidateId,
  jobId,
  job,
  stages,
}: {
  candidateId: string;
  jobId: string;
  job: NonNullable<Awaited<ReturnType<typeof getJobAndApplication>>['job']>;
  stages: Awaited<ReturnType<typeof getJobAndApplication>>['stages'];
}) {
  const skills = job.must_have_skills ?? [];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-white">
      <header className="px-3 h-20 flex items-center border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <SiteLogo href={`/candidate/${candidateId}`} height={40} />
        <nav className="ml-auto flex items-center gap-6 text-sm">
          <Link href={`/candidate/${candidateId}`} className="font-medium text-slate-400 hover:text-white transition-colors">
            My applications
          </Link>
        </nav>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 lg:p-10">
        <div className="space-y-8">
          <div className="space-y-4">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              Hiring via hireLens AI
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-6 text-slate-400">
              <span className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> {job.company_name}
              </span>
              {job.location && (
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> {job.location}
                </span>
              )}
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" /> {job.seniority}
              </span>
              {job.category && <Badge variant="secondary" className="bg-slate-700 text-slate-200">{job.category}</Badge>}
            </div>
          </div>

          <Card className="border-2 border-white/10 overflow-hidden shadow-md bg-slate-900/60">
            <div className="h-1.5 bg-blue-600 w-full" />
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-white">About this role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose prose-sm max-w-none text-slate-300">
                <p className="whitespace-pre-wrap">{job.description}</p>
              </div>
              {skills.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-white">Key skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <Badge key={s} variant="secondary" className="bg-slate-700 text-slate-200">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {stages.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-white">Interview pipeline ({stages.length} stage{stages.length !== 1 ? 's' : ''})</h4>
                  <div className="space-y-2">
                    {stages.map((stage, i) => (
                      <div key={stage.id} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-slate-800/40">
                        <div className="w-7 h-7 rounded-full border-2 border-white/20 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium text-white">{stageTypeLabel(stage.type)}</span>
                        {stage.duration_minutes && (
                          <span className="text-xs text-slate-400 ml-auto">{stage.duration_minutes} min</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-blue-600/10 border-t border-white/10 p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between w-full">
                <p className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  We&apos;ll assess your fit before proceeding.
                </p>
              </div>
              <ApplyButton jobId={jobId} candidateId={candidateId} />
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
