// API Tests: Reviews — route-isolated (no live server dependency)
// Uses direct route handler invocation with mocked contexts.

import { NextRequest } from 'next/server';

// Mock the route module to avoid live fetch calls
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    review: {
      create: jest.fn().mockResolvedValue({ id: 'rev_test_123', userId: 'uid1', promptId: 'cld123456789012345678901234', rating: 5, content: 'Great!', createdAt: new Date() }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    prompt: { update: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock('../../lib/audit', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
  getClientIp: jest.fn().mockReturnValue(null),
}));

// Inline mock for getSession — real implementation uses Map in lib/auth
jest.mock('../../lib/auth', () => ({
  getSession: jest.fn(),
}));

import { POST, GET } from '../../app/api/reviews/route';

function makeMockRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  };
  return new Request('http://localhost/api/reviews', init) as unknown as NextRequest;
}

function makeMockGetRequest(url: string): NextRequest {
  return new Request(url) as unknown as NextRequest;
}

describe('API: Reviews', () => {
  const { getSession } = jest.requireMock('../../lib/auth') as any;
  const prisma = jest.requireMock('../../lib/prisma').default;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/reviews', () => {
    it('should reject unauthenticated requests (no token)', async () => {
      getSession.mockReturnValue(null);
      const req = makeMockRequest({ promptId: 'cld123456789012345678901234', rating: 5, content: 'Great!' }, {});
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(401);
      expect(json.ok).toBe(false);
    });

    it('should reject invalid session token', async () => {
      getSession.mockReturnValue(null);
      const req = makeMockRequest(
        { promptId: 'cld123456789012345678901234', rating: 5, content: 'Great!' },
        { authorization: 'Bearer invalid_token' }
      );
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(401);
      expect(json.ok).toBe(false);
    });

    it('should require promptId — missing promptId returns 400', async () => {
      getSession.mockReturnValue({ userId: 'uid1', expiresAt: new Date(Date.now() + 60000) });
      const req = makeMockRequest(
        { rating: 5, content: 'Great!' },
        { authorization: 'Bearer valid_token' }
      );
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error).toBeTruthy(); // Zod validation error present
    });

    it('should require rating — missing rating returns 400', async () => {
      getSession.mockReturnValue({ userId: 'uid1', expiresAt: new Date(Date.now() + 60000) });
      const req = makeMockRequest(
        { promptId: 'cld123456789012345678901234', content: 'Great!' },
        { authorization: 'Bearer valid_token' }
      );
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error).toBeTruthy();
    });

    it('should reject rating outside 1–5 range (0)', async () => {
      getSession.mockReturnValue({ userId: 'uid1', expiresAt: new Date(Date.now() + 60000) });
      const req = makeMockRequest(
        { promptId: 'cld123456789012345678901234', rating: 0, content: 'Bad rating' },
        { authorization: 'Bearer valid_token' }
      );
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error).toBeTruthy(); // Zod error: "Number must be >= 1"
    });

    it('should reject rating outside 1–5 range (6)', async () => {
      getSession.mockReturnValue({ userId: 'uid1', expiresAt: new Date(Date.now() + 60000) });
      const req = makeMockRequest(
        { promptId: 'cld123456789012345678901234', rating: 6, content: 'Out of range' },
        { authorization: 'Bearer valid_token' }
      );
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error).toContain('rating');
    });

    it('should require content — missing content returns 400', async () => {
      getSession.mockReturnValue({ userId: 'uid1', expiresAt: new Date(Date.now() + 60000) });
      const req = makeMockRequest(
        { promptId: 'cld123456789012345678901234', rating: 5 },
        { authorization: 'Bearer valid_token' }
      );
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error).toBeTruthy(); // Zod validation error
    });

    it('should create review successfully with valid data', async () => {
      getSession.mockReturnValue({ userId: 'uid1', expiresAt: new Date(Date.now() + 60000) });
      prisma.review.create.mockResolvedValueOnce({
        id: 'rev_created_123',
        userId: 'uid1',
        promptId: 'cld123456789012345678901234',
        rating: 5,
        content: 'Excellent!',
        createdAt: new Date(),
      });
      const req = makeMockRequest(
        { promptId: 'cld123456789012345678901234', rating: 5, content: 'Excellent!' },
        { authorization: 'Bearer valid_token' }
      );
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.ok).toBe(true);
      expect(json.data.review).toBeDefined();
    });
  });

  describe('GET /api/reviews', () => {
    it('should require promptId query param', async () => {
      const req = makeMockGetRequest('http://localhost/api/reviews');
      const res = await GET(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error).toContain('promptId');
    });

    it('should return reviews for valid promptId', async () => {
      const mockReviews = [
        { id: 'rev1', rating: 5, content: 'Great', user: { username: 'alice', avatarUrl: null } },
      ];
      prisma.review.findMany.mockResolvedValueOnce(mockReviews);
      const req = makeMockGetRequest('http://localhost/api/reviews?promptId=cld123456789012345678901234');
      const res = await GET(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.reviews).toEqual(mockReviews);
    });
  });
});