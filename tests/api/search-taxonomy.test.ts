// API Tests: Search Taxonomy
// tests/api/search-taxonomy.test.ts
//
// Route-isolated unit tests with mocked prisma.
// Covers: GET /api/search/taxonomy

import { NextRequest } from 'next/server';

// ─── Mock prisma ─────────────────────────────────────────────────────────────

const mockCategoryFindMany = jest.fn();

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    category: {
      findMany: (...args: unknown[]) => mockCategoryFindMany(...args),
    },
  },
}));

let taxonomyRoute: typeof import('../../app/api/search/taxonomy/route');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// ─── Request helpers ─────────────────────────────────────────────────────────

function makeRequest(url: string): NextRequest {
  const absoluteUrl = url.startsWith('/') ? BASE_URL + url : url;
  return new Request(absoluteUrl, { method: 'GET' }) as unknown as NextRequest;
}

beforeAll(async () => {
  taxonomyRoute = await import('../../app/api/search/taxonomy/route');
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCategoryFindMany.mockResolvedValue([]);
});

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('API: Search Taxonomy — acceptance matrix', () => {
  // ─── 200: tree mode (no q param) ───────────────────────────────────────────

  describe('200 – tree mode (no q)', () => {
    it('returns 200 and category tree when q is absent', async () => {
      const mockCategories = [
        {
          id: 'cat1',
          name: 'Gaming',
          slug: 'gaming',
          children: [
            { id: 'cat2', name: 'Character Design', slug: 'character-design', children: [] },
          ],
        },
        { id: 'cat3', name: 'Art', slug: 'art', children: [] },
      ];
      mockCategoryFindMany.mockResolvedValue(mockCategories);

      const req = makeRequest('/api/search/taxonomy');
      const res = await taxonomyRoute.GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveProperty('categories');
      expect(Array.isArray(json.data.categories)).toBe(true);
    });

    it('passes correct tree-mode args to findMany (parentId=null, with children)', async () => {
      mockCategoryFindMany.mockResolvedValue([]);
      await taxonomyRoute.GET(makeRequest('/api/search/taxonomy'));
      // First call for tree root
      expect(mockCategoryFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { parentId: null },
          include: { children: expect.any(Object) },
        })
      );
    });
  });

  // ─── 200: search mode (with q param) ──────────────────────────────────────

  describe('200 – search mode (with q)', () => {
    it('returns 200 when q is provided', async () => {
      mockCategoryFindMany.mockResolvedValue([
        { id: 'cat1', name: 'Gaming', slug: 'gaming', parent: null },
      ]);
      const req = makeRequest('/api/search/taxonomy?q=gaming');
      const res = await taxonomyRoute.GET(req);
      expect(res.status).toBe(200);
    });

    it('trims query before passing to service', async () => {
      mockCategoryFindMany.mockResolvedValue([]);
      await taxonomyRoute.GET(makeRequest('/api/search/taxonomy?q=%20%20art%20%20'));
      expect(mockCategoryFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });

    it('returns matched categories with parent info', async () => {
      mockCategoryFindMany.mockResolvedValue([
        {
          id: 'cat1',
          name: 'Gaming',
          slug: 'gaming',
          parent: { id: 'root1', name: 'Digital', slug: 'digital' },
        },
      ]);
      const req = makeRequest('/api/search/taxonomy?q=gaming');
      const res = await taxonomyRoute.GET(req);
      const json = await res.json();
      expect(json.data.categories).toHaveLength(1);
      expect(json.data.categories[0]).toMatchObject({
        id: 'cat1',
        name: 'Gaming',
        slug: 'gaming',
        parent: { id: 'root1', name: 'Digital', slug: 'digital' },
      });
    });
  });

  // ─── 400: invalid input ─────────────────────────────────────────────────────

  describe('400 – invalid input', () => {
    it('returns 400 when q is an empty string', async () => {
      const req = makeRequest('/api/search/taxonomy?q=');
      const res = await taxonomyRoute.GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when q is only whitespace', async () => {
      const req = makeRequest('/api/search/taxonomy?q=%20%20');
      const res = await taxonomyRoute.GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when q exceeds 100 characters', async () => {
      const longQuery = 'a'.repeat(101);
      const req = makeRequest(`/api/search/taxonomy?q=${encodeURIComponent(longQuery)}`);
      const res = await taxonomyRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/100.*character|query.*long/i);
    });
  });

  // ─── 500: internal failure ─────────────────────────────────────────────────

  describe('500 – internal failure', () => {
    it('returns 500 when findMany throws an Error', async () => {
      mockCategoryFindMany.mockRejectedValue(new Error('Database connection lost'));
      const req = makeRequest('/api/search/taxonomy');
      const res = await taxonomyRoute.GET(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toMatch(/taxonomy search failed/i);
    });

    it('returns 500 when findMany throws a non-Error', async () => {
      mockCategoryFindMany.mockRejectedValue('string error not an Error');
      const req = makeRequest('/api/search/taxonomy');
      const res = await taxonomyRoute.GET(req);
      expect(res.status).toBe(500);
    });
  });

  // ─── Response shape ─────────────────────────────────────────────────────────

  describe('Response shape', () => {
    it('includes ok:true on success', async () => {
      mockCategoryFindMany.mockResolvedValue([]);
      const req = makeRequest('/api/search/taxonomy');
      const res = await taxonomyRoute.GET(req);
      const json = await res.json();
      expect(json).toHaveProperty('ok', true);
      expect(json).toHaveProperty('data');
      expect(json.data).toHaveProperty('categories');
    });

    it('includes ok:false and error string on 400', async () => {
      const req = makeRequest('/api/search/taxonomy?q=');
      const res = await taxonomyRoute.GET(req);
      const json = await res.json();
      expect(json).toHaveProperty('ok', false);
      expect(json).toHaveProperty('error');
      expect(typeof json.error).toBe('string');
    });
  });
});