"use client";

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Users,
  ArrowLeft,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function EmployerJobDetails({
  params,
}: {
  params: Promise<{ employerId: string; jobId: string }>;
}) {
  const { employerId, jobId } = use(params);
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetch(`/api/employer/jobs/${jobId}/applications`, { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setJob(json.job);
        setApplications(json.applications ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError('Could not load candidates for this job.');
        console.error(err);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const handlePublish = async () => {
    if (!job || job.publish_state === 'published') return;
    setIsPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/employer/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ publishState: 'published' }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      setJob((prev: any) => (prev ? { ...prev, publish_state: 'published' } : prev));
    } catch (err) {
      console.error('Failed to publish job', err);
      setPublishError('Could not publish job. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const fetchReport = async (applicationId: string) => {
    setReportLoading(true);
    setSelectedReport(null);
    try {
      const res = await fetch(`/api/employer/applications/${applicationId}/report`, {
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSelectedReport(json.report);
    } catch (e) {
      console.error('Failed to load report', e);
      setSelectedReport({ error: 'Report not available yet.' });
    } finally {
      setReportLoading(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'completed' || status === 'offered')
      return <CheckCircle2 className="w-3 h-3 text-green-500" />;
    if (status === 'rejected' || status === 'withdrawn')
      return <XCircle className="w-3 h-3 text-destructive" />;
    return <Clock className="w-3 h-3 text-amber-500" />;
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <header className="px-6 h-16 flex items-center border-b bg-white shrink-0">
        <Link
          href={`/employer/${employerId}`}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bold tracking-tight text-primary">AegisHire</span>
        </Link>
      </header>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold">{job?.title ?? 'Job'}</h1>
            <p className="text-muted-foreground mt-1">
              {job?.company_name ?? 'Company'}
              {job?.category && <span> • {job.category}</span>}
              {job?.location && <span> • {job.location}</span>}
              {' • '}
              {job?.publish_state === 'published' ? 'Pipeline Active' : 'Draft'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/employer/${employerId}/jobs/new`}>Edit Pipeline</Link>
            </Button>
            <Button
              onClick={handlePublish}
              disabled={!job || job.publish_state === 'published' || isPublishing}
            >
              {job?.publish_state === 'published'
                ? 'Published'
                : isPublishing
                ? 'Publishing...'
                : 'Publish'}
            </Button>
          </div>
        </div>

        {publishError && (
          <div className="mb-4 text-sm text-destructive">{publishError}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" /> Candidates
            </CardTitle>
            <CardDescription>
              Track progression through the automated multi-stage pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading candidates…
              </div>
            ) : loadError ? (
              <div className="py-10 text-sm text-destructive text-center">{loadError}</div>
            ) : applications.length === 0 ? (
              <div className="py-10 text-sm text-muted-foreground text-center">
                No applications yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Fit Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Stage</TableHead>
                    <TableHead>Rec.</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium">
                          {a.user?.full_name ?? a.user?.email ?? 'Candidate'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {a.user?.email ?? ''}
                        </div>
                        {a.user?.profile_summary && (
                          <div
                            className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate"
                            title={a.user.profile_summary}
                          >
                            {a.user.profile_summary}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{a.user?.phone ?? '—'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            (a.fit_score ?? 0) > 80
                              ? 'default'
                              : (a.fit_score ?? 0) > 60
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {a.fit_score ?? 0}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {statusIcon(a.status)}
                          <span className="capitalize text-xs font-medium">
                            {String(a.status).replace('_', ' ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.status === 'completed'
                          ? 'Completed'
                          : typeof a.current_stage_index === 'number'
                          ? `Stage ${a.current_stage_index + 1}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            (a.report?.recommendation ?? a.recommendation) === 'Strong Hire'
                              ? 'border-green-500 text-green-600 bg-green-50'
                              : (a.report?.recommendation ?? a.recommendation) === 'No Hire'
                              ? 'border-destructive text-destructive bg-destructive/5'
                              : ''
                          }
                        >
                          {a.report?.recommendation ?? a.recommendation ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!a.report}
                              onClick={() => {
                                setSelectedApplication(a);
                                fetchReport(a.id);
                              }}
                            >
                              {a.report ? 'View Report' : 'No Report'}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                <FileText className="w-6 h-6 text-primary" />
                                AI Evaluation Report:{' '}
                                {selectedApplication?.user?.full_name ??
                                  selectedApplication?.user?.email ??
                                  'Candidate'}
                              </DialogTitle>
                              <DialogDescription>
                                Generated report for this application.
                              </DialogDescription>
                            </DialogHeader>

                            <div className="mt-6 space-y-8">
                              {reportLoading ? (
                                <div className="py-10 flex items-center justify-center text-muted-foreground">
                                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading
                                  report…
                                </div>
                              ) : selectedReport?.error ? (
                                <div className="text-sm text-destructive">
                                  {selectedReport.error}
                                </div>
                              ) : (
                                <Tabs defaultValue="markdown" className="w-full">
                                  <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="markdown">Markdown</TabsTrigger>
                                    <TabsTrigger value="json">JSON</TabsTrigger>
                                  </TabsList>
                                  <TabsContent
                                    value="markdown"
                                    className="p-6 border rounded-lg mt-2 bg-white"
                                  >
                                    <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                                      {selectedReport?.human_readable_report ?? 'No report text.'}
                                    </pre>
                                  </TabsContent>
                                  <TabsContent
                                    value="json"
                                    className="p-6 border rounded-lg mt-2 bg-white"
                                  >
                                    <pre className="whitespace-pre-wrap text-xs leading-relaxed">
                                      {JSON.stringify(
                                        selectedReport?.report_json ?? selectedReport ?? {},
                                        null,
                                        2,
                                      )}
                                    </pre>
                                  </TabsContent>
                                </Tabs>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
