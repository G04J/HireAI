import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { AuthNav } from '@/components/auth-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Briefcase, Building2, MapPin, Clock, ArrowRight } from 'lucide-react';

async function getPublishedJobsWithMyApplications(userId: string) {
  const supabase = createServerSupabaseClient();

  const { data: jobs, error: jobsError } = await supabase
    .from('job_profiles')
    .select('id, title, company_name, location, seniority, category, publish_state, created_at')
    .eq('publish_state', 'published')
    .order('created_at', { ascending: false });

  if (jobsError) {
    console.error('Error loading job_profiles for job board', jobsError);
    return { jobs: [], applicationsByJobId: {} as Record<string, any> };
  }

  const jobList = (jobs ?? []) as any[];
  const jobIds = jobList.map((j: any) => j.id as string);
  if (jobIds.length === 0) {
    return { jobs: jobList, applicationsByJobId: {} as Record<string, any> };
  }

  const { data: myApps, error: appsError } = await supabase
    .from('job_applications')
    .select('*')
    .eq('user_id', userId)
    .in('job_profile_id', jobIds);

  if (appsError) {
    console.error('Error loading job_applications for job board', appsError);
    return { jobs: jobList, applicationsByJobId: {} as Record<string, any> };
  }

  const applicationsByJobId = (myApps ?? [] as any[]).reduce<Record<string, any>>((acc, app: any) => {
    acc[app.job_profile_id] = app;
    return acc;
  }, {});

  return { jobs: jobList, applicationsByJobId };
}

export default async function CandidateJobBoard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? '';
  const { jobs, applicationsByJobId } = userId
    ? await getPublishedJobsWithMyApplications(userId)
    : { jobs: await (async () => {
        const supa = createServerSupabaseClient();
        const { data } = await supa
          .from('job_profiles')
          .select('id, title, company_name, location, seniority, category, publish_state, created_at')
          .eq('publish_state', 'published')
          .order('created_at', { ascending: false });
        return data ?? [];
      })(), applicationsByJobId: {} as Record<string, any> };

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
          <Link href={userId ? `/candidate/${userId}` : '/login'} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            My applications
          </Link>
          <Link href="/candidate/jobs" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Job board
          </Link>
          <Link href="/employer" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            For employers
          </Link>
          <AuthNav user={user} />
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Job board</h1>
          <p className="text-slate-400 mt-1">
            Browse all active roles you can apply to.
          </p>
        </div>

        <Card className="bg-slate-900/60 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Open roles</CardTitle>
            <CardDescription className="text-slate-400">Roles published by employers on AegisHire.</CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="py-10 text-sm text-slate-400 text-center">
                No published jobs are available yet. Check back soon.
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job: any) => {
                  const app = applicationsByJobId[job.id];
                  const hasApplied = Boolean(app);
                  const canContinue =
                    app &&
                    ['screening', 'in_interview'].includes(app.status);

                  return (
                    <div
                      key={job.id}
                      className="border border-white/10 rounded-lg bg-slate-800/40 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-semibold text-lg text-white">{job.title}</h2>
                          <Badge variant="outline" className="text-xs border-white/20 text-slate-300">
                            {job.category || 'General'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {job.company_name}
                          </span>
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {job.location}
                            </span>
                          )}
                          {job.seniority && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-3 h-3" /> {job.seniority}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Posted{' '}
                            {new Date(job.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {userId ? (
                          <Button
                            variant={hasApplied ? 'outline' : 'default'}
                            size="sm"
                            asChild
                            className={
                              canContinue
                                ? 'bg-blue-600 hover:bg-blue-500 text-white border-0'
                                : hasApplied
                                ? 'border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white'
                                : 'bg-blue-600 hover:bg-blue-500 text-white border-0'
                            }
                          >
                            <Link href={`/candidate/${userId}/${job.id}`}>
                              {canContinue ? (
                                <>Continue <ArrowRight className="w-4 h-4 ml-1" /></>
                              ) : hasApplied ? (
                                'View application'
                              ) : (
                                'Apply'
                              )}
                            </Link>
                          </Button>
                        ) : (
                          <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-500 text-white border-0">
                            <Link href={`/login?next=/candidate/jobs`}>
                              Sign in to apply
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

