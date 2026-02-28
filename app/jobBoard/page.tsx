import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Briefcase, Building2, MapPin, Clock } from 'lucide-react';

export default async function JobBoard() {
  const supabase = createServerSupabaseClient();

  const { data: jobs, error } = await supabase
    .from('job_profiles')
    .select('id, public_slug, title, company_name, location, seniority, category, publish_state, created_at')
    .eq('publish_state', 'published')
    .order('created_at', { ascending: false });

  const safeJobs = error ? [] : jobs ?? [];

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <header className="px-6 h-16 flex items-center border-b bg-white">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-primary">AegisHire</span>
        </Link>
      </header>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Job board</h1>
          <p className="text-muted-foreground mt-1">
            Browse all active roles that are currently published on AegisHire.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Open roles</CardTitle>
            <CardDescription>Publicly visible jobs; links go to the public job page.</CardDescription>
          </CardHeader>
          <CardContent>
            {safeJobs.length === 0 ? (
              <div className="py-10 text-sm text-muted-foreground text-center">
                No published jobs are available yet. Check back soon.
              </div>
            ) : (
              <div className="space-y-4">
                {safeJobs.map((job: any) => {
                  const href = job.public_slug ? `/jobs/${job.public_slug}` : `/jobs/${job.id}`;
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
                        <Button size="sm" asChild>
                          <Link href={href}>View job</Link>
                        </Button>
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

