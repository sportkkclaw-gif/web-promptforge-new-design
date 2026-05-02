// tests/unit/auth-admin.test.ts — Unit tests for RBAC middleware (requireRole, named guards)
// Ensures route handlers are protected correctly for each role scenario.

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock dependencies before importing auth-admin
// ---------------------------------------------------------------------------
const mockUserFindUnique = jest.fn();

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: mockUserFindUnique },
  },
  prisma: { user: { findUnique: mockUserFindUnique } },
}));

// Session store for mock getSession
const mockSessions = new Map<string, { userId: string; expiresAt: Date }>();

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn((token: string) => {
    const s = mockSessions.get(token);
    if (!s || s.expiresAt < new Date()) return null;
    return s;
  }),
  createSession: jest.fn((userId: string) => {
    const token = `tok_${userId}_${Date.now()}`;
    mockSessions.set(token, { userId, expiresAt: new Date(Date.now() + 86400000) });
    return { token, expiresAt: new Date(Date.now() + 86400000) };
  }),
  deleteSession: jest.fn((token: string) => mockSessions.delete(token)),
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
function makeRequest(authHeader?: string) {
  return {
    headers: { get: (n: string) => (n === 'authorization' ? authHeader ?? null : null) },
  } as unknown as import('next/server').NextRequest;
}

function authReq(token: string) {
  return makeRequest(`Bearer ${token}`);
}

// Pre-seeded tokens (sessions set up in beforeEach)
const TOKENS = {
  visitor: 't_visitor',
  member: 't_member',
  creator: 't_creator',
  team_admin: 't_team_admin',
  admin: 't_admin',
  superadmin: 't_superadmin',
} as const;

