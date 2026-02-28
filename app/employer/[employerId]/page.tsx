import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Users, Briefcase, ExternalLink, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AuthNav } from '@/components/auth-nav';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

type DashboardStats = {
  totalCandidates: number;
  activeJobs: number;
  reportsGenerated: number;
};

async function getDashboardStats(employerId: string): Promise<DashboardStats> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: rows, error } = await supabase
      .from('job_application_stats')
      .select('job_profile_id, total_applications, num_completed')
      .eq('employer_id', employerId);

    if (error) {
      console.error('Error loading dashboard stats', error);
      return { totalCandidates: 0, activeJobs: 0, reportsGenerated: 0 };
    }

    const list = rows ?? [];
    const totalCandidates = list.reduce(
      (sum: number, r: any) => sum + (Number(r.total_applications) || 0),
      0,
    );
    const reportsGenerated = list.reduce(
      (sum: number, r: any) => sum + (Number((r as { num_completed?: number }).num_completed) || 0),
      0,
    );
    const activeJobs = list.length;

    return { totalCandidates, activeJobs, reportsGenerated };
  } catch (err) {
    console.error('Unexpected error loading dashboard stats', err);
    return { totalCandidates: 0, activeJobs: 0, reportsGenerated: 0 };
  }
}

async function getJobs(employerId: string) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: profiles, error } = await supabase
      .from('job_profiles')
      .select('*')
      .eq('employer_id', employerId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading job_profiles', error);
      return [];
    }

    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length === 0) return profiles ?? [];

    const [stagesRes, statsRes] = await Promise.all([
      supabase.from('job_stages').select('job_profile_id').in('job_profile_id', ids),
      supabase
        .from('job_application_stats')
        .select('job_profile_id, total_applications')
        .in('job_profile_id', ids),
    ]);

    const stages = stagesRes.data ?? [];
    const stageCountByJob = stages.reduce<Record<string, number>>((acc, s: any) => {
      acc[s.job_profile_id] = (acc[s.job_profile_id] ?? 0) + 1;
      return acc;
    }, {});

    const stats = (statsRes.data ?? []) as { job_profile_id: string; total_applications: number }[];
    const candidateCountByJob = stats.reduce<Record<string, number>>((acc, s) => {
      acc[s.job_profile_id] = Number(s.total_applications) || 0;
      return acc;
    }, {});

    return (profiles ?? []).map((p: any) => ({
      ...p,
      stages: Array.from({ length: stageCountByJob[p.id] ?? 0 }, (_, i) => ({ index: i })),
      candidateCount: candidateCountByJob[p.id] ?? 0,
    }));
  } catch (err) {
    console.error('Unexpected error loading jobs', err);
    return [];
  }
}

export default async function EmployerDashboard({
  params,
}: {
  params: Promise<{ employerId: string }>;
}) {
  const { employerId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/employer/${employerId}`);
  }

  const db = createServerSupabaseClient();
  const { data: ownerCheck } = await db
    .from('employer_profiles')
    .select('id')
    .eq('id', employerId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!ownerCheck) {
    redirect('/employer');
  }

  const [jobs, stats] = await Promise.all([getJobs(employerId), getDashboardStats(employerId)]);

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
          <Link href={`/employer/${employerId}`} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Dashboard
          </Link>
          <AuthNav user={user ?? null} />
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Employer Dashboard</h1>
            <p className="text-slate-400 mt-1">
              Manage your interview pipelines and evaluate candidates.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Employer ID: <span className="font-mono">{employerId}</span>
            </p>
          </div>
          <Button asChild className="gap-2 bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-600/30">
            <Link href={`/employer/${employerId}/jobs/new`}>
              <Plus className="w-4 h-4" /> Create New Job Profile
            </Link>
          </Button>
        </div>

        <div className="grid gap-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Total Candidates"
              value={String(stats.totalCandidates)}
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard
              title="Active Jobs"
              value={String(stats.activeJobs)}
              icon={<Briefcase className="w-4 h-4" />}
            />
            <StatCard
              title="Reports Generated"
              value={String(stats.reportsGenerated)}
              icon={<FileText className="w-4 h-4" />}
            />
          </div>

          <Card className="bg-slate-900/60 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">Job Profiles</CardTitle>
                <CardDescription className="text-slate-400">
                  Published jobs are live on the job board and accepting applications.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-white/10">
                {jobs.length === 0 ? (
                  <div className="py-8 text-sm text-slate-400 text-center">
                    No job profiles yet.{' '}
                    <Link
                      href={`/employer/${employerId}/jobs/new`}
                      className="text-blue-400 underline"
                    >
                      Create your first pipeline
                    </Link>{' '}
                    to get started.
                  </div>
                ) : (
                  jobs.map((job: any) => (
                    <div
                      key={job.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg text-white">{job.title}</h3>
                          <Badge
                            variant={
                              job.publish_state === 'published' ? 'default' : 'secondary'
                            }
                            className={job.publish_state === 'published' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-slate-700 text-slate-300'}
                          >
                            {job.publish_state === 'published'
                              ? 'Published'
                              : job.publish_state === 'archived'
                              ? 'Archived'
                              : 'Draft'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {job.candidateCount ?? 0} candidates
                          </span>
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" /> {(job.stages || []).length} stages
                          </span>
                          <span>Created {new Date(job.created_at).toLocaleDateString()}</span>
                          {job.location && <span>{job.location}</span>}
                          {job.category && <span>{job.category}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
                          <Link
                            href={
                              job.public_slug ? `/jobs/${job.public_slug}` : `/jobs/${job.id}`
                            }
                            target="_blank"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" /> Share Link
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
                          <Link href={`/employer/${employerId}/${job.id}`}>Manage</Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="bg-slate-900/60 border-white/10">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-white">{value}</h3>
        </div>
        <div className="p-3 bg-blue-600/20 rounded-full text-blue-400">{icon}</div>
      </CardContent>
    </Card>
  );
}
