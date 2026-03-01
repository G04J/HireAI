'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Briefcase, Building2, MapPin, Clock, ArrowRight, Loader2,
  CheckCircle2, XCircle, AlertTriangle, Sparkles, Shield,
} from 'lucide-react';

const CONFIDENCE_THRESHOLD = 60;

interface Job {
  id: string;
  title: string;
  company_name: string;
  location: string | null;
  description?: string;
  seniority: string | null;
  category: string | null;
  must_have_skills?: string[] | null;
  created_at: string;
}

interface JobBoardClientProps {
  jobs: Job[];
  applicationsByJobId: Record<string, any>;
  userId: string;
  hasProfile: boolean;
}

export function JobBoardClient({ jobs, applicationsByJobId, userId, hasProfile }: JobBoardClientProps) {
  const router = useRouter();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [confidenceResult, setConfidenceResult] = useState<any>(null);
  const [checkingConfidence, setCheckingConfidence] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const openJobDialog = async (job: Job) => {
    setSelectedJob(job);
    setDialogOpen(true);
    setConfidenceResult(null);
    setApplyError(null);

    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`);
      if (res.ok) {
        const data = await res.json();
        setJobDetails({ ...data.job, stages: data.stages ?? [] });
      } else {
        setJobDetails(job);
      }
    } catch (err) {
      console.error('Error fetching job details', err);
      setJobDetails(job);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCheckConfidence = async () => {
    if (!selectedJob) return;
    setCheckingConfidence(true);
    setApplyError(null);
    try {
      const res = await fetch('/api/candidate/confidence-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ jobId: selectedJob.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      setConfidenceResult(result);
    } catch (err: any) {
      setApplyError(err.message ?? 'Failed to assess confidence. Please try again.');
    } finally {
      setCheckingConfidence(false);
    }
  };

  const handleApply = async () => {
    if (!selectedJob || !confidenceResult) return;
    setApplying(true);
    setApplyError(null);
    try {
      const res = await fetch(`/api/jobs/${selectedJob.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          formData: {},
          fitResult: {
            fitScore: confidenceResult.confidenceScore,
            matchedSkills: confidenceResult.matchedSkills,
            missingSkills: confidenceResult.missingSkills,
          },
          confidenceAssessment: confidenceResult,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error || `HTTP ${res.status}`);
      }
      setDialogOpen(false);
      router.push(`/candidate/${userId}`);
    } catch (err: any) {
      setApplyError(err.message ?? 'Failed to apply. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const meetsThreshold = confidenceResult && confidenceResult.confidenceScore >= CONFIDENCE_THRESHOLD;
  const details = jobDetails || selectedJob;

  return (
    <>
      <Card className="bg-slate-900/60 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Open roles</CardTitle>
          <CardDescription className="text-slate-400">Click on a role to see details and apply.</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="py-10 text-sm text-slate-400 text-center">
              No published jobs are available yet. Check back soon.
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => {
                const app = applicationsByJobId[job.id];
                const hasApplied = Boolean(app);

                return (
                  <div
                    key={job.id}
                    className="border border-white/10 rounded-lg bg-slate-800/40 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:border-purple-500/40 hover:bg-slate-800/60 transition-all"
                    onClick={() => !hasApplied && openJobDialog(job)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') !hasApplied && openJobDialog(job); }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-semibold text-lg text-white">{job.title?.trim() || 'Untitled role'}</h2>
                        <Badge variant="outline" className="text-xs border-white/20 text-slate-300">
                          {job.category || 'General'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {job.company_name?.trim() || 'Company'}</span>
                        {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>}
                        {job.seniority && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {job.seniority}</span>}
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Posted {new Date(job.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {hasApplied ? (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="bg-purple-600/80 hover:bg-purple-500 text-white border border-purple-500/50"
                        >
                          <Link href={`/candidate/${userId}/${job.id}`}>
                            View application
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => openJobDialog(job)}
                          className="bg-purple-600 hover:bg-purple-500 text-white border-0"
                        >
                          View & Apply
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

      {/* Job Detail + Apply Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border-white/10 text-white">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl text-white">{selectedJob.title}</DialogTitle>
                <DialogDescription asChild>
                  <div className="text-sm text-slate-400 mt-2 flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1"><Building2 className="w-4 h-4" /> {selectedJob.company_name}</span>
                    {selectedJob.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedJob.location}</span>}
                    {selectedJob.seniority && <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {selectedJob.seniority}</span>}
                    {selectedJob.category && <Badge variant="secondary" className="bg-slate-700 text-slate-200">{selectedJob.category}</Badge>}
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
                ) : (
                  <>
                    {details?.description && (
                      <div>
                        <h3 className="font-semibold text-white mb-2">Job Description</h3>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{details.description}</p>
                      </div>
                    )}
                    {(details?.must_have_skills ?? details?.mustHaveSkills)?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-white mb-2">Required Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {(details.must_have_skills ?? details.mustHaveSkills ?? []).map((skill: string) => (
                            <Badge key={skill} variant="secondary" className="bg-slate-700 text-slate-200">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {details?.stages?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-white mb-2">Interview Pipeline</h3>
                        <div className="space-y-2">
                          {details.stages.map((stage: any, i: number) => (
                            <div key={stage.id || i} className="flex items-center gap-3 p-2 rounded-lg border border-white/10 bg-slate-800/40">
                              <div className="w-6 h-6 rounded-full border-2 border-white/20 flex items-center justify-center text-xs font-bold text-slate-400">{i + 1}</div>
                              <span className="text-sm text-white capitalize">{stage.type}</span>
                              {stage.duration_minutes && <span className="text-xs text-slate-400 ml-auto">{stage.duration_minutes} min</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Confidence Score Section */}
                {!hasProfile ? (
                  <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="font-semibold text-yellow-400">Profile Required</h4>
                        <p className="text-sm text-yellow-300/80 mt-1">
                          You need to complete your profile before applying. hireLens uses your profile data instead of a resume to match you with jobs.
                        </p>
                        <Button asChild size="sm" className="mt-3 bg-yellow-600 hover:bg-yellow-500 text-white border-0">
                          <Link href={`/candidate/${userId}/profile`}>Complete Profile</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : confidenceResult ? (
                  <div className={`p-4 rounded-lg border ${meetsThreshold ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                    <div className="flex items-start gap-3">
                      {meetsThreshold ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 space-y-3">
                        <div>
                          <h4 className={`font-semibold ${meetsThreshold ? 'text-green-400' : 'text-red-400'}`}>
                            Confidence Score: {confidenceResult.confidenceScore}%
                          </h4>
                          <p className={`text-sm mt-1 ${meetsThreshold ? 'text-green-300/80' : 'text-red-300/80'}`}>
                            {confidenceResult.overallAssessment}
                          </p>
                        </div>
                        <div className="w-full">
                          <Progress value={confidenceResult.confidenceScore} className={`h-2 ${meetsThreshold ? 'bg-green-900' : 'bg-red-900'}`} />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {confidenceResult.matchedSkills?.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-white mb-1">Matched Skills</h5>
                              <div className="flex flex-wrap gap-1">
                                {confidenceResult.matchedSkills.map((s: string) => (
                                  <Badge key={s} className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">{s}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {confidenceResult.missingSkills?.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-white mb-1">Gaps</h5>
                              <div className="flex flex-wrap gap-1">
                                {confidenceResult.missingSkills.map((s: string) => (
                                  <Badge key={s} variant="outline" className="border-red-500/30 text-red-300 text-xs">{s}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {confidenceResult.experienceMatch && (
                          <p className="text-xs text-slate-400">{confidenceResult.experienceMatch}</p>
                        )}
                        {!meetsThreshold && (
                          <p className="text-sm text-red-300/80">
                            Your confidence score is below the minimum threshold of {CONFIDENCE_THRESHOLD}%. Consider enhancing your profile or building relevant skills before applying.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {applyError && (
                  <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-3">{applyError}</div>
                )}
              </div>

              <DialogFooter className="mt-4 gap-2">
                {!confidenceResult && hasProfile && (
                  <Button
                    onClick={handleCheckConfidence}
                    disabled={checkingConfidence}
                    className="bg-purple-600 hover:bg-purple-500 text-white border-0 shadow-lg shadow-purple-600/30"
                  >
                    {checkingConfidence ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Assessing fit...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> Check My Fit</>
                    )}
                  </Button>
                )}
                {confidenceResult && meetsThreshold && (
                  <Button
                    onClick={handleApply}
                    disabled={applying}
                    className="bg-green-600 hover:bg-green-500 text-white border-0 shadow-lg shadow-green-600/30"
                  >
                    {applying ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Applying...</>
                    ) : (
                      <><ArrowRight className="w-4 h-4 mr-2" /> Apply Now</>
                    )}
                  </Button>
                )}
                {confidenceResult && !meetsThreshold && (
                  <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
                    <Link href={`/candidate/${userId}/profile`}>Improve Profile</Link>
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
