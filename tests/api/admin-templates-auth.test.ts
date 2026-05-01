// API Tests: Admin Templates & Moderation Authz
// tests/api/admin-templates-auth.test.ts

/**
 * @jest-environment node
 */

import { hashPassword, hashPasswordSync, createSession, deleteSession } from '../../lib/auth';

let templatesTestRoute: typeof import('../../app/api/admin/templates/[id]/test/route');
let moderationDecisionRoute: typeof import('../../app/api/admin/moderation/[id]/decision/route');

beforeAll(async () => {
  templatesTestRoute = await import('../../app/api/admin/templates/[id]/test/route');
  moderationDecisionRoute = await import('../../app/api/admin/moderation/[id]/decision/route');
});

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
  return new Request(absoluteUrl, init) as unknown as import('next/server').NextRequest;
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

describe('API: Admin Templates Test Authz', () => {
  describe('POST /api/admin/templates/[id]/test', () => {
    it('returns 401 when no auth header is provided', async () => {
      const req = makeRequest('POST', '/api/admin/templates/some-id/test', { parameters: {} });
      const res = await templatesTestRoute.POST(req, { params: { id: 'some-id' } } as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain('Authentication required');
    });

    it('returns 401 when session token is invalid', async () => {
      const req = makeAuthorizedRequest('POST', '/api/admin/templates/some-id/test', 'invalid_token_12345', { parameters: {} });
      const res = await templatesTestRoute.POST(req, { params: { id: 'some-id' } } as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });

    it('returns 403 when authenticated but user is not admin', async () => {
      // Register a non-admin user
      const uniqueEmail = `nonadmin_${Date.now()}@example.com`;
      const uniqueUsername = `nonadmin_${Date.now()}`;
      const registerReq = makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'password123',
      });
      const { createSession: _cs, ...authLib } = await import('../../lib/auth');
      // Login via register to get session
      const regRes = await import('../../app/api/auth/register/route').then(m => m.POST(registerReq));
      const regJson = await regRes.json();
      const token = regJson.data?.token;
      expect(token).toBeDefined();

      // non-admin user should get 403 on admin endpoint
      const req = makeAuthorizedRequest('POST', '/api/admin/templates/some-id/test', token, { parameters: {} });
      const res = await templatesTestRoute.POST(req, { params: { id: 'some-id' } } as any);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain('Access denied: requires one of [admin]');
    });

    it('returns 200 when authenticated as admin', async () => {
      // Create an admin user directly via prisma and a session
      const { prisma } = await import('@/lib/prisma');
      const uniqueEmail = `admin_${Date.now()}@example.com`;
      const uniqueUsername = `admin_${Date.now()}`;
      const passwordHash = hashPasswordSync('adminpass123');
      const user = await prisma.user.create({
        data: { email: uniqueEmail, username: uniqueUsername, passwordHash, role: 'admin' },
      });
      const { token } = createSession(user.id);

      const req = makeAuthorizedRequest('POST', '/api/admin/templates/some-id/test', token, { parameters: { width: 512 } });
      const res = await templatesTestRoute.POST(req, { params: { id: 'some-id' } } as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.status).toBe('passed');
      expect(json.data.testId).toBeDefined();

      // Cleanup
      deleteSession(token);
      await prisma.user.delete({ where: { id: user.id } });
    });
  });
});

describe('API: Admin Moderation Decision Authz', () => {
  describe('POST /api/admin/moderation/[id]/decision', () => {
    it('returns 401 when no auth header is provided', async () => {
      const req = makeRequest('POST', '/api/admin/moderation/some-id/decision', { decision: 'approved' });
      const res = await moderationDecisionRoute.POST(req, { params: { id: 'some-id' } } as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain('Authentication required');
    });

    it('returns 401 when session token is invalid', async () => {
      const req = makeAuthorizedRequest('POST', '/api/admin/moderation/some-id/decision', 'invalid_token_12345', { decision: 'approved' });
      const res = await moderationDecisionRoute.POST(req, { params: { id: 'some-id' } } as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });

    it('returns 403 when authenticated but user is not admin', async () => {
      const uniqueEmail = `moderator_${Date.now()}@example.com`;
      const uniqueUsername = `moderator_${Date.now()}`;
      const registerReq = makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'password123',
      });
      const regRes = await import('../../app/api/auth/register/route').then(m => m.POST(registerReq));
      const regJson = await regRes.json();
      const token = regJson.data?.token;
      expect(token).toBeDefined();

      const req = makeAuthorizedRequest('POST', '/api/admin/moderation/some-id/decision', token, { decision: 'approved' });
      const res = await moderationDecisionRoute.POST(req, { params: { id: 'some-id' } } as any);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain('Access denied: requires one of [admin]');
    });

    it('returns 404 (not auth error) for non-existent moderation event when admin', async () => {
      const { prisma } = await import('@/lib/prisma');
      const uniqueEmail = `modadmin_${Date.now()}@example.com`;
      const uniqueUsername = `modadmin_${Date.now()}`;
      const passwordHash = hashPasswordSync('modpass123');
      const user = await prisma.user.create({
        data: { email: uniqueEmail, username: uniqueUsername, passwordHash, role: 'admin' },
      });
      const { token } = createSession(user.id);

      // Use a valid CUID-format id that won't exist in DB
      const nonexistentId = `c${'a'.repeat(24)}`; // "caaaa...aaa" (25 chars, valid CUID)
      const req = makeAuthorizedRequest('POST', `/api/admin/moderation/${nonexistentId}/decision`, token, { decision: 'approved' });
      const res = await moderationDecisionRoute.POST(req, { params: { id: nonexistentId } } as any);
      // Should get 404 (event not found), NOT 401/403 — proving auth passed
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain('Moderation event not found');

      // Cleanup
      deleteSession(token);
      await prisma.user.delete({ where: { id: user.id } });
    });
  });
});
