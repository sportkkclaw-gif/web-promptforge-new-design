// API Tests: Credits endpoints (balance, transactions, quota)
// Direct handler unit tests (no server required), matching auth.test.ts pattern

/** @jest-environment node */

let balanceRoute: typeof import('../../app/api/credits/balance/route');
let transactionsRoute: typeof import('../../app/api/credits/transactions/route');
let quotaRoute: typeof import('../../app/api/credits/quota/route');
let registerRoute: typeof import('../../app/api/auth/register/route');

beforeAll(async () => {
  [balanceRoute, transactionsRoute, quotaRoute, registerRoute] = await Promise.all([
    import('../../app/api/credits/balance/route'),
    import('../../app/api/credits/transactions/route'),
    import('../../app/api/credits/quota/route'),
    import('../../app/api/auth/register/route'),
  ]);
});

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
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const absoluteUrl = url.startsWith('/') ? BASE_URL + url : url;
  return new Request(absoluteUrl, init) as unknown as import('next/server').NextRequest;
}

function makeAuthorizedRequest(method: string, url: string, token: string, body?: unknown) {
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  return makeRequest(method, url, body, headers);
}

async function registerUser(email: string, username: string) {
  const req = makeRequest('POST', '/api/auth/register', {
    email,
    username,
    password: 'password123',
  });
  const res = await registerRoute.POST(req);
  const json = await res.json();
  return json.data.token as string;
}

describe('API: Credits', () => {
  describe('GET /api/credits/balance', () => {
    it('should return balance for authenticated user', async () => {
      const token = await registerUser(`balance_${Date.now()}@example.com`, `bal_${Date.now()}`);
      const req = makeAuthorizedRequest('GET', '/api/credits/balance', token);
      const res = await balanceRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(typeof json.data.credits).toBe('number');
      expect(json.data.userId).toBeDefined();
      expect(res.status).toBe(200);
    });

    it('should reject request without token', async () => {
      const req = makeRequest('GET', '/api/credits/balance');
      const res = await balanceRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const req = makeAuthorizedRequest('GET', '/api/credits/balance', 'invalid_token_xyz');
      const res = await balanceRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/credits/transactions', () => {
    it('should return paginated transactions for authenticated user', async () => {
      const token = await registerUser(`trans_${Date.now()}@example.com`, `trans_${Date.now()}`);
      const req = makeAuthorizedRequest('GET', '/api/credits/transactions', token);
      const res = await transactionsRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(Array.isArray(json.data.transactions)).toBe(true);
      expect(typeof json.data.pagination.total).toBe('number');
      expect(res.status).toBe(200);
    });

    it('should support page and limit query params', async () => {
      const token = await registerUser(`trans2_${Date.now()}@example.com`, `trans2_${Date.now()}`);
      const req = makeAuthorizedRequest('GET', '/api/credits/transactions?page=1&limit=10', token);
      const res = await transactionsRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.pagination.page).toBe(1);
      expect(json.data.pagination.limit).toBe(10);
    });

    it('should fallback invalid page/limit to safe defaults', async () => {
      const token = await registerUser(`trans3_${Date.now()}@example.com`, `trans3_${Date.now()}`);
      const req = makeAuthorizedRequest('GET', '/api/credits/transactions?page=-1&limit=0', token);
      const res = await transactionsRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.pagination.page).toBe(1);
      expect(json.data.pagination.limit).toBe(50);
    });

    it('should cap excessive limit to 200', async () => {
      const token = await registerUser(`trans4_${Date.now()}@example.com`, `trans4_${Date.now()}`);
      const req = makeAuthorizedRequest('GET', '/api/credits/transactions?page=1&limit=9999', token);
      const res = await transactionsRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.pagination.limit).toBe(200);
    });

    it('should reject request without token', async () => {
      const req = makeRequest('GET', '/api/credits/transactions');
      const res = await transactionsRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/credits/quota', () => {
    it('should return quota info for authenticated user', async () => {
      const token = await registerUser(`quota_${Date.now()}@example.com`, `qua_${Date.now()}`);
      const req = makeAuthorizedRequest('GET', '/api/credits/quota', token);
      const res = await quotaRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(typeof json.data.creditQuota).toBe('number');
      expect(json.data.plan).toBeDefined();
      expect(typeof json.data.used).toBe('number');
      expect(typeof json.data.remaining).toBe('number');
      expect(typeof json.data.walletBalance).toBe('number');
      expect(res.status).toBe(200);
    });

    it('should include period start and end', async () => {
      const token = await registerUser(`quota2_${Date.now()}@example.com`, `qua2_${Date.now()}`);
      const req = makeAuthorizedRequest('GET', '/api/credits/quota', token);
      const res = await quotaRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.periodStart).toBeDefined();
      expect(json.data.periodEnd).toBeDefined();
    });

    it('should reject request without token', async () => {
      const req = makeRequest('GET', '/api/credits/quota');
      const res = await quotaRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(401);
    });
  });
});