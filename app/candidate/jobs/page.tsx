import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { AuthNav } from '@/components/auth-nav';
import { SiteLogo } from '@/components/site-logo';
import { JobList } from './job-list';

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

async function getSavedJobIds(userId: string): Promise<Set<string>> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('candidate_saved_jobs')
    .select('job_profile_id')
    .eq('user_id', userId);
  if (error) return new Set();
  return new Set((data ?? []).map((r: { job_profile_id: string }) => r.job_profile_id));
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
  const savedJobIds = userId ? await getSavedJobIds(userId) : new Set<string>();

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white">
      <header className="px-3 h-20 flex items-center border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <SiteLogo href={userId ? `/candidate/${userId}` : '/'} height={40} />
        <div className="ml-auto flex items-center">
          <nav className="flex items-center gap-6 text-sm">
            {userId && (
              <Link href={`/candidate/${userId}`} className="font-medium text-slate-400 hover:text-white transition-colors">
                My applications
              </Link>
            )}
            <Link href="/candidate/jobs" className="font-medium text-slate-400 hover:text-white transition-colors">
              Job board
            </Link>
          </nav>
          <AuthNav
            user={user}
            profileHref={userId ? `/candidate/${userId}/profile` : undefined}
            settingsHref={userId ? `/candidate/${userId}/settings` : undefined}
          />
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Job board</h1>
          <p className="text-slate-400 mt-1">
            Browse all active roles you can apply to.
          </p>
        </div>

        <JobList
          jobs={jobs}
          applicationsByJobId={applicationsByJobId}
          savedJobIds={Array.from(savedJobIds)}
          userId={userId}
        />
      </main>
    </div>
  );
}

