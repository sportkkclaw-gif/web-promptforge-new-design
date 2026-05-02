// API Tests: Admin Moderation — route-isolated (no live server dependency)
// Uses direct route handler invocation with mocked prisma and admin auth.

import { NextRequest } from 'next/server';

const mockAdminUser = { id: 'admin1', email: 'admin@test.com', username: 'admin', role: 'admin' as const };

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    moderationEvent: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    prompt: {
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('../../lib/audit', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
  getClientIp: jest.fn().mockReturnValue(null),
}));

jest.mock('../../lib/auth-admin', () => ({
  requireAdmin: jest.fn().mockImplementation(async () => mockAdminUser),
}));

import { GET, POST } from '../../app/api/admin/moderation/[id]/route';

function makeMockRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request(url, init) as unknown as NextRequest;
}

// Use a valid 25-char CUID: c123456789012345678901234
const VALID_CUID = 'c123456789012345678901234';

describe('API: Admin Moderation', () => {
  const prisma = jest.requireMock('../../lib/prisma').default;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/admin/moderation/:id', () => {
    it('should return 400 for invalid decision (not approved/rejected)', async () => {
      // Valid CUID + invalid decision value → Zod validation fails → 400
      const req = makeMockRequest('POST', `http://localhost/api/admin/moderation/${VALID_CUID}`, { decision: 'invalid' });
      const res = await POST(req, { params: { id: VALID_CUID } } as any);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
    });

    it('should return 400 for missing decision field', async () => {
      const req = makeMockRequest('POST', `http://localhost/api/admin/moderation/${VALID_CUID}`, {});
      const res = await POST(req, { params: { id: VALID_CUID } } as any);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
    });

    it('should return 404 when moderation event not found', async () => {
      prisma.moderationEvent.findUnique.mockResolvedValue(null);
      const req = makeMockRequest('POST', `http://localhost/api/admin/moderation/${VALID_CUID}`, { decision: 'approved' });
      const res = await POST(req, { params: { id: VALID_CUID } } as any);
      expect(res.status).toBe(404);
    });

    it('should return 200 when decision is approved and event exists', async () => {
      const mockEvent = {
        id: VALID_CUID,
        targetType: 'prompt',
        targetId: 'p1',
        status: 'pending',
        reason: 'Test reason',
        moderatorId: null,
        createdAt: new Date(),
      };
      prisma.moderationEvent.findUnique.mockResolvedValue(mockEvent);
      prisma.moderationEvent.update.mockResolvedValue({ ...mockEvent, status: 'approved', moderatorId: mockAdminUser.id });
      const req = makeMockRequest('POST', `http://localhost/api/admin/moderation/${VALID_CUID}`, { decision: 'approved' });
      const res = await POST(req, { params: { id: VALID_CUID } } as any);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.event.status).toBe('approved');
    });

    it('should return 200 when decision is rejected', async () => {
      const mockEvent = {
        id: VALID_CUID,
        targetType: 'prompt',
        targetId: 'p1',
        status: 'pending',
        reason: 'Violates guidelines',
        moderatorId: null,
        createdAt: new Date(),
      };
      prisma.moderationEvent.findUnique.mockResolvedValue(mockEvent);
      prisma.moderationEvent.update.mockResolvedValue({ ...mockEvent, status: 'rejected', moderatorId: mockAdminUser.id });
      prisma.prompt.updateMany.mockResolvedValue({ count: 1 });
      const req = makeMockRequest('POST', `http://localhost/api/admin/moderation/${VALID_CUID}`, { decision: 'rejected', reason: 'Violates guidelines' });
      const res = await POST(req, { params: { id: VALID_CUID } } as any);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
    });
  });

  describe('GET /api/admin/moderation/:id', () => {
    it('should return 400 for invalid CUID format', async () => {
      const req = makeMockRequest('GET', 'http://localhost/api/admin/moderation/invalid_id');
      const res = await GET(req, { params: { id: 'invalid_id' } } as any);
      expect(res.status).toBe(400);
    });

    it('should return 404 when event not found', async () => {
      prisma.moderationEvent.findUnique.mockResolvedValue(null);
      const req = makeMockRequest('GET', `http://localhost/api/admin/moderation/${VALID_CUID}`);
      const res = await GET(req, { params: { id: VALID_CUID } } as any);
      expect(res.status).toBe(404);
    });

    it('should return event data for valid id', async () => {
      const mockEvent = {
        id: VALID_CUID,
        targetType: 'prompt',
        targetId: 'p1',
        status: 'pending',
        reason: 'Test',
        createdAt: new Date(),
      };
      prisma.moderationEvent.findUnique.mockResolvedValue(mockEvent);
      const req = makeMockRequest('GET', `http://localhost/api/admin/moderation/${VALID_CUID}`);
      const res = await GET(req, { params: { id: VALID_CUID } } as any);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.event.id).toBe(VALID_CUID);
    });
  });
});
