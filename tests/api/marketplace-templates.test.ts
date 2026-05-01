// API Tests: Marketplace Templates Search
// tests/api/marketplace-templates.test.ts
//
// Route-isolated unit tests with mocked prisma.
// Covers: GET /api/marketplace/templates

import { NextRequest } from 'next/server';

// ─── Mock prisma ─────────────────────────────────────────────────────────────

const mockFindMany = jest.fn();
const mockCount = jest.fn();

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    prompt: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

let templatesRoute: typeof import('../../app/api/marketplace/templates/route');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// ─── Request helpers ─────────────────────────────────────────────────────────

function makeRequest(url: string): NextRequest {
  const absoluteUrl = url.startsWith('/') ? BASE_URL + url : url;
  return new Request(absoluteUrl, { method: 'GET' }) as unknown as NextRequest;
}

beforeAll(async () => {
  templatesRoute = await import('../../app/api/marketplace/templates/route');
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFindMany.mockResolvedValue([]);
  mockCount.mockResolvedValue(0);
});

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('API: Marketplace Templates — acceptance matrix', () => {
  // ─── 200: default ─────────────────────────────────────────────────────────

  describe('200 – default / valid queries', () => {
    it('returns 200 with default pagination', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'p1',
          title: 'Cyberpunk City',
          slug: 'cyberpunk-city',
          owner: { id: 'u1', username: 'neo', avatarUrl: null },
          marketplaceItem: { id: 'mi1', priceCredits: 50, license: 'personal', salesCount: 10, ratingAvg: 4.5 },
          promptTags: [],
        },
      ]);
      mockCount.mockResolvedValue(1);

      const req = makeRequest('/api/marketplace/templates');
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveProperty('templates');
      expect(json.data).toHaveProperty('total', 1);
      expect(json.data).toHaveProperty('limit', 20);
      expect(json.data).toHaveProperty('offset', 0);
    });

    it('returns 200 with explicit limit and offset', async () => {
      mockFindMany.mockResolvedValue([{ id: 'p2', title: 'Template B' }]);
      mockCount.mockResolvedValue(10);

      const req = makeRequest('/api/marketplace/templates?limit=5&offset=10');
      const res = await templatesRoute.GET(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.data.limit).toBe(5);
      expect(json.data.offset).toBe(10);
    });

    it('returns 200 with sortBy=recent', async () => {
      mockFindMany.mockResolvedValue([]);
      const req = makeRequest('/api/marketplace/templates?sortBy=recent');
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: expect.objectContaining({ createdAt: 'desc' }) })
      );
    });

    it('returns 200 with all filter params', async () => {
      mockFindMany.mockResolvedValue([]);
      const req = makeRequest('/api/marketplace/templates?q=cyber&category=gaming&sortBy=popular&minPrice=5&maxPrice=200');
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(200);
    });

    it('returns 200 with empty templates array when nothing matches', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
      const req = makeRequest('/api/marketplace/templates?q=nonexistent');
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.templates).toHaveLength(0);
      expect(json.data.total).toBe(0);
    });
  });

  // ─── 400: invalid pagination ──────────────────────────────────────────────

  describe('400 – invalid pagination', () => {
    it('returns 400 when limit exceeds maximum', async () => {
      const req = makeRequest('/api/marketplace/templates?limit=101');
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('limit');
    });

    it('returns 400 when offset is negative', async () => {
      const req = makeRequest('/api/marketplace/templates?offset=-1');
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when both limit and offset are invalid', async () => {
      const req = makeRequest('/api/marketplace/templates?limit=-1&offset=-999');
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when limit is not a number', async () => {
      const req = makeRequest('/api/marketplace/templates?limit=abc');
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(400);
    });
  });

  // ─── 400: invalid search/filter params ─────────────────────────────────────

  describe('400 – invalid search/filter params', () => {
    it('returns 400 when q is empty string', async () => {
      const req = makeRequest('/api/marketplace/templates?q=');
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('q');
    });

    it('returns 400 when q exceeds 200 characters', async () => {
      const longQuery = 'a'.repeat(201);
      const req = makeRequest(`/api/marketplace/templates?q=${encodeURIComponent(longQuery)}`);
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when category is empty string', async () => {
      const req = makeRequest('/api/marketplace/templates?category=');
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when category exceeds 64 characters', async () => {
      const longCat = 'a'.repeat(65);
      const req = makeRequest(`/api/marketplace/templates?category=${encodeURIComponent(longCat)}`);
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when sortBy is invalid', async () => {
      const req = makeRequest('/api/marketplace/templates?sortBy=invalid-sort');
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/sortBy/i);
    });

    it('returns 400 when minPrice is negative', async () => {
      const req = makeRequest('/api/marketplace/templates?minPrice=-5');
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when maxPrice is negative', async () => {
      const req = makeRequest('/api/marketplace/templates?maxPrice=-1');
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when maxPrice < minPrice', async () => {
      const req = makeRequest('/api/marketplace/templates?minPrice=100&maxPrice=50');
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/maxPrice.*minPrice/i);
    });

    it('returns 400 when minPrice is not a number', async () => {
      const req = makeRequest('/api/marketplace/templates?minPrice=abc');
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(400);
    });
  });

  // ─── 500: internal failure ─────────────────────────────────────────────────

  describe('500 – internal failure', () => {
    it('returns 500 when findMany throws', async () => {
      mockFindMany.mockRejectedValue(new Error('Database connection lost'));
      const req = makeRequest('/api/marketplace/templates');
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toMatch(/marketplace/i);
    });

    it('returns 500 when count throws', async () => {
      mockFindMany.mockResolvedValue([{ id: 'p1' }]);
      mockCount.mockRejectedValue(new Error('Database error'));
      const req = makeRequest('/api/marketplace/templates');
      const res = await templatesRoute.GET(req);
      expect(res.status).toBe(500);
    });
  });

  // ─── Response shape ─────────────────────────────────────────────────────────

  describe('Response shape', () => {
    it('includes ok:true on success', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
      const req = makeRequest('/api/marketplace/templates');
      const res = await templatesRoute.GET(req);
      const json = await res.json();
      expect(json).toHaveProperty('ok', true);
      expect(json).toHaveProperty('data');
      expect(json.data).toHaveProperty('templates');
      expect(json.data).toHaveProperty('total');
    });

    it('includes ok:false and error string on 400', async () => {
      const req = makeRequest('/api/marketplace/templates?limit=abc');
      const res = await templatesRoute.GET(req);
      const json = await res.json();
      expect(json).toHaveProperty('ok', false);
      expect(json).toHaveProperty('error');
    });
  });
});