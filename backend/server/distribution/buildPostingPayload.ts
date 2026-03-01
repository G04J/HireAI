import type { Database } from '@/lib/supabaseClient';

type JobProfile = Database['public']['Tables']['job_profiles']['Row'];

export interface PostingPackage {
  title: string;
  company_name: string;
  location: string | null;
  description: string;
  seniority: string;
  skills: string[];
  salary_band_placeholder?: string;
  apply_url: string;
  external_reference_id: string;
  updated_at: string;
}

/**
 * Builds the canonical posting payload for distribution channels.
 * applyBaseUrl should be the public origin, e.g. https://app.hirelens.com
 */
export function buildPostingPayload(
  job: JobProfile,
  jobId: string,
  applyBaseUrl: string
): PostingPackage {
  const applyUrl = `${applyBaseUrl.replace(/\/$/, '')}/candidate/${jobId}/apply`;
  return {
    title: job.title,
    company_name: job.company_name,
    location: job.location,
    description: job.description,
    seniority: job.seniority,
    skills: job.must_have_skills ?? [],
    salary_band_placeholder: undefined,
    apply_url: applyUrl,
    external_reference_id: jobId,
    updated_at: job.updated_at,
  };
}
