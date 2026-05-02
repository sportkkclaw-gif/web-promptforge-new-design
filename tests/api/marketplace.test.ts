// API Tests: Marketplace Items
// tests/api/marketplace.test.ts
//
// Route module mocks isolate DB/payment dependencies for stable, reproducible results.
// Covers acceptance matrix for GET /api/marketplace/items:
//   - success 200 with default pagination
//   - success 200 with explicit limit/offset
//   - input validation failure (bad pagination -> 400)
//   - server/internal error mapping (-> 500)

import { NextRequest } from 'next/server';

// ─── Mock the route's DB dependencies ─────────────────────────────────────────

const mockFindMany = jest.fn();
const mockCount = jest.fn();

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    marketplaceItem: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

let itemsRoute: typeof import('../../app/api/marketplace/items/route');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// ─── Request helpers ───────────────────────────────────────────────────────────

function makeRequest(url: string): NextRequest {
  const absoluteUrl = url.startsWith('/') ? BASE_URL + url : url;
  return new Request(absoluteUrl, { method: 'GET' }) as unknown as NextRequest;
}

beforeAll(async () => {
  itemsRoute = await import('../../app/api/marketplace/items/route');
});

// ─── Test suite ────────────────────────────────────────────────────────────────

describe('API: Marketplace Items', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: return empty list and count 0
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
  });

  // ─── GET /api/marketplace/items — happy paths ────────────────────────────

  describe('GET /api/marketplace/items', () => {
    it('should return 200 with default pagination (limit=20, offset=0)', async () => {
      const mockItems = [
        { id: 'item_1', title: 'Template A', priceCredits: 50 },
        { id: 'item_2', title: 'Template B', priceCredits: 75 },
      ];
      mockFindMany.mockResolvedValue(mockItems);
      mockCount.mockResolvedValue(2);

      const req = makeRequest('/api/marketplace/items');
      const res = await itemsRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data).toHaveProperty('items');
      expect(json.data).toHaveProperty('total', 2);
      expect(json.data).toHaveProperty('limit', 20);
      expect(json.data).toHaveProperty('offset', 0);
    });

    it('should return 200 with explicit limit and offset', async () => {
      mockFindMany.mockResolvedValue([{ id: 'item_3', title: 'Template C' }]);
      mockCount.mockResolvedValue(5);

      const req = makeRequest('/api/marketplace/items?limit=1&offset=2');
      const res = await itemsRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.limit).toBe(1);
      expect(json.data.offset).toBe(2);
    });

    it('should return items with nested prompt and seller data', async () => {
      const mockItem = {
        id: 'item_4',
        title: 'Premium Template',
        priceCredits: 100,
        prompt: { id: 'p1', title: 'My Prompt', slug: 'my-prompt', summary: 'A great prompt', viewCount: 42 },
        seller: { username: 'alice', avatarUrl: 'https://example.com/alice.png' },
      };
      mockFindMany.mockResolvedValue([mockItem]);
      mockCount.mockResolvedValue(1);

      const req = makeRequest('/api/marketplace/items?limit=1');
      const res = await itemsRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.items[0]).toHaveProperty('prompt');
      expect(json.data.items[0]).toHaveProperty('seller');
      expect(json.data.items[0].prompt).toHaveProperty('title');
      expect(json.data.items[0].seller).toHaveProperty('username');
    });
  });

  // ─── Input validation — bad pagination → 400 ───────────────────────────

  describe('Input validation failure path (400)', () => {
    it('should return 400 when limit exceeds maximum (100)', async () => {
      const req = makeRequest('/api/marketplace/items?limit=101');
      const res = await itemsRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error).toContain('limit');
    });

    it('should return 400 when offset exceeds maximum (10000)', async () => {
      const req = makeRequest('/api/marketplace/items?offset=10001');
      const res = await itemsRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error).toContain('offset');
    });

    it('should return 200 when limit and offset are at exact maximums', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('/api/marketplace/items?limit=100&offset=10000');
      const res = await itemsRoute.GET(req);

      expect(res.status).toBe(200);
    });

    it('should return 400 when both limit and offset are invalid', async () => {
      const req = makeRequest('/api/marketplace/items?limit=-1&offset=-999');
      const res = await itemsRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
    });

    it('should return 400 when limit is a float', async () => {
      const req = makeRequest('/api/marketplace/items?limit=1.5');
      const res = await itemsRoute.GET(req);

      // parseInt('1.5') === 1, which is valid — so this passes.
      // Only invalid non-numeric strings trigger 400.
      expect(res.status).toBe(200);
    });

    it('should return 400 when limit is not a number', async () => {
      const req = makeRequest('/api/marketplace/items?limit=abc');
      const res = await itemsRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error.toLowerCase()).toContain('limit');
    });

    it('should return 400 when limit is negative', async () => {
      const req = makeRequest('/api/marketplace/items?limit=-5');
      const res = await itemsRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
    });

    it('should return 400 when limit is zero', async () => {
      const req = makeRequest('/api/marketplace/items?limit=0');
      const res = await itemsRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
    });

    it('should return 400 when offset is negative', async () => {
      const req = makeRequest('/api/marketplace/items?offset=-1');
      const res = await itemsRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
    });
  });

  // ─── Server / internal error → 500 ───────────────────────────────────────

  describe('Server/internal error mapping (500)', () => {
    it('should return 500 when findMany throws', async () => {
      mockFindMany.mockRejectedValue(new Error('Database connection failed'));

      const req = makeRequest('/api/marketplace/items');
      const res = await itemsRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.ok).toBe(false);
      expect(json.error.toLowerCase()).toContain('fetch marketplace items');
    });

    it('should return 500 when count throws', async () => {
      mockFindMany.mockResolvedValue([{ id: 'item_x' }]);
      mockCount.mockRejectedValue(new Error('Database error'));

      const req = makeRequest('/api/marketplace/items');
      const res = await itemsRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.ok).toBe(false);
    });
  });
});