// API Tests: Marketplace Creators
// tests/api/marketplace-creators.test.ts
//
// Route-isolated unit tests with mocked prisma.
// Covers: GET /api/marketplace/creators/:userId

import { NextRequest } from 'next/server';

// ─── Mock prisma ─────────────────────────────────────────────────────────────

const mockUserFindUnique = jest.fn();
const mockPromptFindMany = jest.fn();

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    prompt: {
      findMany: (...args: unknown[]) => mockPromptFindMany(...args),
    },
  },
}));

let creatorsRoute: typeof import('../../app/api/marketplace/creators/[userId]/route');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// ─── Request helpers ─────────────────────────────────────────────────────────

function makeRequest(url: string): NextRequest {
  const absoluteUrl = url.startsWith('/') ? BASE_URL + url : url;
  return new Request(absoluteUrl, { method: 'GET' }) as unknown as NextRequest;
}

beforeAll(async () => {
  creatorsRoute = await import('../../app/api/marketplace/creators/[userId]/route');
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUserFindUnique.mockReset();
  mockPromptFindMany.mockReset();
});

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('API: Marketplace Creators — acceptance matrix', () => {
  describe('GET /api/marketplace/creators/:userId', () => {
    it('returns 200 with creator profile and templates', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user_123',
        username: 'neon_creator',
        avatarUrl: 'https://example.com/avatar.png',
        createdAt: new Date('2024-01-01'),
        marketplaceItems: [
          { id: 'mi1', priceCredits: 50, license: 'personal', salesCount: 10, ratingAvg: 4.5 },
          { id: 'mi2', priceCredits: 75, license: 'commercial', salesCount: 5, ratingAvg: 4.0 },
        ],
      });
      mockPromptFindMany.mockResolvedValue([
        {
          id: 'p1',
          title: 'Cyberpunk City',
          slug: 'cyberpunk-city',
          viewCount: 1337,
          marketplaceItem: { id: 'mi1', priceCredits: 50, license: 'personal', salesCount: 10, ratingAvg: 4.5 },
          promptTags: [{ tag: { name: 'Gaming', slug: 'gaming' } }],
        },
      ]);

      const req = makeRequest('/api/marketplace/creators/user_123');
      const res = await creatorsRoute.GET(req, { params: Promise.resolve({ userId: 'user_123' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveProperty('creator');
      expect(json.data.creator).toMatchObject({
        id: 'user_123',
        username: 'neon_creator',
        totalSales: 15,
        templateCount: 1,
      });
      expect(json.data).toHaveProperty('templates');
      expect(Array.isArray(json.data.templates)).toBe(true);
    });

    it('returns 404 when creator does not exist', async () => {
      mockUserFindUnique.mockResolvedValue(null);
      const req = makeRequest('/api/marketplace/creators/nonexistent_user');
      const res = await creatorsRoute.GET(req, { params: Promise.resolve({ userId: 'nonexistent_user' }) });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toMatch(/not found|creator/i);
    });

    it('returns 400 when userId is empty string', async () => {
      const req = makeRequest('/api/marketplace/creators/');
      const res = await creatorsRoute.GET(req, { params: Promise.resolve({ userId: '' }) });
      expect(res.status).toBe(400);
    });

    it('returns 500 when user lookup throws', async () => {
      mockUserFindUnique.mockRejectedValue(new Error('Database error'));
      const req = makeRequest('/api/marketplace/creators/user_123');
      const res = await creatorsRoute.GET(req, { params: Promise.resolve({ userId: 'user_123' }) });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });

    it('returns 500 when prompt findMany throws', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user_123',
        username: 'neo',
        avatarUrl: null,
        createdAt: new Date(),
        marketplaceItems: [],
      });
      mockPromptFindMany.mockRejectedValue(new Error('Database error'));
      const req = makeRequest('/api/marketplace/creators/user_123');
      const res = await creatorsRoute.GET(req, { params: Promise.resolve({ userId: 'user_123' }) });
      expect(res.status).toBe(500);
    });

    it('calculates totalSales from marketplaceItems', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user_123',
        username: 'creator',
        avatarUrl: null,
        createdAt: new Date(),
        marketplaceItems: [
          { id: 'mi1', priceCredits: 50, license: 'personal', salesCount: 100, ratingAvg: 4.5 },
          { id: 'mi2', priceCredits: 75, license: 'personal', salesCount: 50, ratingAvg: 4.0 },
          { id: 'mi3', priceCredits: 100, license: 'personal', salesCount: 25, ratingAvg: 4.8 },
        ],
      });
      mockPromptFindMany.mockResolvedValue([]);
      const req = makeRequest('/api/marketplace/creators/user_123');
      const res = await creatorsRoute.GET(req, { params: Promise.resolve({ userId: 'user_123' }) });
      const json = await res.json();
      expect(json.data.creator.totalSales).toBe(175);
    });

    it('returns templates with nested promptTags', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user_123',
        username: 'creator',
        avatarUrl: null,
        createdAt: new Date(),
        marketplaceItems: [],
      });
      mockPromptFindMany.mockResolvedValue([
        {
          id: 'p1',
          title: 'Fantasy Art',
          slug: 'fantasy-art',
          viewCount: 500,
          marketplaceItem: { id: 'mi1', priceCredits: 60, license: 'personal', salesCount: 20, ratingAvg: 4.3 },
          promptTags: [
            { tag: { name: 'Fantasy', slug: 'fantasy' } },
            { tag: { name: 'Art', slug: 'art' } },
          ],
        },
      ]);
      const req = makeRequest('/api/marketplace/creators/user_123');
      const res = await creatorsRoute.GET(req, { params: Promise.resolve({ userId: 'user_123' }) });
      const json = await res.json();
      expect(json.data.templates).toHaveLength(1);
      expect(json.data.templates[0].promptTags).toHaveLength(2);
    });

    it('returns empty templates array when creator has no marketplace templates', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user_456',
        username: 'new_creator',
        avatarUrl: null,
        createdAt: new Date(),
        marketplaceItems: [],
      });
      mockPromptFindMany.mockResolvedValue([]);
      const req = makeRequest('/api/marketplace/creators/user_456');
      const res = await creatorsRoute.GET(req, { params: Promise.resolve({ userId: 'user_456' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.templates).toHaveLength(0);
      expect(json.data.creator.templateCount).toBe(0);
    });

    it('includes correct content-type header', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user_123',
        username: 'creator',
        avatarUrl: null,
        createdAt: new Date(),
        marketplaceItems: [],
      });
      mockPromptFindMany.mockResolvedValue([]);
      const req = makeRequest('/api/marketplace/creators/user_123');
      const res = await creatorsRoute.GET(req, { params: Promise.resolve({ userId: 'user_123' }) });
      expect(res.headers.get('content-type')).toMatch(/application\/json/);
    });
  });
});