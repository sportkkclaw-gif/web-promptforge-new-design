// API Tests: Auth endpoints (route module unit tests)
// tests/api/auth.test.ts

/**
 * @jest-environment node
 */

import { hashPassword, hashPasswordSync, createSession, deleteSession, getSession, verifyPassword } from '../../lib/auth';

// Dynamically import route modules to test handler functions directly
let registerRoute: typeof import('../../app/api/auth/register/route');
let loginRoute: typeof import('../../app/api/auth/login/route');
let sessionRoute: typeof import('../../app/api/auth/session/route');
let logoutRoute: typeof import('../../app/api/auth/logout/route');
let refreshRoute: typeof import('../../app/api/auth/refresh/route');

beforeAll(async () => {
  registerRoute = await import('../../app/api/auth/register/route');
  loginRoute = await import('../../app/api/auth/login/route');
  sessionRoute = await import('../../app/api/auth/session/route');
  logoutRoute = await import('../../app/api/auth/logout/route');
  refreshRoute = await import('../../app/api/auth/refresh/route');
});

// Helper to make mock NextRequest
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function makeRequest(
  method: string,
  url: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  // Use Request constructor for native fetch compatibility
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

describe('API: Auth', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const uniqueEmail = `testuser_${Date.now()}@example.com`;
      const uniqueUsername = `testuser_${Date.now()}`;
      const req = makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'password123',
      });
      const res = await registerRoute.POST(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.user.email).toBe(uniqueEmail);
      expect(json.data.token).toBeDefined();
      expect(json.data.expiresAt).toBeDefined();
      expect(res.status).toBe(201);
    });

    it('should reject duplicate email', async () => {
      const uniqueEmail = `dup_${Date.now()}@example.com`;
      const uniqueUsername1 = `user1_${Date.now()}`;
      const uniqueUsername2 = `user2_${Date.now()}`;
      // Register first
      const req1 = makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername1,
        password: 'password123',
      });
      await registerRoute.POST(req1);
      // Try duplicate email
      const req2 = makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername2,
        password: 'password123',
      });
      const res = await registerRoute.POST(req2);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain('Email already registered');
      expect(res.status).toBe(409);
    });

    it('should reject short password (< 8 chars)', async () => {
      const req = makeRequest('POST', '/api/auth/register', {
        email: `shortpw_${Date.now()}@example.com`,
        username: `spw_${Date.now()}`,
        password: '1234567',
      });
      const res = await registerRoute.POST(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(422);
    });

    it('should reject invalid email format', async () => {
      const req = makeRequest('POST', '/api/auth/register', {
        email: 'not-an-email',
        username: 'validuser123',
        password: 'password123',
      });
      const res = await registerRoute.POST(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(422);
    });

    it('should reject malformed body', async () => {
      const req = makeRequest('POST', '/api/auth/register', null);
      const res = await registerRoute.POST(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      // null body parses as JSON null, fails Zod validation
      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const uniqueEmail = `login_${Date.now()}@example.com`;
      const uniqueUsername = `loginuser_${Date.now()}`;
      const password = 'loginpass123';
      // Register first
      const regReq = makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password,
      });
      await registerRoute.POST(regReq);
      // Login
      const req = makeRequest('POST', '/api/auth/login', { email: uniqueEmail, password });
      const res = await loginRoute.POST(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.token).toBeDefined();
      expect(json.data.user.email).toBe(uniqueEmail);
    });

    it('should reject wrong password', async () => {
      const uniqueEmail = `wrong_${Date.now()}@example.com`;
      const uniqueUsername = `wrong_${Date.now()}`;
      await registerRoute.POST(
        makeRequest('POST', '/api/auth/register', {
          email: uniqueEmail,
          username: uniqueUsername,
          password: 'correctpass',
        })
      );
      const req = makeRequest('POST', '/api/auth/login', {
        email: uniqueEmail,
        password: 'wrongpass',
      });
      const res = await loginRoute.POST(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain('Invalid credentials');
      expect(res.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const req = makeRequest('POST', '/api/auth/login', {
        email: 'nobody@example.com',
        password: 'anypass',
      });
      const res = await loginRoute.POST(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/session', () => {
    it('should return session for valid token', async () => {
      const uniqueEmail = `session_${Date.now()}@example.com`;
      const uniqueUsername = `session_${Date.now()}`;
      // Register to get token
      const regRes = await registerRoute.POST(
        makeRequest('POST', '/api/auth/register', {
          email: uniqueEmail,
          username: uniqueUsername,
          password: 'sessionpass123',
        })
      );
      const { data } = await regRes.json();
      const token = data.token;

      // Get session
      const req = makeAuthorizedRequest('GET', '/api/auth/session', token);
      const res = await sessionRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.user.email).toBe(uniqueEmail);
      expect(json.data.expiresAt).toBeDefined();
    });

    it('should reject missing token', async () => {
      const req = makeRequest('GET', '/api/auth/session');
      const res = await sessionRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const req = makeAuthorizedRequest('GET', '/api/auth/session', 'invalid_token_12345');
      const res = await sessionRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should invalidate token', async () => {
      const uniqueEmail = `logout_${Date.now()}@example.com`;
      const uniqueUsername = `logout_${Date.now()}`;
      const regRes = await registerRoute.POST(
        makeRequest('POST', '/api/auth/register', {
          email: uniqueEmail,
          username: uniqueUsername,
          password: 'logoutpass123',
        })
      );
      const { data } = await regRes.json();
      const token = data.token;

      // Logout
      const logoutReq = makeAuthorizedRequest('POST', '/api/auth/logout', token);
      const logoutRes = await logoutRoute.POST(logoutReq);
      const json = await logoutRes.json();
      expect(json.ok).toBe(true);
      expect(json.data.message).toBe('Logged out');

      // Token should no longer work
      const sessionReq = makeAuthorizedRequest('GET', '/api/auth/session', token);
      const sessionRes = await sessionRoute.GET(sessionReq);
      const sessionJson = await sessionRes.json();
      expect(sessionJson.ok).toBe(false);
      expect(sessionRes.status).toBe(401);
    });

    it('should succeed even without token', async () => {
      const req = makeRequest('POST', '/api/auth/logout');
      const res = await logoutRoute.POST(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should rotate token', async () => {
      const uniqueEmail = `refresh_${Date.now()}@example.com`;
      const uniqueUsername = `refresh_${Date.now()}`;
      const regRes = await registerRoute.POST(
        makeRequest('POST', '/api/auth/register', {
          email: uniqueEmail,
          username: uniqueUsername,
          password: 'refreshpass123',
        })
      );
      const { data } = await regRes.json();
      const oldToken = data.token;

      // Refresh
      const refreshReq = makeAuthorizedRequest('POST', '/api/auth/refresh', oldToken);
      const refreshRes = await refreshRoute.POST(refreshReq);
      const json = await refreshRes.json();
      expect(json.ok).toBe(true);
      expect(json.data.token).not.toBe(oldToken);
      expect(json.data.expiresAt).toBeDefined();

      // Old token should be invalid
      const oldSessionReq = makeAuthorizedRequest('GET', '/api/auth/session', oldToken);
      const oldSessionRes = await sessionRoute.GET(oldSessionReq);
      expect(oldSessionRes.status).toBe(401);

      // New token should work
      const newSessionReq = makeAuthorizedRequest('GET', '/api/auth/session', json.data.token);
      const newSessionRes = await sessionRoute.GET(newSessionReq);
      const newJson = await newSessionRes.json();
      expect(newJson.ok).toBe(true);
    });

    it('should reject invalid token on refresh', async () => {
      const req = makeAuthorizedRequest('POST', '/api/auth/refresh', 'invalid_token');
      const res = await refreshRoute.POST(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(401);
    });
  });
});

describe('Auth lib helpers (unit)', () => {
describe('hashPassword / verifyPassword', () => {
    it('hashes password and returns a bcrypt string', async () => {
      const hash = await hashPassword('mysecretpassword');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.startsWith('$2')).toBe(true);
    });

    it('produces different hash for same password (salted)', async () => {
      const h1 = await hashPassword('test1234');
      const h2 = await hashPassword('test1234');
      expect(h1).not.toBe(h2);
      // but both should verify correctly
      expect(verifyPassword('test1234', h1)).toBe(true);
      expect(verifyPassword('test1234', h2)).toBe(true);
    });

    it('verifyPassword returns true for correct password', () => {
      const hash = hashPasswordSync('correctpassword');
      expect(verifyPassword('correctpassword', hash)).toBe(true);
    });

    it('verifyPassword returns false for wrong password', () => {
      const hash = hashPasswordSync('correctpassword');
      expect(verifyPassword('wrongpassword', hash)).toBe(false);
    });
  });

  describe('createSession / getSession', () => {
    it('creates session with JWT token and future expiry', () => {
      const { token, expiresAt } = createSession('user-abc-123');
      expect(token).toBeDefined();
      // JWT format: 3 dot-separated base64url segments
      expect(token.split('.').length).toBe(3);
      expect(expiresAt instanceof Date).toBe(true);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('getSession returns session data for valid token', () => {
      const { token } = createSession('user-xyz');
      const session = getSession(token);
      expect(session).not.toBeNull();
      expect(session?.userId).toBe('user-xyz');
    });

    it('getSession returns null for unknown token', () => {
      const session = getSession('this-token-is-not-known');
      expect(session).toBeNull();
    });

    it('deleteSession removes session', () => {
      const { token } = createSession('user-to-delete');
      expect(getSession(token)?.userId).toBe('user-to-delete');
      deleteSession(token);
      expect(getSession(token)).toBeNull();
    });
  });
});