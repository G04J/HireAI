import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { AuthNav } from '@/components/auth-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Briefcase, Building2, MapPin, Clock, ArrowRight } from 'lucide-react';

async function getApplicationsForCandidate(candidateId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('candidate_applications_summary')
    .select('*')
    .eq('user_id', candidateId)
    .order('application_created_at', { ascending: false });

  if (error) {
    console.error('Error loading candidate applications', error);
    return [];
  }
  return data ?? [];
}

async function getOpenJobs() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('job_profiles')
    .select('id, title, company_name, location, seniority, category, publish_state, created_at')
    .eq('publish_state', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading open jobs', error);
    return [];
  }
  return data ?? [];
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (['offered', 'completed'].includes(status)) return 'default';
  if (['rejected', 'withdrawn'].includes(status)) return 'destructive';
  if (['in_interview', 'screening'].includes(status)) return 'secondary';
  return 'outline';
}

export default async function CandidateDashboard({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/candidate/${candidateId}`);
  }

  if (user.id !== candidateId) {
    redirect(`/candidate/${user.id}`);
  }

  const [applications, jobs] = await Promise.all([
    getApplicationsForCandidate(candidateId),
    getOpenJobs(),
  ]);

  const inProgress = applications.filter(
    (a: any) => !['rejected', 'withdrawn', 'offered'].includes(a.application_status),
  );
  const offered = applications.filter((a: any) => a.application_status === 'offered');

  const applicationsByJobId = applications.reduce<Record<string, any>>((acc, app: any) => {
    acc[app.job_profile_id] = app;
    return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white">
      <header className="px-6 h-20 flex items-center border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-blue-600 rounded-xl text-white group-hover:scale-105 transition-transform shadow-lg shadow-blue-600/40">
            <Shield className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">AegisHire</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <Link href={`/candidate/${candidateId}`} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            My applications
          </Link>
          <Link href="/candidate/jobs" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Job board
          </Link>
          <Link href="/employer" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            For employers
          </Link>
          <AuthNav user={user ?? null} />
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Candidate home</h1>
          <p className="text-slate-400 mt-1">
            Discover open roles and track your applications.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Candidate ID: <span className="font-mono">{candidateId}</span>
          </p>
        </div>

        <div className="grid gap-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-slate-900/60 border-white/10">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">Total applications</p>
                  <h3 className="text-3xl font-bold text-white">{applications.length}</h3>
                </div>
                <div className="p-3 bg-blue-600/20 rounded-full text-blue-400">
                  <Briefcase className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/60 border-white/10">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">In progress</p>
                  <h3 className="text-3xl font-bold text-white">{inProgress.length}</h3>
                </div>
                <div className="p-3 bg-cyan-600/20 rounded-full text-cyan-400">
                  <Clock className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/60 border-white/10">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">Offers</p>
                  <h3 className="text-3xl font-bold text-white">{offered.length}</h3>
                </div>
                <div className="p-3 bg-green-600/20 rounded-full text-green-400">
                  <Briefcase className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-900/60 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Applications</CardTitle>
              <CardDescription className="text-slate-400">Jobs this candidate has applied to or been invited to.</CardDescription>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="py-12 text-center space-y-4">
                  <p className="text-slate-400">No applications yet for this candidate.</p>
                  <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-600/30">
                    <Link href="/candidate/jobs">
                      Browse jobs <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {applications.map((app: any) => (
                    <div
                      key={app.application_id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg text-white">{app.job_title}</h3>
                          <Badge 
                            className={
                              ['offered', 'completed'].includes(app.application_status) 
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : ['rejected', 'withdrawn'].includes(app.application_status)
                                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                : ['in_interview', 'screening'].includes(app.application_status)
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                : 'bg-slate-700 text-slate-300'
                            }
                          >
                            {app.application_status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {app.job_company_name}
                          </span>
                          {app.job_category && <span>{app.job_category}</span>}
                          {app.job_seniority && <span>{app.job_seniority}</span>}
                          {app.applied_at && (
                            <span>Applied {new Date(app.applied_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          asChild
                          className={
                            ['screening', 'in_interview'].includes(app.application_status)
                              ? 'bg-blue-600 hover:bg-blue-500 text-white border-0'
                              : 'border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white'
                          }
                          variant={['screening', 'in_interview'].includes(app.application_status) ? 'default' : 'outline'}
                        >
                          <Link href={`/candidate/${candidateId}/${app.job_profile_id}`}>
                            {['screening', 'in_interview'].includes(app.application_status) ? (
                              <>Continue <ArrowRight className="w-4 h-4 ml-1" /></>
                            ) : (
                              'View application'
                            )}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-white/10">
            <CardHeader id="open-roles">
              <CardTitle className="text-white">Open roles</CardTitle>
              <CardDescription className="text-slate-400">Jobs currently published on AegisHire.</CardDescription>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <div className="py-8 text-sm text-slate-400 text-center">
                  No published jobs are available yet. Check back soon.
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {jobs.map((job: any) => {
                    const app = applicationsByJobId[job.id];
                    const hasApplied = Boolean(app);
                    const canContinue =
                      app &&
                      ['screening', 'in_interview'].includes(
                        app.application_status,
                      );
                    return (
                      <div
                        key={job.id}
                        className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg text-white">{job.title}</h3>
                            <Badge
                              className={
                                job.publish_state === 'published' 
                                  ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                  : 'bg-slate-700 text-slate-300'
                              }
                            >
                              {job.publish_state === 'published'
                                ? 'Open'
                                : job.publish_state}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> {job.company_name}
                            </span>
                            {job.location && <span>{job.location}</span>}
                            {job.seniority && <span>{job.seniority}</span>}
                            <span>
                              Posted {new Date(job.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant={hasApplied ? 'outline' : 'default'}
                            size="sm"
                            asChild
                            className={
                              canContinue
                                ? 'bg-blue-600 hover:bg-blue-500 text-white border-0'
                                : hasApplied
                                ? 'border-white/20 text-white hover:bg-white/10 hover:text-white'
                                : 'bg-blue-600 hover:bg-blue-500 text-white border-0'
                            }
                          >
                            <Link href={`/candidate/${candidateId}/${job.id}`}>
                              {canContinue ? (
                                <>Continue interview <ArrowRight className="w-4 h-4 ml-1" /></>
                              ) : hasApplied ? (
                                'View application'
                              ) : (
                                'Apply'
                              )}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

