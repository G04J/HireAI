/**
 * Tests for employer-default: getEmployerIdForRequest returns null when not logged in.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockCreateAuthClient = vi.fn(() => ({
  auth: { getUser: mockGetUser },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateAuthClient(),
}));

vi.mock('@/lib/supabaseClient', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('getEmployerIdForRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when user is not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { getEmployerIdForRequest } = await import('@/lib/employer-default');
    const result = await getEmployerIdForRequest();

    expect(result).toBeNull();
  });

  it('does not call getDefaultEmployerId when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { getEmployerIdForRequest } = await import('@/lib/employer-default');
    await getEmployerIdForRequest();

    expect(mockGetUser).toHaveBeenCalled();
  });
});
