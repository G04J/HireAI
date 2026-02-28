/**
 * POST /api/applications/[applicationId]/session/start — requires auth; returns 401 when not logged in.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock('@/lib/supabaseClient', () => ({
  createServerSupabaseClient: () => ({
    from: mockFrom,
  }),
}));

describe('POST /api/applications/[applicationId]/session/start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      if (table === 'job_applications') {
        builder.maybeSingle.mockResolvedValue({
          data: { id: 'app-1', user_id: 'user-1', job_profile_id: 'job-1', status: 'applied' },
          error: null,
        });
      }
      if (table === 'interview_sessions') {
        builder.eq = vi.fn().mockReturnThis();
        builder.order = vi.fn().mockReturnThis();
        builder.limit = vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        });
        builder.insert = vi.fn().mockReturnThis();
        builder.single = vi.fn().mockResolvedValue({
          data: { id: 'session-1' },
          error: null,
        });
      }
      if (table === 'job_stages') {
        builder.eq = vi.fn().mockReturnThis();
        builder.order = vi.fn().mockReturnThis();
        builder.limit = vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'stage-1' }, error: null }),
        });
      }
      if (table === 'stage_sessions') {
        builder.eq = vi.fn().mockReturnThis();
        builder.order = vi.fn().mockReturnThis();
        builder.limit = vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        });
        builder.insert = vi.fn().mockReturnThis();
        builder.single = vi.fn().mockResolvedValue({
          data: { id: 'stage-session-1' },
          error: null,
        });
      }
      return builder;
    });
  });

  it('returns 401 when user is not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { POST } = await import('@/app/api/applications/[applicationId]/session/start/route');
    const res = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ applicationId: 'app-1' }),
    });

    expect(res.status).toBe(401);
  });

  it('returns 404 when application not found', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockFrom.mockImplementation((table: string) => {
      const b: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      if (table === 'job_applications') {
        b.maybeSingle.mockResolvedValue({ data: null, error: null });
      }
      return b;
    });

    const { POST } = await import('@/app/api/applications/[applicationId]/session/start/route');
    const res = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ applicationId: 'app-none' }),
    });

    expect(res.status).toBe(404);
  });
});
