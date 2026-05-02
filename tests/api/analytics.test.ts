// API Tests: Analytics — route-isolated (no live server dependency)
// Uses direct route handler invocation with mocked prisma.

import { NextRequest } from 'next/server';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    prompt: { findMany: jest.fn() },
    order: { findMany: jest.fn() },
    generationRun: { findMany: jest.fn() },
  },
}));

jest.mock('../../lib/audit', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
  getClientIp: jest.fn().mockReturnValue(null),
}));

import { GET } from '../../app/api/analytics/creator/route';

function makeMockGetRequest(url: string): NextRequest {
  return new Request(url) as unknown as NextRequest;
}

describe('API: Analytics', () => {
  const prisma = jest.requireMock('../../lib/prisma').default;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/analytics/creator', () => {
    it('should return 422 when userId is missing', async () => {
      const req = makeMockGetRequest('http://localhost/api/analytics/creator');
      const res = await GET(req);
      const json = await res.json();
      expect(res.status).toBe(422);
      expect(json.ok).toBe(false);
      expect(json.error).toBeTruthy(); // Zod validation error
    });

    it('should return 422 when userId is empty', async () => {
      const req = makeMockGetRequest('http://localhost/api/analytics/creator?userId=');
      const res = await GET(req);
      const json = await res.json();
      expect(res.status).toBe(422);
      expect(json.ok).toBe(false);
    });

    it('should return analytics data for valid userId', async () => {
      prisma.prompt.findMany.mockResolvedValue([
        { id: 'p1', title: 'Prompt 1', viewCount: 100, saveCount: 10, status: 'published' },
        { id: 'p2', title: 'Prompt 2', viewCount: 50, saveCount: 5, status: 'published' },
      ]);
      prisma.order.findMany.mockResolvedValue([
        { id: 'o1', amountCredits: 100, sellerId: 'uid1' },
        { id: 'o2', amountCredits: 50, sellerId: 'uid1' },
      ]);
      prisma.generationRun.findMany.mockResolvedValue([
        { id: 'g1', userId: 'uid1', status: 'succeeded' },
        { id: 'g2', userId: 'uid1', status: 'succeeded' },
        { id: 'g3', userId: 'uid1', status: 'failed' },
      ]);
      const req = makeMockGetRequest('http://localhost/api/analytics/creator?userId=uid1');
      const res = await GET(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.summary.totalPrompts).toBe(2);
      expect(json.data.summary.totalViews).toBe(150);
      expect(json.data.summary.totalSaves).toBe(15);
      expect(json.data.summary.totalRevenue).toBe(150);
      expect(json.data.summary.totalGenerations).toBe(3);
      expect(json.data.summary.succeededGenerations).toBe(2);
    });

    it('should return 500 when database throws', async () => {
      prisma.prompt.findMany.mockRejectedValue(new Error('Database error'));
      const req = makeMockGetRequest('http://localhost/api/analytics/creator?userId=uid1');
      const res = await GET(req);
      const json = await res.json();
      expect(res.status).toBe(500);
      expect(json.ok).toBe(false);
    });

    it('should handle zero data gracefully', async () => {
      prisma.prompt.findMany.mockResolvedValue([]);
      prisma.order.findMany.mockResolvedValue([]);
      prisma.generationRun.findMany.mockResolvedValue([]);
      const req = makeMockGetRequest('http://localhost/api/analytics/creator?userId=uid1');
      const res = await GET(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.summary.totalPrompts).toBe(0);
      expect(json.data.summary.totalViews).toBe(0);
      expect(json.data.summary.conversionRate).toBe('0');
    });
  });
});
