import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { AuthNav } from '@/components/auth-nav';
import { SiteLogo } from '@/components/site-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Building2, Clock, ArrowRight, Bookmark } from 'lucide-react';

/** Only applications that passed resume screening (fit_decision = 'eligible') appear on My applications. */
async function getApplicationsForCandidate(candidateId: string) {
  const supabase = createServerSupabaseClient();
  const { data: apps, error } = await supabase
    .from('job_applications')
    .select(`
      id,
      job_profile_id,
      status,
      current_stage_index,
      applied_at,
      created_at,
      job_profiles (
        title,
        company_name,
        category,
        seniority,
        publish_state
      )
    `)
    .eq('user_id', candidateId)
    .eq('fit_decision', 'eligible')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading candidate applications', error);
    return [];
  }

  return (apps ?? []).map((row: any) => {
    const jp = row.job_profiles ?? {};
    return {
      application_id: row.id,
      job_profile_id: row.job_profile_id,
      application_status: row.status,
      current_stage_index: row.current_stage_index,
      applied_at: row.applied_at,
      application_created_at: row.created_at,
      job_title: jp.title,
      job_company_name: jp.company_name,
      job_category: jp.category,
      job_seniority: jp.seniority,
      job_publish_state: jp.publish_state,
    };
  });
}

/** Set of job_profile_ids the candidate has applied to (any application, regardless of fit_decision). Used for Saved jobs. */
async function getAppliedJobIds(candidateId: string): Promise<Set<string>> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('job_applications')
    .select('job_profile_id')
    .eq('user_id', candidateId);
  if (error) return new Set();
  return new Set((data ?? []).map((r: { job_profile_id: string }) => r.job_profile_id));
}

async function getSavedJobsForCandidate(candidateId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('candidate_saved_jobs')
    .select(`
      job_profile_id,
      created_at,
      job_profiles (
        id,
        title,
        company_name,
        category,
        seniority,
        publish_state
      )
    `)
    .eq('user_id', candidateId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading saved jobs', error);
    return [];
  }

  return (data ?? [])
    .map((r: any) => ({ ...(r.job_profiles || {}), job_profile_id: r.job_profile_id, saved_at: r.created_at }))
    .filter((j: any) => j.id && j.publish_state === 'published');
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

  const [applications, savedJobs, appliedJobIdsForSaved] = await Promise.all([
    getApplicationsForCandidate(candidateId),
    getSavedJobsForCandidate(candidateId),
    getAppliedJobIds(candidateId),
  ]);
  const appliedJobIds = appliedJobIdsForSaved;

  const applied = applications.filter(
    (a: any) => !['rejected', 'withdrawn'].includes(a.application_status),
  );
  const rejected = applications.filter(
    (a: any) => ['rejected', 'withdrawn'].includes(a.application_status),
  );
  const inProgress = applications.filter(
    (a: any) => !['rejected', 'withdrawn', 'offered', 'completed'].includes(a.application_status),
  );
  const offered = applications.filter((a: any) => a.application_status === 'offered');

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white">
      <header className="px-3 h-20 flex items-center border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <SiteLogo href={`/candidate/${candidateId}`} height={40} />
        <div className="ml-auto flex items-center">
          <nav className="flex items-center gap-6 text-sm">
            <Link href={`/candidate/${candidateId}`} className="font-medium text-white transition-colors">
              My applications
            </Link>
            <Link href="/candidate/jobs" className="font-medium text-slate-400 hover:text-white transition-colors">
              Job board
            </Link>
          </nav>
          <AuthNav
            user={user ?? null}
            profileHref={`/candidate/${candidateId}/profile`}
            settingsHref={`/candidate/${candidateId}/settings`}
          />
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
                <div className="p-3 bg-purple-600/20 rounded-full text-purple-400">
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
              <CardDescription className="text-slate-400">Jobs you have applied to or been invited to. Shown as applied or rejected.</CardDescription>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="py-12 text-center space-y-4">
                  <p className="text-slate-400">No applications yet.</p>
                  <Button asChild className="bg-purple-600 hover:bg-purple-500 text-white border-0 shadow-lg shadow-purple-600/30">
                    <Link href="/candidate/jobs">
                      Browse jobs <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {applied.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-3">Applied</h4>
                      <div className="divide-y divide-white/10">
                        {applied.map((app: any) => (
                          <div
                            key={app.application_id}
                            className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-lg text-white">{app.job_title}</h3>
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                  Applied
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
                                className="bg-purple-600/80 hover:bg-purple-500 text-white border border-purple-500/50"
                                variant="outline"
                              >
                                <Link href={`/candidate/${candidateId}/${app.job_profile_id}`}>
                                  View application
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {rejected.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-3">Rejected</h4>
                      <div className="divide-y divide-white/10">
                        {rejected.map((app: any) => (
                          <div
                            key={app.application_id}
                            className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-lg text-white">{app.job_title}</h3>
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                  Rejected
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
                                variant="outline"
                                className="border-white/20 text-slate-400 hover:bg-white/10 hover:text-white"
                              >
                                <Link href={`/candidate/${candidateId}/${app.job_profile_id}`}>
                                  View application
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-purple-400" />
                Saved jobs
              </CardTitle>
              <CardDescription className="text-slate-400">
                Jobs you&apos;ve saved to apply later. Save jobs from the Job board to see them here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {savedJobs.length === 0 ? (
                <div className="py-12 text-center space-y-4">
                  <p className="text-slate-400">No saved jobs yet.</p>
                  <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-500 text-white border-0">
                    <Link href="/candidate/jobs">
                      Browse jobs to save <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedJobs.map((job: any) => {
                    const hasApplied = appliedJobIdsForSaved.has(job.id);
                    return (
                      <div
                        key={job.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-white/10 bg-slate-800/40 hover:border-purple-500/30 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-white">{job.title}</p>
                            {hasApplied && (
                              <Badge className="bg-green-600/80 text-white border-0 text-xs">
                                Applied
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 mt-0.5">
                            {job.company_name}
                            {job.seniority && ` · ${job.seniority}`}
                            {job.category && ` · ${job.category}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            asChild
                            variant={hasApplied ? 'outline' : 'default'}
                            className={
                              hasApplied
                                ? 'border-white/20 text-slate-400 hover:bg-white/10 hover:text-white'
                                : 'bg-purple-600 hover:bg-purple-500 text-white border-0'
                            }
                          >
                            <Link href={`/candidate/${candidateId}/${job.id}`}>
                              {hasApplied ? (
                                'View application'
                              ) : (
                                <>Apply <ArrowRight className="w-4 h-4 ml-1" /></>
                              )}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <Button asChild variant="outline" size="sm" className="border-white/20 text-slate-300 hover:bg-white/10 hover:text-white mt-2">
                    <Link href="/candidate/jobs">Browse more jobs</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

