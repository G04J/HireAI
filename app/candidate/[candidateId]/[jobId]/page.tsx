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
import {
  Shield,
  Briefcase,
  MapPin,
  Clock,
  Zap,
  Wifi,
  Volume2,
  Coffee,
  ChevronRight,
  AlertCircle,
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
    <div className="flex gap-4 p-5 rounded-xl bg-white border border-primary/5 group hover:border-primary/40 hover:shadow-md transition-all">
      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
        {number}
      </div>
      <div className="space-y-1">
        <h4 className="font-bold flex items-center gap-2">
          {title}
          <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:translate-x-1 transition-transform" />
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
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
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-6">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Job not found</h2>
          <p className="text-muted-foreground mb-6">This job posting doesn&apos;t exist or has been removed.</p>
          <Button asChild><Link href="/candidate/jobs">Browse jobs</Link></Button>
        </Card>
      </div>
    );
  }

  if (!application) {
    return <ApplyView candidateId={candidateId} jobId={jobId} job={job} stages={stages} />;
  }

  const isCompleted = application.status === 'completed';
  const isRejected = ['rejected', 'withdrawn'].includes(application.status);
  const canStart = !isCompleted && !isRejected;

  // Check if an active session already exists so we can resume it
  const supabase = createServerSupabaseClient();
  const { data: existingSession } = await supabase
    .from('interview_sessions')
    .select('id')
    .eq('application_id', application.id)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const resumeSessionId = existingSession?.id ?? null;

  const totalMinutes = stages.reduce((sum, s) => sum + (s.duration_minutes ?? 15), 0) || stages.length * 15;

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <header className="px-6 h-16 flex items-center border-b bg-white shadow-sm shrink-0 sticky top-0 z-50">
        <Link href={`/candidate/${candidateId}`} className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-primary">AegisHire</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          <Link href={`/candidate/${candidateId}`} className="hover:text-primary transition-colors">
            My applications
          </Link>
        </nav>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-10">
        <div className="grid lg:grid-cols-[1fr_350px] gap-8 animate-in fade-in duration-500">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="outline" className="bg-primary/5 text-primary">
                Hiring via AegisHire AI
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
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
                {job.category && <Badge variant="secondary">{job.category}</Badge>}
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant={
                    isCompleted ? 'default' : isRejected ? 'destructive' : 'secondary'
                  }
                >
                  {statusLabel(application.status)}
                </Badge>
                {application.applied_at && (
                  <span className="text-xs text-muted-foreground">
                    Applied {new Date(application.applied_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {isCompleted ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-green-800">Interview Completed</h3>
                    <p className="text-sm text-green-700 mt-1">
                      You've completed the interview for this role. The hiring team will review your results and be in touch.
                    </p>
                    <Button asChild className="mt-4" variant="outline">
                      <Link href={`/candidate/${candidateId}`}>Back to dashboard</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : isRejected ? (
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-6">
                  <h3 className="font-bold text-destructive">Application closed</h3>
                  <p className="text-sm text-muted-foreground mt-1">This application is no longer active.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-primary/5 overflow-hidden shadow-md">
                <div className="h-1.5 bg-primary w-full" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl">Welcome to your AI Interview</CardTitle>
                  <CardDescription className="text-lg">
                    You have been invited to complete a multi-stage automated assessment.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground leading-relaxed">
                    AegisHire uses advanced artificial intelligence to conduct fair, efficient, and interactive interviews.
                    This process allows you to showcase your skills through behavioral questions, technical simulations,
                    and real-world scenarios.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { icon: <Wifi className="w-5 h-5" />, title: 'Stable Connection', desc: 'Ensure you have a reliable internet link.' },
                      { icon: <Volume2 className="w-5 h-5" />, title: 'Quiet Workspace', desc: 'Find a distraction-free area to focus.' },
                      { icon: <Clock className="w-5 h-5" />, title: 'Dedicated Time', desc: `Plan for about ${totalMinutes}-${totalMinutes + 15} mins of work.` },
                      { icon: <Coffee className="w-5 h-5" />, title: 'Break Friendly', desc: 'You can pause between major stages.' },
                    ].map(({ icon, title, desc }) => (
                      <div key={title} className="p-4 rounded-xl bg-muted/50 border flex items-start gap-3">
                        <div className="mt-1 text-primary">{icon}</div>
                        <div>
                          <h4 className="font-bold text-sm">{title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="bg-primary/5 border-t p-6 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-accent fill-accent" />
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
                    <Button size="lg" asChild className="px-10 h-12 text-lg font-bold shadow-lg shadow-primary/20">
                      <Link href={`/login?next=/candidate/${candidateId}/${jobId}`}>
                        Log in to start
                      </Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )}

            <div className="space-y-4">
              <h2 className="text-xl font-bold">What to expect</h2>
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
            <Card className="sticky top-24 border-2 border-primary/10 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-accent fill-accent" />
                  Interview Pipeline
                </CardTitle>
                <CardDescription>
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
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                            stageComplete
                              ? 'bg-primary border-primary text-white'
                              : stageActive
                              ? 'border-primary text-primary bg-primary/10'
                              : 'border-muted bg-white text-muted-foreground'
                          }`}
                        >
                          {stageComplete ? '✓' : idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{stageTypeLabel(stage.type)}</p>
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1.5 uppercase tracking-wider bg-white/50"
                          >
                            {stageComplete ? 'done' : stageActive ? 'in progress' : 'not started'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Stages will be loaded when you begin.
                  </p>
                )}
              </CardContent>
              {stages.length > 0 && (
                <CardFooter className="pt-4 border-t px-6 flex flex-col gap-3">
                  <div className="w-full flex justify-between text-xs font-bold uppercase tracking-tighter text-muted-foreground">
                    <span>Overall Progress</span>
                    <span>
                      {isCompleted
                        ? '100'
                        : Math.round(((application.current_stage_index ?? 0) / stages.length) * 100)}
                      %
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
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

            <div className="p-5 rounded-2xl bg-white border border-primary/10 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Shield className="w-5 h-5" />
                <h4 className="text-sm">Secure Assessment</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AegisHire uses secure session management to protect your information and ensure a fair screening process.
                Your responses are stored safely.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-10 px-6 border-t bg-muted/30">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">AegisHire</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2025 AegisHire Inc. All rights reserved.</p>
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
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <header className="px-6 h-16 flex items-center border-b bg-white shadow-sm shrink-0 sticky top-0 z-50">
        <Link href={`/candidate/${candidateId}`} className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-primary">AegisHire</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          <Link href={`/candidate/${candidateId}`} className="hover:text-primary transition-colors">
            My applications
          </Link>
        </nav>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 lg:p-10">
        <div className="space-y-8">
          <div className="space-y-4">
            <Badge variant="outline" className="bg-primary/5 text-primary">
              Hiring via AegisHire AI
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
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
              {job.category && <Badge variant="secondary">{job.category}</Badge>}
            </div>
          </div>

          <Card className="border-2 border-primary/5 overflow-hidden shadow-md">
            <div className="h-1.5 bg-primary w-full" />
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">About this role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <p className="whitespace-pre-wrap">{job.description}</p>
              </div>
              {skills.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Key skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {stages.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Interview pipeline ({stages.length} stage{stages.length !== 1 ? 's' : ''})</h4>
                  <div className="space-y-2">
                    {stages.map((stage, i) => (
                      <div key={stage.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white">
                        <div className="w-7 h-7 rounded-full border-2 border-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium">{stageTypeLabel(stage.type)}</span>
                        {stage.duration_minutes && (
                          <span className="text-xs text-muted-foreground ml-auto">{stage.duration_minutes} min</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-primary/5 border-t p-6 flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent fill-accent" />
                Submit your application to begin.
              </p>
              <ApplyButton jobId={jobId} candidateId={candidateId} />
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
