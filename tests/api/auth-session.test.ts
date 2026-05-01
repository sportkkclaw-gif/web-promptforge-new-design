// API Tests: GET /api/auth/session — route isolation with mocked dependencies
// tests/api/auth-session.test.ts

/**
 * @jest-environment node
 */

import { createSession, getSession, deleteSession } from '../../lib/auth';

// Dynamically import route module to test handler functions directly
let sessionRoute: typeof import('../../app/api/auth/session/route');

// Mock prisma — module-level so it's shared across all tests in this file
const mockPrismaUserFindUnique = jest.fn();
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockPrismaUserFindUnique(...args),
    },
  },
}));

beforeAll(async () => {
  sessionRoute = await import('../../app/api/auth/session/route');
});

beforeEach(() => {
  jest.clearAllMocks();
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

function makeAuthorizedRequest(method: string, url: string, token: string, body?: unknown) {
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  return makeRequest(method, url, body, headers);
}

describe('GET /api/auth/session', () => {
  // ── 401: missing auth header ───────────────────────────────────────────────

  it('returns 401 when authorization header is missing', async () => {
    const req = makeRequest('GET', '/api/auth/session');
    const res = await sessionRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(json.error).toMatch(/No token provided|Session expired or invalid/i);
  });

  // ── 401: invalid / expired token ──────────────────────────────────────────

  it('returns 401 for a token that does not exist in the session store', async () => {
    const req = makeAuthorizedRequest('GET', '/api/auth/session', 'nonexistent_token_abc123');
    const res = await sessionRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(json.error).toMatch(/Session expired or invalid/i);
  });

  it('returns 401 for a token whose session has already expired', async () => {
    // Create a session that expired 1 second ago
    const { token } = createSession('user_expired', -1000);

    const req = makeAuthorizedRequest('GET', '/api/auth/session', token);
    const res = await sessionRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(json.error).toMatch(/Session expired or invalid/i);
  });

  // ── 404: session valid but user missing from DB ────────────────────────────

  it('returns 404 when session is valid but user no longer exists in DB', async () => {
    // Create a real session for a user ID that no DB record will match
    const { token } = createSession('ghost-user-id-not-in-db');

    // Mock prisma to return null (user not found)
    mockPrismaUserFindUnique.mockResolvedValue(null);

    const req = makeAuthorizedRequest('GET', '/api/auth/session', token);
    const res = await sessionRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(404);
    expect(json.error).toMatch(/User not found/i);
  });

  // ── 200: happy path ────────────────────────────────────────────────────────

  it('returns 200 with user data when session is valid and user exists', async () => {
    const { token } = createSession('valid-user-id');
    const mockUser = {
      id: 'valid-user-id',
      email: 'session_test@example.com',
      username: 'session_test_user',
      role: 'USER',
      credits: 100,
      passwordHash: 'should-not-be-exposed',
    };

    mockPrismaUserFindUnique.mockResolvedValue(mockUser);

    const req = makeAuthorizedRequest('GET', '/api/auth/session', token);
    const res = await sessionRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(json.data).toMatchObject({
      user: {
        id: 'valid-user-id',
        email: 'session_test@example.com',
        username: 'session_test_user',
        role: 'USER',
        credits: 100,
      },
      expiresAt: expect.any(String),
    });
    // Ensure passwordHash is NOT exposed
    expect(json.data.user.passwordHash).toBeUndefined();
    expect(json.data.user.password).toBeUndefined();
  });

  // ── 200: response shape stability ─────────────────────────────────────────

  it('exposes id, email, username, role, and credits fields on the user object', async () => {
    const { token } = createSession('shape-user-id');
    mockPrismaUserFindUnique.mockResolvedValue({
      id: 'shape-user-id',
      email: 'shape@example.com',
      username: 'shapeuser',
      role: 'ADMIN',
      credits: 999,
      passwordHash: 'secret',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = makeAuthorizedRequest('GET', '/api/auth/session', token);
    const res = await sessionRoute.GET(req);
    const json = await res.json();

    expect(json.data.user).toHaveProperty('id');
    expect(json.data.user).toHaveProperty('email');
    expect(json.data.user).toHaveProperty('username');
    expect(json.data.user).toHaveProperty('role');
    expect(json.data.user).toHaveProperty('credits');
    expect(json.data).toHaveProperty('expiresAt');
  });

  // ── 500: prisma throws ─────────────────────────────────────────────────────

  it('returns 500 when prisma.user.findUnique throws an error', async () => {
    const { token } = createSession('db-error-user-id');
    mockPrismaUserFindUnique.mockRejectedValue(new Error('Database connection failed'));

    const req = makeAuthorizedRequest('GET', '/api/auth/session', token);
    const res = await sessionRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(500);
    expect(json.error).toMatch(/Internal server error/i);
  });

  it('returns 500 with generic message even when prisma throws a non-Error object', async () => {
    const { token } = createSession('weird-db-error-user');
    mockPrismaUserFindUnique.mockRejectedValue('not an error object');

    const req = makeAuthorizedRequest('GET', '/api/auth/session', token);
    const res = await sessionRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(500);
    expect(json.error).toMatch(/Internal server error/i);
  });
});
