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
    <div className="flex flex-col min-h-screen bg-muted/20">
      <header className="px-6 h-16 flex items-center border-b bg-white">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-primary">AegisHire</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={userId ? `/candidate/${userId}` : '/login'}>
              My applications
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/jobBoard">Job board</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/employer">For employers</Link>
          </Button>
          <AuthNav user={user} />
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Job board</h1>
          <p className="text-muted-foreground mt-1">
            Browse all active roles you can apply to.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Open roles</CardTitle>
            <CardDescription>Roles published by employers on AegisHire.</CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="py-10 text-sm text-muted-foreground text-center">
                No published jobs are available yet. Check back soon.
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job: any) => {
                  const app = applicationsByJobId[job.id];
                  const hasApplied = Boolean(app);
                  const canContinue =
                    app &&
                    ['applied', 'screening', 'in_interview'].includes(app.status);

                  return (
                    <div
                      key={job.id}
                      className="border rounded-lg bg-white p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-semibold text-lg">{job.title}</h2>
                          <Badge variant="outline" className="text-xs">
                            {job.category || 'General'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
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
                          <>
                            <Button variant={hasApplied ? 'outline' : 'default'} size="sm" asChild>
                              <Link href={`/candidate/${userId}/${job.id}`}>
                                {hasApplied ? 'View application' : 'Apply'}
                              </Link>
                            </Button>
                            {canContinue && (
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/candidate/${userId}/${job.id}/interview`}>
                                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                                </Link>
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button size="sm" asChild>
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

