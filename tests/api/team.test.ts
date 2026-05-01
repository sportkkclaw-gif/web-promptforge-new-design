// API Tests: Team invite — route-isolated (no live server dependency)
// Uses direct route handler invocation with mocked prisma.

import { NextRequest } from 'next/server';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    workspaceMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../../lib/audit', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
  getClientIp: jest.fn().mockReturnValue(null),
}));

import { POST } from '../../app/api/team/invite/route';

function makeMockRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  };
  return new Request('http://localhost/api/team/invite', init) as unknown as NextRequest;
}

describe('API: Team', () => {
  const prisma = jest.requireMock('../../lib/prisma').default;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/team/invite', () => {
    it('should reject empty body (missing email and workspaceId)', async () => {
      const req = makeMockRequest({});
      const res = await POST(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      // Returns 422 for Zod validation failure (missing required fields)
      expect(res.status).toBe(422);
    });

    it('should reject missing workspaceId (Zod validation failure)', async () => {
      const req = makeMockRequest({ email: 'test@example.com' });
      const res = await POST(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(422);
    });

    it('should reject invalid email format', async () => {
      const req = makeMockRequest({ email: 'not-an-email', workspaceId: 'ws1' });
      const res = await POST(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(422);
    });

    it('should return 404 when invitee user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const req = makeMockRequest({ email: 'unknown@example.com', workspaceId: 'ws1' });
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(404);
      expect(json.ok).toBe(false);
      expect(json.error).toContain('not found');
    });

    it('should return 409 when user is already a member', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'uid1', email: 'test@example.com', username: 'testuser' });
      prisma.workspaceMember.findUnique.mockResolvedValue({ workspaceId: 'ws1', userId: 'uid1', role: 'member' });
      const req = makeMockRequest({ email: 'test@example.com', workspaceId: 'ws1' });
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(409);
      expect(json.ok).toBe(false);
    });

    it('should create workspace member successfully', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'uid1', email: 'test@example.com', username: 'testuser' });
      prisma.workspaceMember.findUnique.mockResolvedValue(null); // not a member yet
      prisma.workspaceMember.create.mockResolvedValue({
        id: 'wm1',
        workspaceId: 'ws1',
        userId: 'uid1',
        role: 'member',
        createdAt: new Date(),
      });
      const req = makeMockRequest({ email: 'test@example.com', workspaceId: 'ws1' });
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.ok).toBe(true);
      expect(json.data.member).toBeDefined();
    });
  });
});
