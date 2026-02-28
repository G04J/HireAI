/**
 * POST /api/sessions/[sessionId]/complete — requires auth; returns 401 when not logged in.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock('@/lib/supabaseClient', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/ai/flows/generate-evaluation-report-flow', () => ({
  generateEvaluationReport: vi.fn().mockResolvedValue({
    hiringRecommendation: 'Hire',
    humanReadableReport: '# Report',
  }),
}));

describe('POST /api/sessions/[sessionId]/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { POST } = await import('@/app/api/sessions/[sessionId]/complete/route');
    const req = new Request('http://localhost/api/sessions/sess-1/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stageResults: [], candidateData: null, resumeFitCheckResult: null }),
    });
    const res = await POST(req as any, { params: Promise.resolve({ sessionId: 'sess-1' }) });

    expect(res.status).toBe(401);
  });
});
