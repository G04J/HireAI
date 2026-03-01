import type { PostingPackage } from './buildPostingPayload';
import type { PostingResult } from './types';

/**
 * LinkedIn distribution adapter.
 * In simulated mode: returns posted with a mock external_job_id.
 * In real mode (future): call LinkedIn API with credentials from env.
 */
export async function postToLinkedIn(payload: PostingPackage): Promise<PostingResult> {
  const simulated = !process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_ACCESS_TOKEN;

  if (simulated) {
    const mockId = `li-mock-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return {
      status: 'posted',
      external_job_id: mockId,
      last_error: null,
    };
  }

  // TODO: call LinkedIn Job API when credentials are configured
  return {
    status: 'error',
    external_job_id: null,
    last_error: 'LinkedIn integration not implemented',
  };
}
