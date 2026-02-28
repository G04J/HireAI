/**
 * POST /api/jobs/[jobId]/apply — requires auth; returns 401 when not logged in.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockAuthClient = vi.fn(() => ({
  auth: { getUser: mockGetUser },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockAuthClient(),
}));

vi.mock('@/lib/supabaseClient', () => ({
  createServerSupabaseClient: () => ({
    from: mockFrom,
  }),
}));

describe('POST /api/jobs/[jobId]/apply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { POST } = await import('@/app/api/jobs/[jobId]/apply/route');
    const req = new Request('http://localhost/api/jobs/job-1/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formData: { name: 'A', email: 'a@b.com' }, fitResult: null }),
    });
    const res = await POST(req as any, { params: Promise.resolve({ jobId: 'job-1' }) });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/unauthorized/i);
  });

  it('returns 404 when job does not exist', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'u@x.com' } },
      error: null,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const { POST } = await import('@/app/api/jobs/[jobId]/apply/route');
    const req = new Request('http://localhost/api/jobs/job-1/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formData: {}, fitResult: null }),
    });
    const res = await POST(req as any, { params: Promise.resolve({ jobId: 'job-1' }) });

    expect(res.status).toBe(404);
  });
});