function setupSession(token: string, userId: string, role: string) {
  mockSessions.set(token, { userId, expiresAt: new Date(Date.now() + 86400000) });
  // Use mockResolvedValue (persistent) instead of mockResolvedValueOnce so extra
  // findUnique calls that may occur after the first user lookup still return null
  // rather than consuming a pending mock that would return the user record.
  mockUserFindUnique
    .mockResolvedValueOnce({ id: userId, role })
    .mockResolvedValue(null);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('RBAC middleware: requireRole() and named guards', () => {
  beforeEach(() => {
    mockSessions.clear();
    mockUserFindUnique.mockReset();
  });

  // ── 401 unauthenticated cases ────────────────────────────────────────────
  describe('unauthenticated → 401', () => {
    it('no auth header → 401', async () => {
      const { requireRole } = await import('@/lib/auth-admin');
      const result = await requireRole(makeRequest(undefined), ['admin']);
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(401);
    });

    it('Bearer missing → 401', async () => {
      const { requireRole } = await import('@/lib/auth-admin');
      const result = await requireRole(makeRequest('Basic abc'), ['admin']);
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(401);
    });

    it('invalid session token → 401', async () => {
      const { requireRole } = await import('@/lib/auth-admin');
      const result = await requireRole(authReq('not-a-real-token'), ['admin']);
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(401);
    });
  });

  // ── 403 insufficient role cases ─────────────────────────────────────────
  describe('insufficient role → 403', () => {
    it('member → admin route → 403', async () => {
      setupSession(TOKENS.member, 'uid_member', 'member');
      const { requireRole } = await import('@/lib/auth-admin');
      const result = await requireRole(authReq(TOKENS.member), ['admin']);
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(403);
    });

    it('creator → superadmin route → 403', async () => {
      setupSession(TOKENS.creator, 'uid_creator', 'creator');
      const { requireRole } = await import('@/lib/auth-admin');
      const result = await requireRole(authReq(TOKENS.creator), ['superadmin']);
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(403);
    });

    it('admin → superadmin route → 403', async () => {
      setupSession(TOKENS.admin, 'uid_admin', 'admin');
      const { requireRole } = await import('@/lib/auth-admin');
      const result = await requireRole(authReq(TOKENS.admin), ['superadmin']);
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(403);
    });

    it('member → team_admin+ route → 403', async () => {
      setupSession(TOKENS.member, 'uid_member', 'member');
      const { requireRole } = await import('@/lib/auth-admin');
      const result = await requireRole(authReq(TOKENS.member), ['team_admin', 'admin']);
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(403);
    });

    it('unknown role → admin route → 403', async () => {
      setupSession(TOKENS.member, 'uid_unknown', 'imposter');
      const { requireRole } = await import('@/lib/auth-admin');
      const result = await requireRole(authReq(TOKENS.member), ['admin']);
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(403);
    });
  });

  // ── authorized: correct role returns AuthResult ─────────────────────────
  describe('authorized → AuthResult', () => {
    it('admin → admin route ✓', async () => {
      setupSession(TOKENS.admin, 'uid_admin', 'admin');
      const { requireRole } = await import('@/lib/auth-admin');
      const result = await requireRole(authReq(TOKENS.admin), ['admin']);
      expect(result).not.toBeInstanceOf(Response);
      expect((result as { userId: string; role: string }).role).toBe('admin');
      expect((result as { userId: string; role: string }).userId).toBe('uid_admin');
    });

    it('superadmin → [admin,superadmin] route ✓', async () => {
      setupSession(TOKENS.superadmin, 'uid_superadmin', 'superadmin');
      const { requireRole } = await import('@/lib/auth-admin');
      const result = await requireRole(authReq(TOKENS.superadmin), ['admin', 'superadmin']);
      expect(result).not.toBeInstanceOf(Response);
      expect((result as { role: string }).role).toBe('superadmin');
    });

    it('team_admin → team_admin route ✓', async () => {
      setupSession(TOKENS.team_admin, 'uid_team_admin', 'team_admin');
      const { requireRole } = await import('@/lib/auth-admin');
      const result = await requireRole(authReq(TOKENS.team_admin), ['team_admin', 'admin']);
      expect(result).not.toBeInstanceOf(Response);
      expect((result as { role: string }).role).toBe('team_admin');
    });

    it('creator → creator route ✓', async () => {
      setupSession(TOKENS.creator, 'uid_creator', 'creator');
      const { requireRole } = await import('@/lib/auth-admin');
      const result = await requireRole(authReq(TOKENS.creator), ['creator', 'team_admin', 'admin']);
      expect(result).not.toBeInstanceOf(Response);
      expect((result as { role: string }).role).toBe('creator');
    });

    it('member → member route ✓', async () => {
      setupSession(TOKENS.member, 'uid_member', 'member');
      const { requireRole } = await import('@/lib/auth-admin');
      const result = await requireRole(authReq(TOKENS.member), ['member', 'creator', 'team_admin', 'admin', 'superadmin']);
      expect(result).not.toBeInstanceOf(Response);
      expect((result as { role: string }).role).toBe('member');
    });
  });

  // ── named guards ──────────────────────────────────────────────────────────
  describe('named guards', () => {
    it('requireSuperadmin: superadmin✓ admin✗ member✗', async () => {
      const { requireSuperadmin } = await import('@/lib/auth-admin');

      setupSession(TOKENS.superadmin, 'uid_superadmin', 'superadmin');
      let r = await requireSuperadmin(authReq(TOKENS.superadmin));
      expect(r).not.toBeInstanceOf(Response);

      setupSession(TOKENS.admin, 'uid_admin', 'admin');
      r = await requireSuperadmin(authReq(TOKENS.admin));
      expect(r).toBeInstanceOf(Response);
      expect((r as Response).status).toBe(403);

      setupSession(TOKENS.member, 'uid_member', 'member');
      r = await requireSuperadmin(authReq(TOKENS.member));
      expect(r).toBeInstanceOf(Response);
      expect((r as Response).status).toBe(403);
    });

    it('requireAdmin: admin✓ superadmin✗ member✗', async () => {
      const { requireAdmin } = await import('@/lib/auth-admin');

      setupSession(TOKENS.admin, 'uid_admin', 'admin');
      let r = await requireAdmin(authReq(TOKENS.admin));
      expect(r).not.toBeInstanceOf(Response);

      setupSession(TOKENS.superadmin, 'uid_superadmin', 'superadmin');
      r = await requireAdmin(authReq(TOKENS.superadmin));
      expect(r).toBeInstanceOf(Response);
      expect((r as Response).status).toBe((403));

      setupSession(TOKENS.member, 'uid_member', 'member');
      r = await requireAdmin(authReq(TOKENS.member));
      expect(r).toBeInstanceOf(Response);
      expect((r as Response).status).toBe(403);
    });

    it('requireTeamAdmin: team_admin✓ admin✓ creator✗ member✗', async () => {
      const { requireTeamAdmin } = await import('@/lib/auth-admin');

      for (const [tok, uid, role] of [
        [TOKENS.team_admin, 'uid_team_admin', 'team_admin'],
        [TOKENS.admin, 'uid_admin', 'admin'],
      ] as const) {
        setupSession(tok, uid, role);
        const r = await requireTeamAdmin(authReq(tok));
        expect(r).not.toBeInstanceOf(Response);
      }

      setupSession(TOKENS.creator, 'uid_creator', 'creator');
      let r = await requireTeamAdmin(authReq(TOKENS.creator));
      expect(r).toBeInstanceOf(Response);
      expect((r as Response).status).toBe(403);

      setupSession(TOKENS.member, 'uid_member', 'member');
      r = await requireTeamAdmin(authReq(TOKENS.member));
      expect(r).toBeInstanceOf(Response);
      expect((r as Response).status).toBe(403);
    });

    it('requireCreator: creator✓ team_admin✓ admin✓ member✗', async () => {
      const { requireCreator } = await import('@/lib/auth-admin');

      for (const [tok, uid, role] of [
        [TOKENS.creator, 'uid_creator', 'creator'],
        [TOKENS.team_admin, 'uid_team_admin', 'team_admin'],
        [TOKENS.admin, 'uid_admin', 'admin'],
      ] as const) {
        setupSession(tok, uid, role);
        const r = await requireCreator(authReq(tok));
        expect(r).not.toBeInstanceOf(Response);
      }

      setupSession(TOKENS.member, 'uid_member', 'member');
      const r = await requireCreator(authReq(TOKENS.member));
      expect(r).toBeInstanceOf(Response);
      expect((r as Response).status).toBe(403);
    });

    it('requireMember: any authenticated user (member through superadmin)', async () => {
      const { requireMember } = await import('@/lib/auth-admin');

      for (const [tok, uid, role] of [
        [TOKENS.member, 'uid_member', 'member'],
        [TOKENS.creator, 'uid_creator', 'creator'],
        [TOKENS.team_admin, 'uid_team_admin', 'team_admin'],
        [TOKENS.admin, 'uid_admin', 'admin'],
        [TOKENS.superadmin, 'uid_superadmin', 'superadmin'],
      ] as const) {
        setupSession(tok, uid, role);
        const r = await requireMember(authReq(tok));
        expect(r).not.toBeInstanceOf(Response);
        expect((r as { role: string }).role).toBe(role);
      }
    });
  });

  // ── UserRole constants ───────────────────────────────────────────────────
  describe('UserRole constants and Role alias', () => {
    it('exports all 6 role values', async () => {
      const { UserRole } = await import('@/lib/auth-admin');
      expect(UserRole.VISITOR).toBe('visitor');
      expect(UserRole.MEMBER).toBe('member');
      expect(UserRole.CREATOR).toBe('creator');
      expect(UserRole.TEAM_ADMIN).toBe('team_admin');
      expect(UserRole.ADMIN).toBe('admin');
      expect(UserRole.SUPERADMIN).toBe('superadmin');
    });

    it('Role alias === UserRole', async () => {
      const { Role, UserRole } = await import('@/lib/auth-admin');
      expect(Role).toBe(UserRole);
    });
  });
});