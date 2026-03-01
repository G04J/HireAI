import type { PostingPackage } from './buildPostingPayload';
import type { PostingResult } from './types';

/**
 * SEEK distribution adapter.
 * In simulated mode: returns posted with a mock external_job_id.
 * In real mode (future): call SEEK API with credentials from env.
 */
export async function postToSeek(payload: PostingPackage): Promise<PostingResult> {
  const simulated = !process.env.SEEK_API_KEY;

  if (simulated) {
    const mockId = `seek-mock-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return {
      status: 'posted',
      external_job_id: mockId,
      last_error: null,
    };
  }

  // TODO: call SEEK API when credentials are configured
  return {
    status: 'error',
    external_job_id: null,
    last_error: 'SEEK integration not implemented',
  };
}
