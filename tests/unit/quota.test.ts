import { checkGenerationQuota } from '@/lib/quota';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    subscription: {
      findFirst: jest.fn(),
    },
    creditsLedger: {
      aggregate: jest.fn(),
    },
  },
}));

import prisma from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Quota Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow generation when user has sufficient credits', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user_1',
      credits: 100,
      email: 'test@example.com',
      username: 'testuser',
      role: 'member',
    });

    (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue({
      plan: { creditQuota: 50, code: 'FREE' },
    });

    (mockPrisma.creditsLedger.aggregate as jest.Mock).mockResolvedValue({
      _sum: { delta: -10 },
    });

    const result = await checkGenerationQuota('user_1', 5);
    expect(result.allowed).toBe(true);
    expect(result.currentCredits).toBe(100);
  });

  it('should reject when user credits are insufficient', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user_1',
      credits: 2,
      email: 'test@example.com',
      username: 'testuser',
      role: 'member',
    });

    (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue({
      plan: { creditQuota: 50, code: 'FREE' },
    });

    (mockPrisma.creditsLedger.aggregate as jest.Mock).mockResolvedValue({
      _sum: { delta: -48 },
    });

    const result = await checkGenerationQuota('user_1', 5);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Insufficient credits');
  });

  it('should return error when user not found', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await checkGenerationQuota('nonexistent', 5);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('User not found');
  });

  it('should default to FREE plan quota when no subscription', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user_1',
      credits: 100,
      email: 'test@example.com',
      username: 'testuser',
      role: 'member',
    });

    (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue(null);

    (mockPrisma.creditsLedger.aggregate as jest.Mock).mockResolvedValue({
      _sum: { delta: 0 },
    });

    const result = await checkGenerationQuota('user_1', 5);
    expect(result.allowed).toBe(true);
  });
});
