import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, MoreVertical, Users, Briefcase, ExternalLink, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AuthNav } from '@/components/auth-nav';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { getEmployerIdForRequest } from '@/lib/employer-default';

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

    const { data: stages } = await supabase
      .from('job_stages')
      .select('job_profile_id')
      .in('job_profile_id', ids);

    const stageCountByJob = (stages ?? []).reduce<Record<string, number>>((acc, s) => {
      acc[s.job_profile_id] = (acc[s.job_profile_id] ?? 0) + 1;
      return acc;
    }, {});

    return (profiles ?? []).map((p) => ({
      ...p,
      stages: Array.from({ length: stageCountByJob[p.id] ?? 0 }, (_, i) => ({ index: i })),
    }));
  } catch (err) {
    console.error('Unexpected error loading jobs', err);
    return [];
  }
}

export default async function EmployerDashboard() {
  const employerId = await getEmployerIdForRequest();
  if (!employerId) redirect('/login?next=/employer');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const jobs = await getJobs(employerId);

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <header className="px-6 h-16 flex items-center border-b bg-white">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-primary">AegisHire</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild><Link href="/employer">Dashboard</Link></Button>
          <AuthNav user={user} />
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Employer Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your interview pipelines and evaluate candidates.</p>
          </div>
          <Button asChild className="gap-2">
            <Link href="/employer/jobs/new">
              <Plus className="w-4 h-4" /> Create New Job Profile
            </Link>
          </Button>
        </div>

        <div className="grid gap-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title="Total Candidates" value="20" icon={<Users className="w-4 h-4" />} />
            <StatCard title="Active Jobs" value="2" icon={<Briefcase className="w-4 h-4" />} />
            <StatCard title="Reports Generated" value="14" icon={<FileText className="w-4 h-4" />} />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Job Profiles</CardTitle>
                <CardDescription>Public share links are active for these pipelines.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {jobs.length === 0 ? (
                  <div className="py-8 text-sm text-muted-foreground text-center">
                    No job profiles yet. Create your first automated pipeline to get started.
                  </div>
                ) : (
                  jobs.map((job: any) => (
                    <div key={job.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{job.title}</h3>
                          <Badge variant={job.publish_state === 'published' ? 'default' : 'secondary'}>
                            {job.publish_state === 'published' ? 'Published' : job.publish_state === 'archived' ? 'Archived' : 'Draft'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 0 candidates</span>
                          <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {(job.stages || []).length} stages</span>
                          <span>Created {new Date(job.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={job.public_slug ? `/jobs/${job.public_slug}` : `/candidate/${job.id}`}>
                            <ExternalLink className="w-4 h-4 mr-2" /> Share Link
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/employer/jobs/${job.id}`}>Manage</Link>
                        </Button>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
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

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="bg-white">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-bold">{value}</h3>
        </div>
        <div className="p-3 bg-muted rounded-full">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}