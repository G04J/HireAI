export type DistributionChannel = 'linkedin' | 'seek' | 'aegishire_public';

export type DistributionStatus = 'draft' | 'queued' | 'posted' | 'updated' | 'closed' | 'error';

export interface PostingResult {
  status: DistributionStatus;
  external_job_id: string | null;
  last_error: string | null;
}
