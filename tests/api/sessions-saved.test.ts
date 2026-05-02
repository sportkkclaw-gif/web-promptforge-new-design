/**
 * @jest-environment node
 */
// API Tests: sessions & saved routes — Zod validation, auth, and audit-log gaps

import { createSession } from '../../lib/auth';

// Capture mock functions from the module-level jest.mock
const mockGenerationRunFindMany = jest.fn();
const mockGenerationRunCount = jest.fn();
const mockCollectionFindMany = jest.fn();
const mockAuditLogCreate = jest.fn();

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    generationRun: {
      findMany: mockGenerationRunFindMany,
      count: mockGenerationRunCount,
    },
    collection: {
      findMany: mockCollectionFindMany,
    },
    auditLog: {
      create: mockAuditLogCreate,
    },
  },
}));

// Dynamic imports to isolate route modules after mocks are set up
let sessionsRoute: typeof import('../../app/api/sessions/route');
let savedRoute: typeof import('../../app/api/saved/route');

beforeAll(async () => {
  sessionsRoute = await import('../../app/api/sessions/route');
  savedRoute = await import('../../app/api/saved/route');
});

beforeEach(() => {
  jest.clearAllMocks();
  mockAuditLogCreate.mockResolvedValue({ id: 'audit_log_id' });
  mockGenerationRunFindMany.mockReset();
  mockGenerationRunCount.mockReset();
  mockCollectionFindMany.mockReset();
});

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function makeRequest(method: string, url: string, body?: unknown, headers: Record<string, string> = {}) {
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

// ─────────────────────────────────────────────────────────────────────────────
// sessions route GET /api/sessions — Zod validation
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/sessions', () => {
  it('returns 400 for limit out of range (>100)', async () => {
    const req = makeRequest('GET', '/api/sessions?limit=500');
    const res = await sessionsRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(false);
    // Zod error for too-large limit contains descriptive message
    expect(json.error).toMatch(/100|Number|less/i);
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative offset', async () => {
    const req = makeRequest('GET', '/api/sessions?offset=-5');
    const res = await sessionsRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-numeric limit', async () => {
    const req = makeRequest('GET', '/api/sessions?limit=abc');
    const res = await sessionsRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(400);
  });

  it('returns 400 for limit=0', async () => {
    const req = makeRequest('GET', '/api/sessions?limit=0');
    const res = await sessionsRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(400);
  });

  it('accepts valid limit and offset (200)', async () => {
    const { token } = createSession('session-user-1');
    mockGenerationRunFindMany.mockResolvedValue([]);
    mockGenerationRunCount.mockResolvedValue(0);

    const req = makeAuthorizedRequest('GET', '/api/sessions?limit=10&offset=0', token);
    const res = await sessionsRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(Array.isArray(json.data.sessions)).toBe(true);
  });

  it('accepts userId filter param', async () => {
    const { token } = createSession('session-user-2');
    mockGenerationRunFindMany.mockResolvedValue([]);
    mockGenerationRunCount.mockResolvedValue(0);

    const req = makeAuthorizedRequest('GET', '/api/sessions?userId=user_123', token);
    const res = await sessionsRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockGenerationRunFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user_123' } })
    );
  });

  it('calls writeAuditLog when authorized with valid token', async () => {
    const { token } = createSession('audit-sessions-user');
    mockGenerationRunFindMany.mockResolvedValue([]);
    mockGenerationRunCount.mockResolvedValue(0);

    const req = makeAuthorizedRequest('GET', '/api/sessions', token);
    await sessionsRoute.GET(req);

    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'audit-sessions-user',
          action: 'SESSION_VIEW',
        }),
      })
    );
  });

  it('returns 401 when no token is provided', async () => {
    const req = makeRequest('GET', '/api/sessions');
    const res = await sessionsRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(mockAuditLogCreate).not.toHaveBeenCalled();
    expect(mockGenerationRunFindMany).not.toHaveBeenCalled();
  });

  it('returns empty sessions array when no data exists', async () => {
    const { token } = createSession('session-user-3');
    mockGenerationRunFindMany.mockResolvedValue([]);
    mockGenerationRunCount.mockResolvedValue(0);

    const req = makeAuthorizedRequest('GET', '/api/sessions', token);
    const res = await sessionsRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.sessions).toEqual([]);
    expect(json.data.total).toBe(0);
  });

  it('returns 500 when prisma throws', async () => {
    const { token } = createSession('session-user-4');
    // Use mockRejectedValueOnce so it survives a single call and then propagates the error
    mockGenerationRunFindMany.mockRejectedValueOnce(new Error('DB error'));
    mockGenerationRunCount.mockResolvedValue(0);

    const req = makeAuthorizedRequest('GET', '/api/sessions?limit=10', token);
    const res = await sessionsRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// saved route GET /api/saved — Zod validation + audit
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/saved', () => {
  it('accepts valid userId filter', async () => {
    const { token } = createSession('saved-user-1');
    mockCollectionFindMany.mockResolvedValue([]);

    const req = makeAuthorizedRequest('GET', '/api/saved?userId=user_456', token);
    const res = await savedRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockCollectionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: 'user_456' } })
    );
  });

  it('returns 200 with empty saved list when no data', async () => {
    const { token } = createSession('saved-user-2');
    mockCollectionFindMany.mockResolvedValue([]);

    const req = makeAuthorizedRequest('GET', '/api/saved', token);
    const res = await savedRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data.saved)).toBe(true);
    expect(json.data.saved).toEqual([]);
  });

  it('calls writeAuditLog when authorized with valid token', async () => {
    const { token } = createSession('audit-saved-user');
    mockCollectionFindMany.mockResolvedValue([]);

    const req = makeAuthorizedRequest('GET', '/api/saved', token);
    await savedRoute.GET(req);

    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'audit-saved-user',
          action: 'SAVED_VIEW',
        }),
      })
    );
  });

  it('returns 401 when no token is provided', async () => {
    const req = makeRequest('GET', '/api/saved');
    const res = await savedRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(mockAuditLogCreate).not.toHaveBeenCalled();
    expect(mockCollectionFindMany).not.toHaveBeenCalled();
  });

  it('returns 500 when prisma throws', async () => {
    const { token } = createSession('saved-user-3');
    mockCollectionFindMany.mockRejectedValueOnce(new Error('DB error'));

    const req = makeAuthorizedRequest('GET', '/api/saved', token);
    const res = await savedRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(500);
  });
});