/** @jest-environment node */

import { NextRequest } from 'next/server';

const mockPromptFindUnique = jest.fn();
const mockCategoryFindMany = jest.fn();
const mockOrderFindFirst = jest.fn();
const mockReviewCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    prompt: { findUnique: (...args: unknown[]) => mockPromptFindUnique(...args) },
    category: { findMany: (...args: unknown[]) => mockCategoryFindMany(...args) },
    order: { findFirst: (...args: unknown[]) => mockOrderFindFirst(...args) },
    review: { create: (...args: unknown[]) => mockReviewCreate(...args) },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn((t: string) => (t === 'valid' ? { userId: 'u1' } : null)),
}));

let detailRoute: typeof import('../../app/api/marketplace/templates/[slug]/route');
let taxonomyRoute: typeof import('../../app/api/marketplace/taxonomy/route');
let rateRoute: typeof import('../../app/api/marketplace/templates/[slug]/rate/route');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const req = (url: string, init?: RequestInit) => new Request(url.startsWith('/') ? BASE_URL + url : url, init) as unknown as NextRequest;

beforeAll(async () => {
  [detailRoute, taxonomyRoute, rateRoute] = await Promise.all([
    import('../../app/api/marketplace/templates/[slug]/route'),
    import('../../app/api/marketplace/taxonomy/route'),
    import('../../app/api/marketplace/templates/[slug]/rate/route'),
  ]);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCategoryFindMany.mockResolvedValue([]);
});

describe('marketplace detail/taxonomy/rate', () => {
  it('GET /api/marketplace/templates/:slug returns 404 when missing', async () => {
    mockPromptFindUnique.mockResolvedValue(null);
    const res = await detailRoute.GET(req('/api/marketplace/templates/nope'), { params: { slug: 'nope' } } as any);
    expect(res.status).toBe(404);
  });

  it('GET /api/marketplace/templates/:slug returns 200 when exists', async () => {
    mockPromptFindUnique.mockResolvedValue({ id: 'p1', slug: 's1', marketplaceItem: { id: 'mi1' }, owner: {}, promptTags: [], reviews: [] });
    const res = await detailRoute.GET(req('/api/marketplace/templates/s1'), { params: { slug: 's1' } } as any);
    expect(res.status).toBe(200);
  });

  it('GET /api/marketplace/taxonomy validates limit', async () => {
    const bad = await taxonomyRoute.GET(req('/api/marketplace/taxonomy?limit=0'));
    expect(bad.status).toBe(400);
    const okRes = await taxonomyRoute.GET(req('/api/marketplace/taxonomy?limit=5'));
    expect(okRes.status).toBe(200);
  });

  it('POST /api/marketplace/templates/:slug/rate requires purchase', async () => {
    mockPromptFindUnique.mockResolvedValue({ id: 'p1', slug: 's1', marketplaceItem: { id: 'mi1' } });
    mockOrderFindFirst.mockResolvedValue(null);
    const res = await rateRoute.POST(
      req('/api/marketplace/templates/s1/rate', {
        method: 'POST',
        headers: { authorization: 'Bearer valid', 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 5, content: 'good' }),
      }),
      { params: { slug: 's1' } } as any,
    );
    expect(res.status).toBe(403);
  });

  it('POST /api/marketplace/templates/:slug/rate creates review for purchaser', async () => {
    mockPromptFindUnique.mockResolvedValue({ id: 'p1', slug: 's1', marketplaceItem: { id: 'mi1' } });
    mockOrderFindFirst.mockResolvedValue({ id: 'o1' });
    mockReviewCreate.mockResolvedValue({ id: 'r1', rating: 5 });
    const res = await rateRoute.POST(
      req('/api/marketplace/templates/s1/rate', {
        method: 'POST',
        headers: { authorization: 'Bearer valid', 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 5, content: 'great template' }),
      }),
      { params: { slug: 's1' } } as any,
    );
    expect(res.status).toBe(201);
  });
});
