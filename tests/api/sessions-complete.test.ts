/**
 * POST /api/sessions/[sessionId]/complete — requires auth; transforms client stageResults and calls evaluation flow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockGenerateEvaluationReport = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock('@/lib/supabaseClient', () => ({
  createServerSupabaseClient: () => ({ from: mockFrom }),
}));

vi.mock('@/ai/flows/generate-evaluation-report-flow', () => ({
  generateEvaluationReport: (...args: unknown[]) => mockGenerateEvaluationReport(...args),
}));

const STAGE_ID = '733a20d3-918c-47ec-85f4-5dd0f843c745';

function supabaseChain(resolved: unknown, orderReturnsPromise = false) {
  const chain = vi.fn().mockReturnThis();
  const order = orderReturnsPromise
    ? vi.fn().mockResolvedValue(resolved)
    : chain;
  return {
    select: chain,
    eq: chain,
    order,
    maybeSingle: vi.fn().mockResolvedValue(resolved),
    single: vi.fn().mockResolvedValue(resolved),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

describe('POST /api/sessions/[sessionId]/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEvaluationReport.mockResolvedValue({
      hiringRecommendation: 'Hire',
      humanReadableReport: '# Report',
      overallConfidenceScore: 75,
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'interview_sessions') {
        return supabaseChain({
          data: {
            id: 'sess-1',
            user_id: 'user-1',
            application_id: 'app-1',
            job_profile_id: 'job-1',
            status: 'in_progress',
          },
          error: null,
        });
      }
      if (table === 'job_profiles') {
        return supabaseChain({
          data: {
            id: 'job-1',
            title: 'Junior Backend Developer',
            company_name: 'Meta',
            description: 'Backend role',
            seniority: 'Junior',
            must_have_skills: ['React'],
          },
          error: null,
        });
      }
      if (table === 'job_stages') {
        return supabaseChain(
          {
            data: [
              { id: STAGE_ID, type: 'behavioral', ai_usage_policy: 'allowed' },
            ],
            error: null,
          },
          true
        );
      }
      return supabaseChain({ data: null, error: null });
    });
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

  it('transforms client stageResults to flow format (stageId, question, candidateAnswer, aiAllowed) and calls generateEvaluationReport', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: 'user-1', email: 'u@test.com', user_metadata: {} },
      },
      error: null,
    });

    const clientStageResults = [
      {
        stageType: 'behavioral',
        answers: [
          { question: 'Tell me about yourself.', answer: 'I am a developer.', score: 80 },
          { question: 'Describe a challenge.', answer: 'I fixed a bug.', score: 70 },
        ],
      },
    ];

    const { POST } = await import('@/app/api/sessions/[sessionId]/complete/route');
    const req = new Request('http://localhost/api/sessions/sess-1/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stageResults: clientStageResults,
        candidateData: null,
        resumeFitCheckResult: null,
      }),
    });
    const res = await POST(req as any, { params: Promise.resolve({ sessionId: 'sess-1' }) });

    expect(res.status).toBe(200);
    expect(mockGenerateEvaluationReport).toHaveBeenCalledTimes(1);
    const input = mockGenerateEvaluationReport.mock.calls[0][0] as { stageResults: Array<{ stageId: string; stageType: string; question: string; candidateAnswer: string; aiAllowed: boolean }> };
    expect(input.stageResults).toHaveLength(2);
    expect(input.stageResults[0]).toMatchObject({
      stageId: STAGE_ID,
      stageType: 'behavioral',
      question: 'Tell me about yourself.',
      candidateAnswer: 'I am a developer.',
      aiAllowed: true,
    });
    expect(input.stageResults[1]).toMatchObject({
      stageId: STAGE_ID,
      stageType: 'behavioral',
      question: 'Describe a challenge.',
      candidateAnswer: 'I fixed a bug.',
      aiAllowed: true,
    });
  });
});
