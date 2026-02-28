import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle2, ArrowRight, Star } from 'lucide-react';

async function getCompletedData(candidateId: string, jobId: string) {
  const supabase = createServerSupabaseClient();

  const [jobRes, appRes] = await Promise.all([
    supabase
      .from('job_profiles')
      .select('title, company_name')
      .eq('id', jobId)
      .maybeSingle(),
    supabase
      .from('job_applications')
      .select('id, status, fit_score, recommendation')
      .eq('user_id', candidateId)
      .eq('job_profile_id', jobId)
      .maybeSingle(),
  ]);

  let report: any = null;
  if (appRes.data?.id) {
    const { data: rep } = await supabase
      .from('reports')
      .select('recommendation, overall_score, human_readable_report')
      .eq('application_id', appRes.data.id)
      .maybeSingle();
    report = rep ?? null;
  }

  return { job: jobRes.data, application: appRes.data, report };
}

export default async function CompletedPage({
  params,
}: {
  params: Promise<{ candidateId: string; jobId: string }>;
}) {
  const { candidateId, jobId } = await params;
  const { job, application, report } = await getCompletedData(candidateId, jobId);

  const recommendation = report?.recommendation ?? application?.recommendation ?? null;
  const isPositive = recommendation && ['Strong Hire', 'Hire'].some((r) => recommendation.includes(r));
  const isNegative = recommendation && ['No Hire'].some((r) => recommendation.includes(r));

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <header className="px-6 h-16 flex items-center border-b bg-white">
        <Link href={`/candidate/${candidateId}`} className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-primary">AegisHire</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full space-y-6 text-center">
          {/* Big tick */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight">Interview Complete!</h1>
            {job && (
              <p className="text-muted-foreground text-lg">
                You've finished the assessment for{' '}
                <span className="font-semibold text-foreground">{job.title}</span> at{' '}
                <span className="font-semibold text-foreground">{job.company_name}</span>.
              </p>
            )}
          </div>

          {recommendation && (
            <Card className={`border-2 ${isPositive ? 'border-green-200 bg-green-50' : isNegative ? 'border-destructive/20 bg-destructive/5' : 'border-primary/10 bg-primary/5'}`}>
              <CardContent className="py-6 flex flex-col items-center gap-3">
                <Star className={`w-8 h-8 ${isPositive ? 'text-green-500 fill-green-500' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">AI Recommendation</p>
                  <Badge
                    className="text-base px-4 py-1"
                    variant={isPositive ? 'default' : isNegative ? 'destructive' : 'secondary'}
                  >
                    {recommendation}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  The hiring team at {job?.company_name ?? 'the company'} will review your full report and be in touch.
                </p>
              </CardContent>
            </Card>
          )}

          {!recommendation && (
            <Card>
              <CardContent className="py-6">
                <p className="text-muted-foreground">
                  Your responses have been recorded. The hiring team will review your assessment and be in touch shortly.
                </p>
              </CardContent>
            </Card>
          )}

          {report?.human_readable_report && (
            <Card className="text-left">
              <CardContent className="py-6">
                <h3 className="font-bold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Your Evaluation Summary</h3>
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground font-sans">
                  {report.human_readable_report.slice(0, 800)}
                  {report.human_readable_report.length > 800 ? '…' : ''}
                </pre>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link href={`/candidate/${candidateId}`}>
                Back to dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/jobBoard">Browse more jobs</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
