/**
 * GET /api/employer/jobs/[jobId]/applications — requires employer auth; returns 401 when not logged in.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/employer-default', () => ({
  getEmployerIdForRequest: vi.fn(),
}));

describe('GET /api/employer/jobs/[jobId]/applications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when employer id is null', async () => {
    const { getEmployerIdForRequest } = await import('@/lib/employer-default');
    (getEmployerIdForRequest as any).mockResolvedValue(null);

    const { GET } = await import('@/app/api/employer/jobs/[jobId]/applications/route');
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ jobId: 'job-1' }),
    });

    expect(res.status).toBe(401);
  });
});
