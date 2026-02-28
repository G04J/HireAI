import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { AuthNav } from '@/components/auth-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Briefcase, FileText, ArrowRight, Search, Clock, Building2 } from 'lucide-react';

async function getMyApplications(userId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('candidate_applications_summary')
    .select('*')
    .eq('user_id', userId)
    .order('application_created_at', { ascending: false });

  if (error) {
    console.error('Error loading candidate applications', error);
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

export default async function CandidateDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/candidate');

  const applications = await getMyApplications(user.id);
  const inProgress = applications.filter((a) => !['rejected', 'withdrawn', 'offered'].includes(a.application_status));
  const offered = applications.filter((a) => a.application_status === 'offered');

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <header className="px-6 h-16 flex items-center border-b bg-white">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-primary">AegisHire</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/candidate">My applications</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/employer">For employers</Link>
          </Button>
          <AuthNav user={user} />
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My applications</h1>
          <p className="text-muted-foreground mt-1">
            Track your job applications and continue where you left off.
          </p>
        </div>

        <div className="grid gap-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-white">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total applications</p>
                  <h3 className="text-3xl font-bold">{applications.length}</h3>
                </div>
                <div className="p-3 bg-muted rounded-full">
                  <FileText className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">In progress</p>
                  <h3 className="text-3xl font-bold">{inProgress.length}</h3>
                </div>
                <div className="p-3 bg-muted rounded-full">
                  <Clock className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Offers</p>
                  <h3 className="text-3xl font-bold">{offered.length}</h3>
                </div>
                <div className="p-3 bg-muted rounded-full">
                  <Briefcase className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Applications</CardTitle>
              <CardDescription>Jobs you’ve applied to or been invited to.</CardDescription>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="py-12 text-center space-y-4">
                  <div className="inline-flex p-4 rounded-full bg-muted">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">You haven’t applied to any jobs yet.</p>
                  <Button asChild>
                    <Link href="/">
                      Browse jobs <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {applications.map((app) => (
                    <div
                      key={app.application_id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{app.job_title}</h3>
                          <Badge variant={statusVariant(app.application_status)}>
                            {app.application_status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {app.job_company_name}
                          </span>
                          {app.job_category && (
                            <span>{app.job_category}</span>
                          )}
                          {app.job_seniority && (
                            <span>{app.job_seniority}</span>
                          )}
                          {app.applied_at && (
                            <span>Applied {new Date(app.applied_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/candidate/${app.job_profile_id}/apply`}>
                            View application
                          </Link>
                        </Button>
                        {['applied', 'screening', 'in_interview'].includes(app.application_status) && (
                          <Button size="sm" asChild>
                            <Link href={`/candidate/${app.job_profile_id}/interview`}>
                              Continue <ArrowRight className="w-4 h-4 ml-1" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
