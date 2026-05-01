// API Tests: Team quota route — route-isolated with mocked prisma
// Tests PATCH and GET /api/teams/:slug/quota including per-member allocation persistence

/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { createSession, deleteSession } from '../../lib/auth';

const mockPrismaWorkspaceFindUnique = jest.fn();
const mockPrismaWorkspaceMemberFindUnique = jest.fn();
const mockPrismaWorkspaceMemberUpdate = jest.fn();
const mockPrismaCreditsLedgerAggregate = jest.fn();
const mockPrismaSubscriptionFindFirst = jest.fn();
const mockPrismaTransaction = jest.fn();
const mockWriteAuditLog = jest.fn();

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: (...args: unknown[]) => mockPrismaTransaction(...args),
    workspace: {
      findUnique: (...args: unknown[]) => mockPrismaWorkspaceFindUnique(...args),
    },
    workspaceMember: {
      findUnique: (...args: unknown[]) => mockPrismaWorkspaceMemberFindUnique(...args),
      update: (...args: unknown[]) => mockPrismaWorkspaceMemberUpdate(...args),
    },
    creditsLedger: {
      aggregate: (...args: unknown[]) => mockPrismaCreditsLedgerAggregate(...args),
    },
    subscription: {
      findFirst: (...args: unknown[]) => mockPrismaSubscriptionFindFirst(...args),
    },
  },
}));

jest.mock('@/lib/audit', () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
  getClientIp: jest.fn().mockReturnValue(null),
}));

const prismaMock = {
  workspace: {
    findUnique: (...args: unknown[]) => mockPrismaWorkspaceFindUnique(...args),
  },
  workspaceMember: {
    findUnique: (...args: unknown[]) => mockPrismaWorkspaceMemberFindUnique(...args),
    update: (...args: unknown[]) => mockPrismaWorkspaceMemberUpdate(...args),
  },
  creditsLedger: {
    aggregate: (...args: unknown[]) => mockPrismaCreditsLedgerAggregate(...args),
  },
  subscription: {
    findFirst: (...args: unknown[]) => mockPrismaSubscriptionFindFirst(...args),
  },
};

let quotaRoute: typeof import('../../app/api/teams/[slug]/quota/route');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function makeRequest(
  method: string,
  url: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  }
  const absoluteUrl = url.startsWith('/') ? BASE_URL + url : url;
  return new Request(absoluteUrl, init) as unknown as NextRequest;
}

function makeAuthorizedRequest(
  method: string,
  url: string,
  token: string,
  body?: unknown
) {
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  return makeRequest(method, url, body, headers);
}

