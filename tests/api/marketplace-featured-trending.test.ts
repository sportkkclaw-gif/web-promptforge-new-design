// API Tests: Marketplace Featured & Trending — route-isolated
// Covers: GET /api/marketplace/featured, GET /api/marketplace/trending

import { NextRequest } from 'next/server';

// ─── Mock prisma ─────────────────────────────────────────────────────────────
// Use module-level refs so the routing closure captures current state at call time
const mockFeaturedFindMany = jest.fn();
const mockTrendingFindMany = jest.fn();

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    prompt: {
      findMany: jest.fn((...args: unknown[]) => {
        const query = args[0] as { where?: { updatedAt?: unknown } } | undefined;
        const isTrendingQuery = Boolean(query?.where && 'updatedAt' in query.where);
        return isTrendingQuery ? mockTrendingFindMany(...args) : mockFeaturedFindMany(...args);
      }),
    },
  },
}));

jest.mock('../../lib/audit', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
  getClientIp: jest.fn().mockReturnValue(null),
}));

let featuredRoute: typeof import('../../app/api/marketplace/featured/route');
let trendingRoute: typeof import('../../app/api/marketplace/trending/route');

beforeAll(async () => {
  featuredRoute = await import('../../app/api/marketplace/featured/route');
  trendingRoute = await import('../../app/api/marketplace/trending/route');
});

beforeEach(() => {
  jest.clearAllMocks();
  delete (globalThis as any).__pf_dispatch_called;
  mockFeaturedFindMany.mockReset();
  mockTrendingFindMany.mockReset();
  mockFeaturedFindMany.mockResolvedValue([]);
  mockTrendingFindMany.mockResolvedValue([]);
});

// ─── Request helpers ─────────────────────────────────────────────────────────

function makeFeaturedRequest(url: string): NextRequest {
  return new Request(`http://localhost${url.startsWith('/') ? url : '/' + url}`) as unknown as NextRequest;
}

function makeTrendingRequest(url: string): NextRequest {
  return new Request(`http://localhost${url.startsWith('/') ? url : '/' + url}`) as unknown as NextRequest;
}

// ─── Featured Tests ──────────────────────────────────────────────────────────

describe('API: Marketplace Featured', () => {
  beforeEach(() => {
    mockFeaturedFindMany.mockResolvedValue([]);
  });

  describe('GET /api/marketplace/featured', () => {
    it('returns 200 with default limit=10', async () => {
      mockFeaturedFindMany.mockResolvedValue([
        {
          id: 'p1',
          title: 'Featured Template',
          owner: { id: 'u1', username: 'creator', avatarUrl: null },
          marketplaceItem: { id: 'mi1', priceCredits: 50, license: 'personal', salesCount: 100, ratingAvg: 4.8 },
        },
      ]);
      const req = makeFeaturedRequest('/api/marketplace/featured');
      const res = await featuredRoute.GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveProperty('featured');
      expect(Array.isArray(json.data.featured)).toBe(true);
    });

    it('returns 200 with explicit limit', async () => {
      mockFeaturedFindMany.mockResolvedValue([]);
      const req = makeFeaturedRequest('/api/marketplace/featured?limit=5');
      const res = await featuredRoute.GET(req);
      expect(res.status).toBe(200);
    });

    it('returns 400 when limit exceeds maximum (20)', async () => {
      const req = makeFeaturedRequest('/api/marketplace/featured?limit=21');
      const res = await featuredRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('limit');
    });

    it('returns 400 when limit is less than 1', async () => {
      const req = makeFeaturedRequest('/api/marketplace/featured?limit=0');
      const res = await featuredRoute.GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when limit is not a number', async () => {
      const req = makeFeaturedRequest('/api/marketplace/featured?limit=abc');
      const res = await featuredRoute.GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 500 when findMany throws', async () => {
      mockFeaturedFindMany.mockRejectedValue(new Error('Database error'));
      const req = makeFeaturedRequest('/api/marketplace/featured');
      const res = await featuredRoute.GET(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toMatch(/featured/i);
    });

    it('returns empty array when no featured items', async () => {
      mockFeaturedFindMany.mockResolvedValue([]);
      const req = makeFeaturedRequest('/api/marketplace/featured');
      const res = await featuredRoute.GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.featured).toHaveLength(0);
    });
  });
});

// ─── Trending Tests ──────────────────────────────────────────────────────────

describe('API: Marketplace Trending', () => {
  beforeEach(() => {
    mockTrendingFindMany.mockResolvedValue([]);
  });

  describe('GET /api/marketplace/trending', () => {
    it('returns 200 with default limit=10', async () => {
      mockTrendingFindMany.mockResolvedValue([
        {
          id: 'p1',
          title: 'Trending Template',
          owner: { id: 'u1', username: 'creator', avatarUrl: null },
          marketplaceItem: { id: 'mi1', priceCredits: 30, license: 'commercial', salesCount: 50, ratingAvg: 4.2 },
        },
      ]);
      const req = makeTrendingRequest('/api/marketplace/trending');
      const res = await trendingRoute.GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveProperty('trending');
      expect(Array.isArray(json.data.trending)).toBe(true);
    });

    it('returns 200 with explicit limit', async () => {
      mockTrendingFindMany.mockResolvedValue([]);
      const req = makeTrendingRequest('/api/marketplace/trending?limit=20');
      const res = await trendingRoute.GET(req);
      expect(res.status).toBe(200);
    });

    it('returns 400 when limit exceeds maximum (50)', async () => {
      const req = makeTrendingRequest('/api/marketplace/trending?limit=51');
      const res = await trendingRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('limit');
    });

    it('returns 400 when limit is less than 1', async () => {
      const req = makeTrendingRequest('/api/marketplace/trending?limit=0');
      const res = await trendingRoute.GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when limit is not a number', async () => {
      const req = makeTrendingRequest('/api/marketplace/trending?limit=xyz');
      const res = await trendingRoute.GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 500 when findMany throws', async () => {
      mockTrendingFindMany.mockRejectedValue(new Error('Database error'));
      const req = makeTrendingRequest('/api/marketplace/trending');
      const res = await trendingRoute.GET(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });

    it('returns empty array when no trending items', async () => {
      mockTrendingFindMany.mockResolvedValue([]);
      const req = makeTrendingRequest('/api/marketplace/trending');
      const res = await trendingRoute.GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.trending).toHaveLength(0);
    });
  });
});
