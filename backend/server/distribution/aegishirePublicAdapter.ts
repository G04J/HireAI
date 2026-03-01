import type { PostingPackage } from './buildPostingPayload';
import type { PostingResult } from './types';

/**
 * hireLens public job page adapter.
 * No external API; "posting" here means the job is visible on our public jobs page.
 * We just return posted with the internal job id as reference.
 */
export async function postToAegisHirePublic(
  payload: PostingPackage,
  publicSlug: string
): Promise<PostingResult> {
  return {
    status: 'posted',
    external_job_id: publicSlug || payload.external_reference_id,
    last_error: null,
  };
}
