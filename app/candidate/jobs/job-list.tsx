'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Building2, MapPin, Clock } from 'lucide-react';
import { JobActions } from './job-actions';

type Job = {
  id: string;
  title: string;
  company_name: string;
  location: string | null;
  seniority: string | null;
  category: string | null;
  created_at: string;
};

type JobListProps = {
  jobs: Job[];
  applicationsByJobId: Record<string, unknown>;
  savedJobIds: string[];
  userId: string;
};

export function JobList({ jobs, applicationsByJobId, savedJobIds, userId }: JobListProps) {
  const savedSet = new Set(savedJobIds);
  return (
    <Card className="bg-slate-900/60 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Open roles</CardTitle>
        <CardDescription className="text-slate-400">
          Roles published by employers on hireLens.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="py-10 text-sm text-slate-400 text-center">
            No published jobs are available yet. Check back soon.
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job: Job) => {
              const app = applicationsByJobId[job.id];
              const hasApplied = Boolean(app);
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
                  <JobActions
                    jobId={job.id}
                    userId={userId}
                    hasApplied={hasApplied}
                    saved={savedSet.has(job.id)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