describe('API: /api/teams/:slug/quota', () => {
  let ownerToken: string;
  let adminToken: string;
  let memberToken: string;
  let ownerUserId: string;
  let adminUserId: string;
  let memberUserId: string;

  const mockWorkspace = {
    id: 'ws1',
    slug: 'test-team',
    name: 'Test Team',
    plan: { code: 'TEAM', creditQuota: 1000, maxSeats: 5 },
    members: [
      { userId: 'uid-owner', role: 'owner', allocatedCredits: 0, user: { id: 'uid-owner', username: 'owner', email: 'owner@test.com', avatarUrl: null as string | null } },
      { userId: 'uid-admin', role: 'admin', allocatedCredits: 0, user: { id: 'uid-admin', username: 'admin', email: 'admin@test.com', avatarUrl: null as string | null } },
      { userId: 'uid-member', role: 'member', allocatedCredits: 0, user: { id: 'uid-member', username: 'member', email: 'member@test.com', avatarUrl: null as string | null } },
      { userId: 'uid-other', role: 'member', allocatedCredits: 0, user: { id: 'uid-other', username: 'other', email: 'other@test.com', avatarUrl: null as string | null } },
    ],
  };

  beforeAll(async () => {
    ownerUserId = 'quota-owner-user';
    adminUserId = 'quota-admin-user';
    memberUserId = 'quota-member-user';

    const ownerResult = createSession(ownerUserId);
    ownerToken = ownerResult.token;

    const adminResult = createSession(adminUserId);
    adminToken = adminResult.token;

    const memberResult = createSession(memberUserId);
    memberToken = memberResult.token;

    quotaRoute = await import('../../app/api/teams/[slug]/quota/route');
  });

  afterAll(() => {
    deleteSession(ownerToken);
    deleteSession(adminToken);
    deleteSession(memberToken);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    mockPrismaTransaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return arg(prismaMock);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return arg;
    });
    mockWriteAuditLog.mockResolvedValue(undefined);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/teams/:slug/quota
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET', () => {
    it('should return 401 if no token provided', async () => {
      const req = makeRequest('GET', '/api/teams/test-team/quota');
      const res = await quotaRoute.GET(req, { params: { slug: 'test-team' } });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });

    it('should return 404 if team not found', async () => {
      mockPrismaWorkspaceFindUnique.mockResolvedValue(null);
      const req = makeAuthorizedRequest('GET', '/api/teams/nonexistent/quota', ownerToken);
      const res = await quotaRoute.GET(req, { params: { slug: 'nonexistent' } });
      expect(res.status).toBe(404);
    });

    it('should return 403 if user is not a member of the team', async () => {
      mockPrismaWorkspaceFindUnique.mockResolvedValue(mockWorkspace);
      mockPrismaWorkspaceMemberFindUnique.mockResolvedValue(null);
      const req = makeAuthorizedRequest('GET', '/api/teams/test-team/quota', ownerToken);
      const res = await quotaRoute.GET(req, { params: { slug: 'test-team' } });
      expect(res.status).toBe(403);
    });

    it('should return 200 with quota data for owner', async () => {
      mockPrismaWorkspaceFindUnique.mockResolvedValue(mockWorkspace);
      mockPrismaWorkspaceMemberFindUnique.mockResolvedValue({ workspaceId: 'ws1', userId: ownerUserId, role: 'owner', allocatedCredits: 0 });
      mockPrismaCreditsLedgerAggregate.mockResolvedValue({ _sum: { delta: -300 } });
      mockPrismaSubscriptionFindFirst.mockResolvedValue(null);
      const req = makeAuthorizedRequest('GET', '/api/teams/test-team/quota', ownerToken);
      const res = await quotaRoute.GET(req, { params: { slug: 'test-team' } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.workspace.slug).toBe('test-team');
      expect(json.data.workspace.quota.totalCredits).toBe(1000);
      expect(json.data.workspace.quota.usedCredits).toBe(300);
    });

    it('should return member usage with persisted allocatedCredits from DB', async () => {
      const workspaceWithAllocations = {
        ...mockWorkspace,
        members: mockWorkspace.members.map(m =>
          m.userId === 'uid-member' ? { ...m, allocatedCredits: 400 } : m
        ),
      };
      mockPrismaWorkspaceFindUnique.mockResolvedValue(workspaceWithAllocations);
      mockPrismaWorkspaceMemberFindUnique.mockResolvedValue({ workspaceId: 'ws1', userId: ownerUserId, role: 'owner', allocatedCredits: 0 });
      mockPrismaCreditsLedgerAggregate.mockResolvedValue({ _sum: { delta: -100 } });
      mockPrismaSubscriptionFindFirst.mockResolvedValue(null);
      const req = makeAuthorizedRequest('GET', '/api/teams/test-team/quota', ownerToken);
      const res = await quotaRoute.GET(req, { params: { slug: 'test-team' } });
      expect(res.status).toBe(200);
      const json = await res.json();
      const memberEntry = json.data.workspace.memberUsage.find(
        (m: { userId: string }) => m.userId === 'uid-member'
      );
      expect(memberEntry.allocatedCredits).toBe(400);
      expect(memberEntry.remainingCredits).toBe(300); // 400 - 100 used
    });

    it('should return 200 but empty memberUsage for non-admin member', async () => {
      mockPrismaWorkspaceFindUnique.mockResolvedValue(mockWorkspace);
      mockPrismaWorkspaceMemberFindUnique.mockResolvedValue({ workspaceId: 'ws1', userId: memberUserId, role: 'member', allocatedCredits: 0 });
      mockPrismaCreditsLedgerAggregate.mockResolvedValue({ _sum: { delta: -50 } });
      mockPrismaSubscriptionFindFirst.mockResolvedValue(null);
      const req = makeAuthorizedRequest('GET', '/api/teams/test-team/quota', memberToken);
      const res = await quotaRoute.GET(req, { params: { slug: 'test-team' } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.workspace.memberUsage).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH /api/teams/:slug/quota
  // ─────────────────────────────────────────────────────────────────────────

  describe('PATCH', () => {
    it('should return 401 if no token provided', async () => {
      const req = makeRequest('PATCH', '/api/teams/test-team/quota', { memberAllocations: {} });
      const res = await quotaRoute.PATCH(req, { params: { slug: 'test-team' } });
      expect(res.status).toBe(401);
    });

    it('should return 404 if team not found', async () => {
      mockPrismaWorkspaceFindUnique.mockResolvedValue(null);
      const req = makeAuthorizedRequest('PATCH', '/api/teams/nonexistent/quota', ownerToken, {
        memberAllocations: { [memberUserId]: 100 },
      });
      const res = await quotaRoute.PATCH(req, { params: { slug: 'nonexistent' } });
      expect(res.status).toBe(404);
    });

    it('should return 403 if user is not a member', async () => {
      mockPrismaWorkspaceFindUnique.mockResolvedValue(mockWorkspace);
      mockPrismaWorkspaceMemberFindUnique.mockResolvedValue(null);
      const req = makeAuthorizedRequest('PATCH', '/api/teams/test-team/quota', ownerToken, {
        memberAllocations: { [memberUserId]: 100 },
      });
      const res = await quotaRoute.PATCH(req, { params: { slug: 'test-team' } });
      expect(res.status).toBe(403);
    });

    it('should return 403 if user is not admin/owner', async () => {
      mockPrismaWorkspaceFindUnique.mockResolvedValue(mockWorkspace);
      mockPrismaWorkspaceMemberFindUnique.mockResolvedValue({ workspaceId: 'ws1', userId: memberUserId, role: 'member', allocatedCredits: 0 });
      const req = makeAuthorizedRequest('PATCH', '/api/teams/test-team/quota', memberToken, {
        memberAllocations: { [memberUserId]: 100 },
      });
      const res = await quotaRoute.PATCH(req, { params: { slug: 'test-team' } });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Only owners and admins');
    });

    it('should return 400 if memberAllocations contains a non-member userId', async () => {
      mockPrismaWorkspaceFindUnique.mockResolvedValue(mockWorkspace);
      mockPrismaWorkspaceMemberFindUnique.mockResolvedValue({ workspaceId: 'ws1', userId: ownerUserId, role: 'owner', allocatedCredits: 0 });
      const req = makeAuthorizedRequest('PATCH', '/api/teams/test-team/quota', ownerToken, {
        memberAllocations: { 'uid-not-a-member': 100 },
      });
      const res = await quotaRoute.PATCH(req, { params: { slug: 'test-team' } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('does not belong to this team');
    });

    it('should return 400 if total allocated exceeds team quota', async () => {
      mockPrismaWorkspaceFindUnique.mockResolvedValue(mockWorkspace);
      mockPrismaWorkspaceMemberFindUnique.mockResolvedValue({ workspaceId: 'ws1', userId: ownerUserId, role: 'owner', allocatedCredits: 0 });
      const req = makeAuthorizedRequest('PATCH', '/api/teams/test-team/quota', ownerToken, {
        memberAllocations: { 'uid-member': 600, 'uid-admin': 600 }, // total 1200 > quota 1000
      });
      const res = await quotaRoute.PATCH(req, { params: { slug: 'test-team' } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('exceeds team quota');
    });

    it('should return 400 if total after update exceeds team quota (existing allocations + incoming)', async () => {
      // Members already have existing allocations totaling 700 (uid-member:400 + uid-admin:300)
      const workspaceWithAllocations = {
        ...mockWorkspace,
        members: mockWorkspace.members.map(m => {
          if (m.userId === 'uid-member') return { ...m, allocatedCredits: 400 };
          if (m.userId === 'uid-admin') return { ...m, allocatedCredits: 300 };
          return m;
        }),
      };
      mockPrismaWorkspaceFindUnique.mockResolvedValue(workspaceWithAllocations);
      mockPrismaWorkspaceMemberFindUnique.mockResolvedValue({ workspaceId: 'ws1', userId: ownerUserId, role: 'owner', allocatedCredits: 0 });
      // Trying to set uid-member:500 and uid-admin:400 and uid-other:200 → total = 1100 > quota 1000
      const req = makeAuthorizedRequest('PATCH', '/api/teams/test-team/quota', ownerToken, {
        memberAllocations: { 'uid-member': 500, 'uid-admin': 400, 'uid-other': 200 }, // total 1100 > quota 1000
      });
      const res = await quotaRoute.PATCH(req, { params: { slug: 'test-team' } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('exceeds team quota');
    });

    it('should return 200 and persist allocation for valid request', async () => {
      mockPrismaWorkspaceFindUnique.mockResolvedValue(mockWorkspace);
      mockPrismaWorkspaceMemberFindUnique.mockResolvedValue({ workspaceId: 'ws1', userId: ownerUserId, role: 'owner', allocatedCredits: 0 });
      mockPrismaWorkspaceMemberUpdate.mockResolvedValue({});
      const req = makeAuthorizedRequest('PATCH', '/api/teams/test-team/quota', ownerToken, {
        memberAllocations: { 'uid-member': 400, 'uid-admin': 200 },
      });
      const res = await quotaRoute.PATCH(req, { params: { slug: 'test-team' } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.memberAllocations['uid-member']).toBe(400);
      expect(json.data.memberAllocations['uid-admin']).toBe(200);
    });

    it('should succeed with empty body (no-op)', async () => {
      mockPrismaWorkspaceFindUnique.mockResolvedValue(mockWorkspace);
      mockPrismaWorkspaceMemberFindUnique.mockResolvedValue({ workspaceId: 'ws1', userId: ownerUserId, role: 'owner', allocatedCredits: 0 });
      const req = makeAuthorizedRequest('PATCH', '/api/teams/test-team/quota', ownerToken, {});
      const res = await quotaRoute.PATCH(req, { params: { slug: 'test-team' } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.message).toBe('No allocation updates submitted');
    });

    it('should succeed with memberAllocations = {} (empty record, no-op)', async () => {
      mockPrismaWorkspaceFindUnique.mockResolvedValue(mockWorkspace);
      mockPrismaWorkspaceMemberFindUnique.mockResolvedValue({ workspaceId: 'ws1', userId: ownerUserId, role: 'owner', allocatedCredits: 0 });
      const req = makeAuthorizedRequest('PATCH', '/api/teams/test-team/quota', ownerToken, {
        memberAllocations: {},
      });
      const res = await quotaRoute.PATCH(req, { params: { slug: 'test-team' } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it('should allow admin to update allocations', async () => {
      mockPrismaWorkspaceFindUnique.mockResolvedValue(mockWorkspace);
      mockPrismaWorkspaceMemberFindUnique.mockResolvedValue({ workspaceId: 'ws1', userId: adminUserId, role: 'admin', allocatedCredits: 0 });
      mockPrismaWorkspaceMemberUpdate.mockResolvedValue({});
      const req = makeAuthorizedRequest('PATCH', '/api/teams/test-team/quota', adminToken, {
        memberAllocations: { 'uid-member': 500 },
      });
      const res = await quotaRoute.PATCH(req, { params: { slug: 'test-team' } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.memberAllocations['uid-member']).toBe(500);
    });
  });
});